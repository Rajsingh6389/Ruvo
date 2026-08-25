package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.model.Payment;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.PaymentRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.service.CashfreeService;
import Ranex.ruvo.service.NotificationService;
import Ranex.ruvo.util.DistanceUtils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments/cashfree")
public class CashfreeController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final CashfreeService cashfreeService;
    private final NotificationService notificationService;

    public CashfreeController(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            ProductRepository productRepository,
            ShopRepository shopRepository,
            DeliveryPartnerRepository deliveryPartnerRepository,
            CashfreeService cashfreeService,
            NotificationService notificationService) {

        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.cashfreeService = cashfreeService;
        this.notificationService = notificationService;
    }

    // =========================================================
    // CHECKOUT REQUEST
    // =========================================================

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

    // =========================================================
    // CREATE CASHFREE PAYMENT
    // =========================================================

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
            @RequestBody CashfreeCheckoutRequest request) {

        try {

            // -------------------------------------------------
            // 1. BASIC VALIDATION
            // -------------------------------------------------

            if (request == null) {
                return badRequest("Request body is required.");
            }

            if (request.userId == null || request.userId.isBlank()) {
                return badRequest("User ID is required.");
            }

            if (request.productId == null) {
                return badRequest("Product ID is required.");
            }

            if (request.quantity == null || request.quantity <= 0) {
                return badRequest("Quantity must be greater than zero.");
            }

            if (request.customerPhone == null ||
                    request.customerPhone.isBlank()) {

                return badRequest("Customer phone is required.");
            }

            if (request.customerEmail == null ||
                    request.customerEmail.isBlank()) {

                return badRequest("Customer email is required.");
            }

            // -------------------------------------------------
            // 2. FETCH PRODUCT
            // -------------------------------------------------

            Product product = productRepository
                    .findById(request.productId)
                    .orElse(null);

            if (product == null) {
                return badRequest("Product not found.");
            }

            // -------------------------------------------------
            // 3. CHECK STOCK
            // -------------------------------------------------

            if (product.getStockQuantity() == null) {
                return badRequest("Product stock information unavailable.");
            }

            if (product.getStockQuantity() < request.quantity) {

                return badRequest(
                        "Insufficient stock available. Only "
                                + product.getStockQuantity()
                                + " item(s) left."
                );
            }

            // -------------------------------------------------
            // 4. FETCH SHOP
            // -------------------------------------------------

            Long actualShopId = product.getShopId();

            if (actualShopId == null) {
                return badRequest(
                        "This product is not associated with a shop."
                );
            }

            Shop shop = shopRepository
                    .findById(actualShopId)
                    .orElse(null);

            if (shop == null) {
                return badRequest("Shop not found.");
            }

            // -------------------------------------------------
            // 5. CALCULATE PRODUCT AMOUNT
            // -------------------------------------------------

            BigDecimal productPrice = BigDecimal
                    .valueOf(product.getSellingPrice())
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal quantity = BigDecimal
                    .valueOf(request.quantity);

            BigDecimal productAmount = productPrice
                    .multiply(quantity)
                    .setScale(2, RoundingMode.HALF_UP);

            // -------------------------------------------------
            // 6. CALCULATE DELIVERY + PLATFORM FEE
            // -------------------------------------------------

            BigDecimal deliveryFee;
            BigDecimal platformFee;

            if (shop.getLatitude() != null &&
                    shop.getLongitude() != null &&
                    request.userLatitude != null &&
                    request.userLongitude != null) {

                double distanceKm =
                        DistanceUtils.calculateDistance(
                                request.userLatitude,
                                request.userLongitude,
                                shop.getLatitude(),
                                shop.getLongitude()
                        );

                deliveryFee = BigDecimal
                        .valueOf(
                                DistanceUtils.calculateDeliveryFee(
                                        distanceKm
                                )
                        )
                        .setScale(2, RoundingMode.HALF_UP);

                platformFee = BigDecimal
                        .valueOf(
                                DistanceUtils.calculatePlatformFee(
                                        distanceKm
                                )
                        )
                        .setScale(2, RoundingMode.HALF_UP);

            } else {

                // Do not silently charge an incorrect amount
                // in production if location is mandatory.
                deliveryFee = BigDecimal
                        .valueOf(30.00)
                        .setScale(2, RoundingMode.HALF_UP);

                platformFee = BigDecimal
                        .valueOf(5.00)
                        .setScale(2, RoundingMode.HALF_UP);
            }

            // -------------------------------------------------
            // 7. TAX
            // -------------------------------------------------

            BigDecimal tax = productAmount
                    .multiply(BigDecimal.valueOf(0.05))
                    .setScale(2, RoundingMode.HALF_UP);

            // -------------------------------------------------
            // 8. FINAL AMOUNT
            // -------------------------------------------------

            BigDecimal totalAmount = productAmount
                    .add(deliveryFee)
                    .add(platformFee)
                    .add(tax)
                    .setScale(2, RoundingMode.HALF_UP);

            if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
                return badRequest("Invalid payment amount.");
            }

            // -------------------------------------------------
            // 9. CREATE RUVO ORDER
            // -------------------------------------------------

            Order order = new Order();

            order.setUserId(request.userId);

            // IMPORTANT:
            // Use actual product shop instead of blindly trusting
            // shopId received from frontend.
            order.setShopId(actualShopId);

            order.setProductId(request.productId);

            order.setProductName(
                    request.productName != null &&
                            !request.productName.isBlank()
                            ? request.productName
                            : product.getName()
            );

            order.setTotalAmount(totalAmount);

            order.setPaymentMethod("CASHFREE");

            order.setPaymentStatus("PENDING");

            order.setOrderStatus(
                    "PAYMENT_PENDING"
            );

            order.setDeliveryAddress(
                    request.deliveryAddress
            );

            Order savedOrder =
                    orderRepository.save(order);

            // -------------------------------------------------
            // 10. CASHFREE RETURN URL
            // -------------------------------------------------

            String returnUrl =
                    cashfreeService.buildReturnUrl(
                            savedOrder.getId()
                    );

            // -------------------------------------------------
            // 11. SHOP CASHFREE VENDOR
            // -------------------------------------------------

            String shopVendorId =
                    shop.getCashfreeVendorId();

            // -------------------------------------------------
            // 12. CREATE CASHFREE ORDER
            // -------------------------------------------------

            Map<String, Object> cfResponse =
                    cashfreeService.createOrder(
                            String.valueOf(savedOrder.getId()),
                            totalAmount,
                            productAmount,
                            shopVendorId,
                            request.userId,
                            request.customerPhone,
                            request.customerEmail,
                            returnUrl
                    );

            if (cfResponse == null) {

                markOrderPaymentFailed(savedOrder);

                return serverError(
                        "Cashfree did not return a response."
                );
            }

            String cfOrderId =
                    getString(cfResponse, "cf_order_id");

            String paymentSessionId =
                    getString(cfResponse, "payment_session_id");

            if (cfOrderId == null ||
                    cfOrderId.isBlank()) {

                markOrderPaymentFailed(savedOrder);

                return serverError(
                        "Cashfree order ID was not returned."
                );
            }

            if (paymentSessionId == null ||
                    paymentSessionId.isBlank()) {

                markOrderPaymentFailed(savedOrder);

                return serverError(
                        "Cashfree payment session ID was not returned."
                );
            }

            // -------------------------------------------------
            // 13. SAVE PAYMENT ATTEMPT
            // -------------------------------------------------

            Payment payment = Payment.builder()
                    .orderId(savedOrder.getId())
                    .userId(request.userId)
                    .paymentMethod("CASHFREE")
                    .paymentStatus("PENDING")
                    .amount(totalAmount)
                    .currency("INR")
                    .cashfreeOrderId(cfOrderId)
                    .cashfreeStatus("ACTIVE")
                    .processingAttempts(0)
                    .build();

            paymentRepository.save(payment);

            // -------------------------------------------------
            // 14. RESPONSE TO APP
            // -------------------------------------------------

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "orderId", savedOrder.getId(),
                            "cashfreeOrderId", cfOrderId,
                            "paymentSessionId", paymentSessionId,
                            "amount", totalAmount,
                            "currency", "INR"
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "success", false,
                                    "message",
                                    "Unable to initialize payment."
                            )
                    );
        }
    }

    // =========================================================
    // CASHFREE WEBHOOK
    // =========================================================

    @PostMapping("/webhook")
    @Transactional
    public ResponseEntity<?> webhook(
            @RequestBody String rawPayload,
            HttpServletRequest request) {

        try {

            // -------------------------------------------------
            // 1. VERIFY CASHFREE WEBHOOK
            // -------------------------------------------------

            boolean valid =
                    cashfreeService.verifyWebhook(
                            rawPayload,
                            request
                    );

            if (!valid) {

                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(
                                Map.of(
                                        "success", false,
                                        "message",
                                        "Invalid webhook signature."
                                )
                        );
            }

            // -------------------------------------------------
            // 2. PARSE WEBHOOK
            // -------------------------------------------------

            CashfreeService.CashfreeWebhookData webhook =
                    cashfreeService.parseWebhook(
                            rawPayload
                    );

            if (webhook == null ||
                    webhook.getCashfreeOrderId() == null) {

                return badRequest(
                        "Invalid Cashfree webhook payload."
                );
            }

            String cfOrderId =
                    webhook.getCashfreeOrderId();

            // -------------------------------------------------
            // 3. FIND PAYMENT
            // -------------------------------------------------

            Payment payment =
                    paymentRepository
                            .findByCashfreeOrderId(
                                    cfOrderId
                            )
                            .orElse(null);

            if (payment == null) {

                // Return 200 so gateway does not endlessly retry
                // an event for an unknown internal order.
                return ResponseEntity.ok(
                        Map.of(
                                "success", true,
                                "message",
                                "Payment not found."
                        )
                );
            }

            // -------------------------------------------------
            // 4. IDEMPOTENCY
            // -------------------------------------------------

            String eventId =
                    webhook.getEventId();

            if (eventId != null &&
                    eventId.equals(
                            payment.getWebhookEventId()
                    )) {

                return ResponseEntity.ok(
                        Map.of(
                                "success", true,
                                "message",
                                "Webhook already processed."
                        )
                );
            }

            payment.incrementProcessingAttempts();

            if (eventId != null) {
                payment.setWebhookEventId(eventId);
            }

            // -------------------------------------------------
            // 5. SUCCESS
            // -------------------------------------------------

            if ("SUCCESS".equalsIgnoreCase(
                    webhook.getPaymentStatus()
            )) {

                processSuccessfulPayment(
                        payment,
                        webhook
                );

            }

            // -------------------------------------------------
            // 6. FAILED
            // -------------------------------------------------

            else if ("FAILED".equalsIgnoreCase(
                    webhook.getPaymentStatus()
            )) {

                processFailedPayment(
                        payment,
                        webhook
                );

            }

            // -------------------------------------------------
            // 7. USER DROPPED / CANCELLED
            // -------------------------------------------------

            else if ("USER_DROPPED".equalsIgnoreCase(
                    webhook.getPaymentStatus()
            )) {

                payment.markCancelled();

                payment.setWebhookEventId(eventId);

                paymentRepository.save(payment);

                Order order =
                        orderRepository
                                .findById(payment.getOrderId())
                                .orElse(null);

                if (order != null &&
                        !"SUCCESS".equalsIgnoreCase(
                                order.getPaymentStatus()
                        )) {

                    order.setPaymentStatus("FAILED");
                    order.setOrderStatus(
                            "PAYMENT_FAILED"
                    );

                    orderRepository.save(order);
                }

            }

            // -------------------------------------------------
            // 8. PENDING / UNKNOWN
            // -------------------------------------------------

            else {

                payment.setCashfreeStatus(
                        webhook.getPaymentStatus()
                );

                paymentRepository.save(payment);
            }

            return ResponseEntity.ok(
                    Map.of(
                            "success", true
                    )
            );

        } catch (Exception e) {

            /*
             * Return 500 when processing genuinely failed.
             * Cashfree can retry the webhook.
             */

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            Map.of(
                                    "success", false,
                                    "message",
                                    "Webhook processing failed."
                            )
                    );
        }
    }

    // =========================================================
    // SUCCESS PAYMENT PROCESSING
    // =========================================================

    private void processSuccessfulPayment(
            Payment payment,
            CashfreeService.CashfreeWebhookData webhook) {

        // -----------------------------------------------------
        // Already successful = idempotent return
        // -----------------------------------------------------

        if ("SUCCESS".equalsIgnoreCase(
                payment.getPaymentStatus()
        )) {
            return;
        }

        Order order =
                orderRepository
                        .findById(payment.getOrderId())
                        .orElseThrow(
                                () -> new IllegalStateException(
                                        "Order not found."
                                )
                        );

        Product product =
                productRepository
                        .findById(order.getProductId())
                        .orElseThrow(
                                () -> new IllegalStateException(
                                        "Product not found."
                                )
                        );

        // -----------------------------------------------------
        // STOCK CHECK
        // -----------------------------------------------------

        if (product.getStockQuantity() == null ||
                product.getStockQuantity()
                        < order.getQuantity()) {

            /*
             * Do NOT mark payment successful and silently
             * deduct negative stock.
             *
             * In a real production implementation this should
             * trigger a stock-conflict/refund workflow.
             */

            throw new IllegalStateException(
                    "Insufficient stock after payment."
            );
        }

        // -----------------------------------------------------
        // DEDUCT STOCK
        // -----------------------------------------------------

        product.setStockQuantity(
                product.getStockQuantity()
                        - order.getQuantity()
        );

        productRepository.save(product);

        // -----------------------------------------------------
        // UPDATE PAYMENT
        // -----------------------------------------------------

        payment.markSuccess(
                webhook.getCashfreePaymentId(),
                webhook.getPaymentStatus(),
                webhook.getPaymentMethod()
        );

        payment.setWebhookEventId(
                webhook.getEventId()
        );

        paymentRepository.save(payment);

        // -----------------------------------------------------
        // UPDATE ORDER
        // -----------------------------------------------------

        order.setPaymentStatus("SUCCESS");

        order.setOrderStatus(
                OrderStatus.SHOP_PENDING
        );

        order.setShopResponseDeadline(
                Instant.now()
                        .plus(
                                10,
                                ChronoUnit.MINUTES
                        )
        );

        Order savedOrder =
                orderRepository.save(order);

        // -----------------------------------------------------
        // NOTIFY SHOPKEEPER
        // -----------------------------------------------------

        notificationService.notifyShop(
                savedOrder
        );
    }

    // =========================================================
    // FAILED PAYMENT
    // =========================================================

    private void processFailedPayment(
            Payment payment,
            CashfreeService.CashfreeWebhookData webhook) {

        // Already completed successfully?
        // Never downgrade SUCCESS → FAILED.
        if ("SUCCESS".equalsIgnoreCase(
                payment.getPaymentStatus()
        )) {
            return;
        }

        payment.markFailed(
                webhook.getPaymentStatus(),
                webhook.getFailureCode(),
                webhook.getFailureReason()
        );

        payment.setWebhookEventId(
                webhook.getEventId()
        );

        paymentRepository.save(payment);

        Order order =
                orderRepository
                        .findById(payment.getOrderId())
                        .orElse(null);

        if (order == null) {
            return;
        }

        order.setPaymentStatus("FAILED");

        order.setOrderStatus(
                "PAYMENT_FAILED"
        );

        orderRepository.save(order);
    }

    // =========================================================
    // RETURN URL
    // =========================================================

    @GetMapping("/return")
    public ResponseEntity<String> paymentReturn(
            @RequestParam("order_id") Long orderId) {

        Optional<Order> orderOpt =
                orderRepository.findById(orderId);

        if (orderOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            getHtml(
                                    false,
                                    "Order not found.",
                                    orderId
                            )
                    );
        }

        Order order = orderOpt.get();

        boolean success =
                "SUCCESS".equalsIgnoreCase(
                        order.getPaymentStatus()
                );

        String message;

        if (success) {

            message =
                    "Your payment has been successfully verified.";

        } else if ("FAILED".equalsIgnoreCase(
                order.getPaymentStatus()
        )) {

            message =
                    "Your payment was not successful.";

        } else {

            message =
                    "Payment verification is still in progress.";
        }

        return ResponseEntity.ok(
                getHtml(
                        success,
                        message,
                        orderId
                )
        );
    }

    // =========================================================
    // HTML RESPONSE
    // =========================================================

    private String getHtml(
            boolean success,
            String message,
            Long orderId) {

        String title =
                success
                        ? "Payment Successful!"
                        : "Payment Status";

        String icon =
                success
                        ? "✓"
                        : "•";

        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>%s</title>

                    <meta
                        name="viewport"
                        content="width=device-width,
                        initial-scale=1"
                    >

                    <style>
                        body {
                            font-family:
                                -apple-system,
                                BlinkMacSystemFont,
                                "Segoe UI",
                                Roboto,
                                sans-serif;

                            background: #f7f9fc;

                            display: flex;
                            align-items: center;
                            justify-content: center;

                            min-height: 100vh;
                            margin: 0;
                        }

                        .card {
                            background: white;
                            padding: 32px;
                            border-radius: 16px;

                            box-shadow:
                                0 8px 30px
                                rgba(0,0,0,0.08);

                            text-align: center;

                            max-width: 400px;
                            width: 90%%;
                        }

                        .icon {
                            font-size: 54px;
                            margin-bottom: 16px;
                        }

                        h1 {
                            margin: 0 0 12px;
                            color: #222;
                        }

                        p {
                            color: #666;
                            line-height: 1.6;
                        }

                        .btn {
                            display: inline-block;
                            margin-top: 16px;

                            padding: 12px 24px;

                            background: #6A1B9A;
                            color: white;

                            text-decoration: none;

                            border-radius: 8px;
                            font-weight: 600;
                        }
                    </style>
                </head>

                <body>

                    <div class="card">

                        <div class="icon">
                            %s
                        </div>

                        <h1>
                            %s
                        </h1>

                        <p>
                            %s
                            <br>
                            Order ID: #%d
                        </p>

                        <a
                            href="ruvomobile://history"
                            class="btn"
                        >
                            Return to RuVo App
                        </a>

                    </div>

                    <script>
                        setTimeout(function() {
                            window.location.href =
                                "ruvomobile://history";
                        }, 3000);
                    </script>

                </body>
                </html>
                """.formatted(
                title,
                icon,
                title,
                escapeHtml(message),
                orderId
        );
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private ResponseEntity<?> badRequest(
            String message) {

        return ResponseEntity
                .badRequest()
                .body(
                        Map.of(
                                "success", false,
                                "message", message
                        )
                );
    }

    private ResponseEntity<?> serverError(
            String message) {

        return ResponseEntity
                .status(
                        HttpStatus.INTERNAL_SERVER_ERROR
                )
                .body(
                        Map.of(
                                "success", false,
                                "message", message
                        )
                );
    }

    private void markOrderPaymentFailed(
            Order order) {

        order.setPaymentStatus("FAILED");

        order.setOrderStatus(
                "PAYMENT_FAILED"
        );

        orderRepository.save(order);
    }

    private String getString(
            Map<String, Object> map,
            String key) {

        Object value = map.get(key);

        return value == null
                ? null
                : String.valueOf(value);
    }

    private String escapeHtml(String value) {

        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    // =========================================================
    // VENDOR ONBOARDING — ADMIN ENDPOINTS
    // =========================================================

    /**
     * POST /api/payments/cashfree/register-shop-vendor
     * Register a shop as a Cashfree vendor for instant split payments.
     *
     * Body: { "shopId": 1, "pan": "ABCDE1234F",
     *         "accountNumber": "...", "ifsc": "...", "beneficiaryName": "..." }
     */
    @PostMapping("/register-shop-vendor")
    @Transactional
    public ResponseEntity<?> registerShopVendor(
            @RequestBody Map<String, Object> body) {

        try {

            Long shopId = body.get("shopId") != null
                    ? Long.valueOf(body.get("shopId").toString())
                    : null;

            if (shopId == null) {
                return badRequest("shopId is required.");
            }

            Shop shop = shopRepository
                    .findById(shopId)
                    .orElse(null);

            if (shop == null) {
                return badRequest("Shop not found.");
            }

            if (shop.getCashfreeVendorId() != null &&
                    !shop.getCashfreeVendorId().isBlank()) {

                return badRequest(
                        "Shop already registered as vendor: "
                                + shop.getCashfreeVendorId()
                );
            }

            String vendorId = "RUVO-SHOP-" + shopId;
            String phone = shop.getPhone() != null
                    ? shop.getPhone() : "0000000000";
            String email = shopId + "@shop.ruvo.in";

            Map<String, Object> result =
                    cashfreeService.createVendor(
                            vendorId,
                            shop.getName(),
                            phone,
                            email,
                            body.get("pan") != null
                                    ? body.get("pan").toString() : null,
                            body.get("accountNumber") != null
                                    ? body.get("accountNumber").toString() : null,
                            body.get("ifsc") != null
                                    ? body.get("ifsc").toString() : null,
                            body.get("beneficiaryName") != null
                                    ? body.get("beneficiaryName").toString()
                                    : shop.getName()
                    );

            // Save vendor ID on shop
            shop.setCashfreeVendorId(vendorId);
            shopRepository.save(shop);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "vendorId", vendorId,
                            "shopId", shopId,
                            "shopName", shop.getName(),
                            "message", "Shop registered as Cashfree vendor."
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "success", false,
                                    "message", "Vendor registration failed: "
                                            + e.getMessage()
                            )
                    );
        }
    }

    /**
     * POST /api/payments/cashfree/register-partner-vendor
     * Register a delivery partner as a Cashfree vendor for instant transfers.
     *
     * Body: { "partnerId": 1, "pan": "ABCDE1234F",
     *         "accountNumber": "...", "ifsc": "...", "beneficiaryName": "..." }
     */
    @PostMapping("/register-partner-vendor")
    public ResponseEntity<?> registerPartnerVendor(
            @RequestBody Map<String, Object> body) {

        try {

            Long partnerId = body.get("partnerId") != null
                    ? Long.valueOf(body.get("partnerId").toString())
                    : null;

            if (partnerId == null) {
                return badRequest("partnerId is required.");
            }

            Ranex.ruvo.model.DeliveryPartner partner =
                    deliveryPartnerRepository
                            .findById(partnerId)
                            .orElse(null);

            if (partner == null) {
                return badRequest("Delivery partner not found.");
            }

            if (partner.getCashfreeVendorId() != null &&
                    !partner.getCashfreeVendorId().isBlank()) {

                return badRequest(
                        "Partner already registered as vendor: "
                                + partner.getCashfreeVendorId()
                );
            }

            String vendorId = "RUVO-PARTNER-" + partnerId;

            Map<String, Object> result =
                    cashfreeService.createVendor(
                            vendorId,
                            partner.getName(),
                            partner.getPhone(),
                            partnerId + "@partner.ruvo.in",
                            body.get("pan") != null
                                    ? body.get("pan").toString() : null,
                            body.get("accountNumber") != null
                                    ? body.get("accountNumber").toString() : null,
                            body.get("ifsc") != null
                                    ? body.get("ifsc").toString() : null,
                            body.get("beneficiaryName") != null
                                    ? body.get("beneficiaryName").toString()
                                    : partner.getName()
                    );

            // Save vendor ID on partner
            partner.setCashfreeVendorId(vendorId);
            deliveryPartnerRepository.save(partner);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "vendorId", vendorId,
                            "partnerId", partnerId,
                            "partnerName", partner.getName(),
                            "message", "Partner registered as Cashfree vendor."
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "success", false,
                                    "message", "Vendor registration failed: "
                                            + e.getMessage()
                            )
                    );
        }
    }
}
