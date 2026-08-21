package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.model.Payment;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.model.User;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.PaymentRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.repository.UserRepository;
import Ranex.ruvo.service.NotificationService;
import Ranex.ruvo.service.PricingService;
import Ranex.ruvo.service.RazorpayService;
import Ranex.ruvo.util.DistanceUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final PricingService pricingService;
    private final NotificationService notificationService;
    private final RazorpayService razorpayService;

    public PaymentController(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            ProductRepository productRepository,
            ShopRepository shopRepository,
            UserRepository userRepository,
            PricingService pricingService,
            NotificationService notificationService,
            RazorpayService razorpayService) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.pricingService = pricingService;
        this.notificationService = notificationService;
        this.razorpayService = razorpayService;
    }

    // Request DTO for Checkout
    public static class CheckoutRequest {
        public String userId;
        public Long shopId;
        public Long productId;
        public String productName;
        public Integer quantity;
        public String paymentMethod; // COD or ONLINE / UPI
        public String deliveryAddress;
        public Double userLatitude;
        public Double userLongitude;
        // Customer details (passed from mobile profile context)
        public String customerName;
        public String customerPhone;
    }

    // Request DTO for Verification
    public static class VerifyRequest {
        public Long orderId;
        public String razorpayPaymentId;
        public String razorpayOrderId;
        public String razorpaySignature;
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@RequestBody CheckoutRequest request) {
        Product product = productRepository.findById(request.productId).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Product not found."));
        }

        if (product.getStockQuantity() < request.quantity) {
            return ResponseEntity.badRequest().body(Map.of("message", "Insufficient stock available. Only " + product.getStockQuantity() + " left."));
        }

        // Recalculate price securely on server
        Shop shop = shopRepository.findById(request.shopId).orElse(null);
        double distanceKm = 0.0;
        if (shop != null && shop.getLatitude() != null && shop.getLongitude() != null
                && request.userLatitude != null && request.userLongitude != null) {
            distanceKm = DistanceUtils.calculateDistance(
                    request.userLatitude, request.userLongitude,
                    shop.getLatitude(), shop.getLongitude()
            );
        }

        double deliveryFee = pricingService.calculateDeliveryFee(distanceKm);
        double platformFee = pricingService.calculatePlatformFee(distanceKm);
        double subtotal = product.getSellingPrice() * request.quantity;
        double totalAmount = subtotal + deliveryFee + platformFee;

        // Build base order entity
        Order order = new Order();
        order.setUserId(request.userId);
        order.setShopId(request.shopId);
        order.setProductId(request.productId);
        order.setProductName(request.productName);
        order.setProductImageUrl(product.getImageUrl());
        order.setQuantity(request.quantity);
        order.setSubtotal(Math.round(subtotal * 100.0) / 100.0);
        order.setDeliveryFee(deliveryFee);
        order.setPlatformFee(platformFee);
        order.setDistanceKm(Math.round(distanceKm * 10.0) / 10.0);
        order.setTotalAmount(Math.round(totalAmount * 100.0) / 100.0);
        order.setDeliveryAddress(request.deliveryAddress);
        order.setPaymentMethod(request.paymentMethod != null ? request.paymentMethod : "COD");

        // Snapshot customer details for shopkeeper visibility
        String customerName = request.customerName;
        String customerPhone = request.customerPhone;
        try {
            Long uid = Long.parseLong(request.userId);
            User user = userRepository.findById(uid).orElse(null);
            if (user != null) {
                customerName = user.getName();
                customerPhone = user.getMobileNumber();
            }
        } catch (NumberFormatException ignored) {}
        order.setCustomerName(customerName);
        order.setCustomerPhone(customerPhone);

        if ("COD".equalsIgnoreCase(request.paymentMethod)) {
            // Deduct stock immediately for COD
            product.setStockQuantity(product.getStockQuantity() - request.quantity);
            productRepository.save(product);

            order.setPaymentStatus("COD_PENDING");
            order.setOrderStatus(OrderStatus.SHOP_PENDING);
            order.setShopResponseDeadline(Instant.now().plus(10, ChronoUnit.MINUTES));
            Order savedOrder = orderRepository.save(order);
            if (savedOrder.getDeliveryOtpHash() == null) {
                String otp = String.format("%04d", Math.abs(savedOrder.getId().hashCode()) % 9000 + 1000);
                savedOrder.setDeliveryOtpHash(otp);
                savedOrder = orderRepository.save(savedOrder);
            }

            // Log payment
            Payment payment = Payment.builder()
                    .orderId(savedOrder.getId())
                    .userId(request.userId)
                    .paymentMethod("COD")
                    .paymentStatus("COD_PENDING")
                    .amount(savedOrder.getTotalAmount())
                    .currency("INR")
                    .build();
            paymentRepository.save(payment);

            // Send notification directly to shopkeeper's dashboard
            notificationService.notifyShop(savedOrder);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "orderId", savedOrder.getId(),
                    "paymentMethod", "COD",
                    "message", "Order placed successfully via Cash on Delivery!"
            ));
        } else {
            // Online Payment Flow (Razorpay / UPI)
            order.setPaymentStatus("PENDING");
            order.setOrderStatus(OrderStatus.PAYMENT_PENDING);
            Order savedOrder = orderRepository.save(order);

            try {
                // Initialize Razorpay Order
                com.razorpay.Order rzpOrder = razorpayService.createOrder(savedOrder.getTotalAmount(), "receipt_order_" + savedOrder.getId());
                String rzpOrderId = rzpOrder.get("id");

                // Log pending payment
                Payment payment = Payment.builder()
                        .orderId(savedOrder.getId())
                        .userId(request.userId)
                        .paymentMethod("ONLINE")
                        .paymentStatus("PENDING")
                        .amount(savedOrder.getTotalAmount())
                        .currency("INR")
                        .gateway("RAZORPAY")
                        .gatewayOrderId(rzpOrderId)
                        .build();
                paymentRepository.save(payment);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "orderId", savedOrder.getId(),
                        "paymentMethod", "ONLINE",
                        "razorpayOrderId", rzpOrderId,
                        "amount", savedOrder.getTotalAmount(),
                        "keyId", razorpayService.getKeyId()
                ));
            } catch (Exception e) {
                // Rollback order status to failed
                savedOrder.setPaymentStatus("FAILED");
                savedOrder.setOrderStatus("PAYMENT_FAILED");
                orderRepository.save(savedOrder);

                return ResponseEntity.internalServerError().body(Map.of("message", "Failed to create payment gateway order: " + e.getMessage()));
            }
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody VerifyRequest request) {
        boolean isValid = razorpayService.verifySignature(
                request.razorpayOrderId,
                request.razorpayPaymentId,
                request.razorpaySignature
        );

        Optional<Order> orderOpt = orderRepository.findById(request.orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order not found."));
        }
        Order order = orderOpt.get();

        if (isValid) {
            // Prevent double-processing
            if ("PAID".equalsIgnoreCase(order.getPaymentStatus()) || "SUCCESS".equalsIgnoreCase(order.getPaymentStatus())) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Payment already verified."));
            }

            // Deduct stock now upon successful payment confirmation
            Product product = productRepository.findById(order.getProductId()).orElse(null);
            if (product == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Product no longer exists."));
            }

            if (product.getStockQuantity() < order.getQuantity()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Product went out of stock during checkout."));
            }

            product.setStockQuantity(product.getStockQuantity() - order.getQuantity());
            productRepository.save(product);

            // Update order status -> directly to SHOP_PENDING with 10 minute deadline
            order.setPaymentStatus("SUCCESS");
            order.setOrderStatus(OrderStatus.SHOP_PENDING);
            order.setShopResponseDeadline(Instant.now().plus(10, ChronoUnit.MINUTES));
            Order savedOrder = orderRepository.save(order);

            // Update payment transaction logs
            Optional<Payment> paymentOpt = paymentRepository.findByOrderId(order.getId());
            if (paymentOpt.isPresent()) {
                Payment payment = paymentOpt.get();
                payment.setPaymentStatus("SUCCESS");
                payment.setGatewayPaymentId(request.razorpayPaymentId);
                payment.setGatewayOrderId(request.razorpayOrderId);
                paymentRepository.save(payment);
            }

            // Notify shopkeeper upon payment verification
            notificationService.notifyShop(savedOrder);

            return ResponseEntity.ok(Map.of("success", true, "orderId", savedOrder.getId(), "message", "Payment verified and order confirmed successfully!"));
        } else {
            // Mark as failed
            order.setPaymentStatus("FAILED");
            order.setOrderStatus("PAYMENT_FAILED");
            orderRepository.save(order);

            Optional<Payment> paymentOpt = paymentRepository.findByOrderId(order.getId());
            if (paymentOpt.isPresent()) {
                Payment payment = paymentOpt.get();
                payment.setPaymentStatus("FAILED");
                paymentRepository.save(payment);
            }

            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Signature verification failed. Payment was tampered with or unsuccessful."));
        }
    }

    @PostMapping("/fail")
    public ResponseEntity<?> failPayment(@RequestBody Map<String, Long> payload) {
        Long orderId = payload.get("orderId");
        if (orderId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "OrderId required."));
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
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

        return ResponseEntity.ok(Map.of("success", true, "message", "Payment marked as failed."));
    }
}
