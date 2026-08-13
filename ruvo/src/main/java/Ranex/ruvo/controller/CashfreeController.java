package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.Payment;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.PaymentRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.service.CashfreeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments/cashfree")
public class CashfreeController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final Ranex.ruvo.repository.ShopRepository shopRepository;
    private final CashfreeService cashfreeService;

    public CashfreeController(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            ProductRepository productRepository,
            Ranex.ruvo.repository.ShopRepository shopRepository,
            CashfreeService cashfreeService) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
        this.cashfreeService = cashfreeService;
    }

    // Reuse request structure
    public static class CashfreeCheckoutRequest {
        public String userId;
        public Long shopId;
        public Long productId;
        public String productName;
        public Integer quantity;
        public String deliveryAddress;
        public String customerPhone;
        public String customerEmail;
        public Double userLatitude;
        public Double userLongitude;
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@RequestBody CashfreeCheckoutRequest request) {
        Product product = productRepository.findById(request.productId).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Product not found."));
        }

        if (product.getStockQuantity() < request.quantity) {
            return ResponseEntity.badRequest().body(Map.of("message", "Insufficient stock available. Only " + product.getStockQuantity() + " left."));
        }

        // Fetch Shop to get its location
        Ranex.ruvo.model.Shop shop = null;
        if (product.getShopId() != null) {
            shop = shopRepository.findById(product.getShopId()).orElse(null);
        }
        
        double deliveryFee = 0.0;
        double platformFee = 0.0;

        if (shop != null && shop.getLatitude() != null && shop.getLongitude() != null
                && request.userLatitude != null && request.userLongitude != null) {
            double distanceKm = Ranex.ruvo.util.DistanceUtils.calculateDistance(
                    request.userLatitude, request.userLongitude,
                    shop.getLatitude(), shop.getLongitude()
            );
            deliveryFee = Ranex.ruvo.util.DistanceUtils.calculateDeliveryFee(distanceKm);
            platformFee = Ranex.ruvo.util.DistanceUtils.calculatePlatformFee(distanceKm);
        } else {
            // Default fees if location missing
            deliveryFee = 30.0;
            platformFee = 5.0;
        }

        double productAmount = product.getSellingPrice() * request.quantity;
        double taxes = Math.round(productAmount * 0.05);
        
        Double totalAmount = productAmount + deliveryFee + platformFee + taxes;

        // 1. Create Order in PAYMENT_PENDING status
        Order order = new Order();
        order.setUserId(request.userId);
        order.setShopId(request.shopId);
        order.setProductId(request.productId);
        order.setProductName(request.productName);
        order.setQuantity(request.quantity);
        order.setTotalAmount(totalAmount);
        order.setPaymentMethod("CASHFREE");
        order.setPaymentStatus("PENDING");
        order.setOrderStatus("PAYMENT_PENDING");
        order.setDeliveryAddress(request.deliveryAddress);
        Order savedOrder = orderRepository.save(order);

        try {
            // Callback return URL back to server
            String returnUrl = "http://172.16.3.101:8080/api/payments/cashfree/return?order_id=" + savedOrder.getId();

            String shopVendorId = shop != null ? shop.getCashfreeVendorId() : null;

            // 2. Call CashfreeService to initialize order
            Map<String, Object> cfResponse = cashfreeService.createOrder(
                    String.valueOf(savedOrder.getId()),
                    totalAmount,
                    productAmount,
                    shopVendorId,
                    request.userId,
                    request.customerPhone,
                    request.customerEmail,
                    returnUrl
            );

            String cfOrderId = (String) cfResponse.get("cf_order_id");
            String paymentUrl = (String) cfResponse.get("payment_url");

            // 3. Log pending transaction
            Payment payment = Payment.builder()
                    .orderId(savedOrder.getId())
                    .userId(request.userId)
                    .paymentMethod("CASHFREE")
                    .paymentStatus("PENDING")
                    .amount(totalAmount)
                    .currency("INR")
                    .gateway("CASHFREE")
                    .gatewayOrderId(cfOrderId)
                    .build();
            paymentRepository.save(payment);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "orderId", savedOrder.getId(),
                    "paymentUrl", paymentUrl
            ));

        } catch (Exception e) {
            // Fail order immediately on initialization error
            savedOrder.setPaymentStatus("FAILED");
            savedOrder.setOrderStatus("PAYMENT_FAILED");
            orderRepository.save(savedOrder);

            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to create Cashfree order: " + e.getMessage()));
        }
    }

    @GetMapping("/return")
    @ResponseBody
    public String handleReturn(@RequestParam("order_id") String orderId) {
        Optional<Order> orderOpt = orderRepository.findById(Long.parseLong(orderId));
        if (orderOpt.isEmpty()) {
            return getHtmlResponse(false, "Order not found.", orderId);
        }

        Order order = orderOpt.get();
        boolean isSuccess = false;
        String message = "Your payment was not successful.";

        try {
            // Query Cashfree API to verify final status
            Map<String, Object> status = cashfreeService.getOrderStatus(orderId);
            String cfStatus = (String) status.get("order_status");
            String cfOrderId = (String) status.get("cf_order_id");

            if ("PAID".equalsIgnoreCase(cfStatus)) {
                isSuccess = true;
                message = "Your payment has been successfully verified.";

                if (!"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
                    // Deduct stock now
                    Product product = productRepository.findById(order.getProductId()).orElse(null);
                    if (product != null && product.getStockQuantity() >= order.getQuantity()) {
                        product.setStockQuantity(product.getStockQuantity() - order.getQuantity());
                        productRepository.save(product);
                    }

                    // Update order
                    order.setPaymentStatus("PAID");
                    order.setOrderStatus("CONFIRMED");
                    orderRepository.save(order);

                    // Update payment
                    Optional<Payment> paymentOpt = paymentRepository.findByOrderId(order.getId());
                    if (paymentOpt.isPresent()) {
                        Payment payment = paymentOpt.get();
                        payment.setPaymentStatus("SUCCESS");
                        payment.setGatewayPaymentId(cfOrderId);
                        paymentRepository.save(payment);
                    }
                }
            } else {
                // Payment failed or cancelled
                order.setPaymentStatus("FAILED");
                order.setOrderStatus("PAYMENT_FAILED");
                orderRepository.save(order);

                Optional<Payment> paymentOpt = paymentRepository.findByOrderId(order.getId());
                if (paymentOpt.isPresent()) {
                    Payment payment = paymentOpt.get();
                    payment.setPaymentStatus("FAILED");
                    paymentRepository.save(payment);
                }
            }

        } catch (Exception e) {
            message = "Error verifying payment: " + e.getMessage();
        }

        return getHtmlResponse(isSuccess, message, orderId);
    }

    private String getHtmlResponse(boolean success, String message, String orderId) {
        String themeColor = success ? "#2ecc71" : "#e74c3c";
        String statusText = success ? "Payment Successful!" : "Payment Failed / Cancelled";
        String icon = success ? "&#10004;" : "&#10006;";

        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <title>Payment Status</title>\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
                "    <style>\n" +
                "        body { font-family: -apple-system, system-ui, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; background-color: #f7f9fc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n" +
                "        .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; max-width: 400px; width: 90%; }\n" +
                "        .icon { font-size: 48px; margin-bottom: 20px; color: " + themeColor + "; }\n" +
                "        h1 { margin: 0 0 10px 0; font-size: 22px; color: #333; }\n" +
                "        p { color: #666; font-size: 15px; margin: 0 0 24px 0; line-height: 1.5; }\n" +
                "        .btn { display: inline-block; padding: 12px 24px; background: #6A1B9A; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(106, 27, 154, 0.2); }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"card\">\n" +
                "        <div class=\"icon\">" + icon + "</div>\n" +
                "        <h1>" + statusText + "</h1>\n" +
                "        <p>" + message + "<br>Order ID: #" + orderId + "</p>\n" +
                "        <a href=\"ruvo://history\" class=\"btn\">Return to RuVo App</a>\n" +
                "    </div>\n" +
                "    <script>\n" +
                "        setTimeout(function() {\n" +
                "            window.location.href = \"ruvo://history\";\n" +
                "        }, 3000);\n" +
                "    </script>\n" +
                "</body>\n" +
                "</html>";
    }
}
