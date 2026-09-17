package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.model.Payment;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.model.OrderItem;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.PaymentRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.repository.OrderItemRepository;
import Ranex.ruvo.service.RazorpayService;
import Ranex.ruvo.service.NotificationService;
import Ranex.ruvo.util.DistanceUtils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;

import org.json.JSONObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/payments/razorpay")
public class RazorpayController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final OrderItemRepository orderItemRepository;
    private final RazorpayService razorpayService;
    private final NotificationService notificationService;
    private final Ranex.ruvo.service.OfferService offerService;

    public RazorpayController(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            ProductRepository productRepository,
            ShopRepository shopRepository,
            DeliveryPartnerRepository deliveryPartnerRepository,
            OrderItemRepository orderItemRepository,
            RazorpayService razorpayService,
            NotificationService notificationService,
            Ranex.ruvo.service.OfferService offerService) {

        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.orderItemRepository = orderItemRepository;
        this.razorpayService = razorpayService;
        this.notificationService = notificationService;
        this.offerService = offerService;
    }

    public static class RazorpayCheckoutRequest {
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
        public java.util.List<OrderItem> items;
        public String couponCode;
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
            @RequestBody RazorpayCheckoutRequest request) {
        
        try {
            // Simplified validation for brevity
            if (request.userId == null) return badRequest("User ID is required.");
            if (request.productId == null) return badRequest("Product ID is required.");

            Product product = productRepository.findById(request.productId).orElse(null);
            if (product == null) return badRequest("Product not found.");

            Shop shop = shopRepository.findById(product.getShopId()).orElse(null);
            if (shop == null) return badRequest("Shop not found.");

            BigDecimal productPrice = BigDecimal.valueOf(product.getSellingPrice()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal quantity = BigDecimal.valueOf(request.quantity != null ? request.quantity : 1);
            BigDecimal productAmount = productPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP);

            BigDecimal deliveryFee = BigDecimal.valueOf(30.00).setScale(2, RoundingMode.HALF_UP);
            BigDecimal platformFee = BigDecimal.valueOf(5.00).setScale(2, RoundingMode.HALF_UP);
            BigDecimal tax = productAmount.multiply(BigDecimal.valueOf(0.05)).setScale(2, RoundingMode.HALF_UP);

            BigDecimal couponDiscount = BigDecimal.ZERO;
            if (request.couponCode != null && !request.couponCode.trim().isEmpty()) {
                try {
                    Map<String, Object> validation = offerService.validateAndCalculateDiscount(request.couponCode, shop.getId(), productAmount);
                    couponDiscount = (BigDecimal) validation.get("discountAmount");
                } catch (Exception e) {
                    return badRequest("Invalid coupon: " + e.getMessage());
                }
            }

            BigDecimal totalAmount = productAmount.add(deliveryFee).add(platformFee).add(tax).subtract(couponDiscount).setScale(2, RoundingMode.HALF_UP);
            if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
                totalAmount = BigDecimal.ZERO;
            }

            Order order = new Order();
            order.setUserId(request.userId);
            order.setShopId(shop.getId());
            order.setProductId(request.productId);
            order.setProductName(request.productName != null ? request.productName : product.getName());
            order.setTotalAmount(totalAmount);
            order.setCouponCode(request.couponCode != null && couponDiscount.compareTo(BigDecimal.ZERO) > 0 ? request.couponCode : null);
            order.setCouponDiscount(couponDiscount);
            order.setSubtotal(productAmount);
            order.setDeliveryFee(deliveryFee);
            order.setPlatformFee(platformFee);
            order.setPaymentMethod("RAZORPAY");
            order.setPaymentStatus("PENDING");
            order.setOrderStatus("PAYMENT_PENDING");
            order.setDeliveryAddress(request.deliveryAddress);
            Order savedOrder = orderRepository.save(order);

            String shopAccountId = shop.getRazorpayAccountId();

            Map<String, Object> rzpResponse = razorpayService.createOrder(
                    String.valueOf(savedOrder.getId()),
                    totalAmount,
                    productAmount,
                    shopAccountId,
                    request.customerEmail,
                    request.customerPhone
            );

            String rzpOrderId = rzpResponse.get("razorpay_order_id") != null ? rzpResponse.get("razorpay_order_id").toString() : null;
            if (rzpOrderId == null) {
                return serverError("Failed to create Razorpay order.");
            }

            Payment payment = Payment.builder()
                    .orderId(savedOrder.getId())
                    .userId(request.userId)
                    .paymentMethod("RAZORPAY")
                    .paymentStatus("PENDING")
                    .amount(totalAmount)
                    .currency("INR")
                    .razorpayOrderId(rzpOrderId)
                    .razorpayStatus("CREATED")
                    .processingAttempts(0)
                    .build();

            paymentRepository.save(payment);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "orderId", savedOrder.getId(),
                            "razorpayOrderId", rzpOrderId,
                            "amount", totalAmount,
                            "currency", "INR"
                    )
            );
        } catch (Exception e) {
            return serverError("Payment initialization failed: " + e.getMessage());
        }
    }

    @PostMapping("/webhook")
    @Transactional
    public ResponseEntity<?> webhook(
            @RequestBody String rawPayload,
            HttpServletRequest request) {
        
        try {
            String signature = request.getHeader("x-razorpay-signature");
            if (!razorpayService.verifyWebhookSignature(rawPayload, signature)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false));
            }

            JSONObject json = new JSONObject(rawPayload);
            String event = json.optString("event");

            if ("order.paid".equals(event) || "payment.captured".equals(event)) {
                JSONObject payloadObj = json.optJSONObject("payload");
                if (payloadObj != null) {
                    JSONObject orderObj = payloadObj.optJSONObject("order");
                    JSONObject paymentObj = payloadObj.optJSONObject("payment");
                    
                    String rzpOrderId = orderObj != null ? orderObj.optJSONObject("entity").optString("id") : null;
                    if (rzpOrderId == null && paymentObj != null) {
                        rzpOrderId = paymentObj.optJSONObject("entity").optString("order_id");
                    }

                    if (rzpOrderId != null) {
                        Payment payment = paymentRepository.findByRazorpayOrderId(rzpOrderId).orElse(null);
                        if (payment != null && !"SUCCESS".equals(payment.getPaymentStatus())) {
                            payment.markSuccess(
                                paymentObj != null ? paymentObj.optJSONObject("entity").optString("id") : null,
                                "SUCCESS",
                                "ONLINE"
                            );
                            paymentRepository.save(payment);
                            
                            Order order = orderRepository.findById(payment.getOrderId()).orElse(null);
                            if (order != null) {
                                order.setPaymentStatus("SUCCESS");
                                order.setOrderStatus(OrderStatus.SHOP_PENDING);
                                orderRepository.save(order);
                            }
                        }
                    }
                }
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/register-shop-vendor")
    @Transactional
    public ResponseEntity<?> registerShopVendor(@RequestBody Map<String, Object> body) {
        try {
            Long shopId = body.get("shopId") != null ? Long.valueOf(body.get("shopId").toString()) : null;
            if (shopId == null) return badRequest("shopId is required.");

            Shop shop = shopRepository.findById(shopId).orElse(null);
            if (shop == null) return badRequest("Shop not found.");

            if (shop.getRazorpayAccountId() != null && !shop.getRazorpayAccountId().isBlank()) {
                return badRequest("Shop already registered as vendor.");
            }

            String name = shop.getName();
            String email = shopId + "@shop.ruvo.in";
            String phone = shop.getPhone() != null ? shop.getPhone() : "0000000000";
            
            String ifsc = body.get("ifsc") != null ? body.get("ifsc").toString() : null;
            String acc = body.get("accountNumber") != null ? body.get("accountNumber").toString() : null;

            String accountId = razorpayService.createLinkedAccount(name, email, phone, ifsc, acc);
            shop.setRazorpayAccountId(accountId);
            shopRepository.save(shop);

            return ResponseEntity.ok(Map.of("success", true, "accountId", accountId));
        } catch (Exception e) {
            return serverError("Vendor registration failed: " + e.getMessage());
        }
    }

    @PostMapping("/register-partner-vendor")
    @Transactional
    public ResponseEntity<?> registerPartnerVendor(@RequestBody Map<String, Object> body) {
        try {
            Long partnerId = body.get("partnerId") != null ? Long.valueOf(body.get("partnerId").toString()) : null;
            if (partnerId == null) return badRequest("partnerId is required.");

            Ranex.ruvo.model.DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId).orElse(null);
            if (partner == null) return badRequest("Partner not found.");

            if (partner.getRazorpayAccountId() != null && !partner.getRazorpayAccountId().isBlank()) {
                return badRequest("Partner already registered as vendor.");
            }

            String name = partner.getName();
            String email = partnerId + "@partner.ruvo.in";
            String phone = partner.getPhone() != null ? partner.getPhone() : "0000000000";
            
            String ifsc = body.get("ifsc") != null ? body.get("ifsc").toString() : null;
            String acc = body.get("accountNumber") != null ? body.get("accountNumber").toString() : null;

            String accountId = razorpayService.createLinkedAccount(name, email, phone, ifsc, acc);
            partner.setRazorpayAccountId(accountId);
            deliveryPartnerRepository.save(partner);

            return ResponseEntity.ok(Map.of("success", true, "accountId", accountId));
        } catch (Exception e) {
            return serverError("Partner registration failed: " + e.getMessage());
        }
    }

    private ResponseEntity<?> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "message", message));
    }

    private ResponseEntity<?> serverError(String message) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", message));
    }
}
