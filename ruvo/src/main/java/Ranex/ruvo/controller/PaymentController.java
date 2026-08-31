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
import Ranex.ruvo.model.OrderItem;
import Ranex.ruvo.service.CashfreeService;
import Ranex.ruvo.service.CouponService;
import Ranex.ruvo.service.NotificationService;
import Ranex.ruvo.service.PricingService;
import Ranex.ruvo.service.WalletService;
import Ranex.ruvo.util.DistanceUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
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
    private final Ranex.ruvo.repository.OrderItemRepository orderItemRepository;
    private final CouponService couponService;
    private final WalletService walletService;
    private final CashfreeService cashfreeService;

    public PaymentController(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            ProductRepository productRepository,
            ShopRepository shopRepository,
            UserRepository userRepository,
            PricingService pricingService,
            NotificationService notificationService,
            Ranex.ruvo.repository.OrderItemRepository orderItemRepository,
            CouponService couponService,
            WalletService walletService,
            CashfreeService cashfreeService) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.pricingService = pricingService;
        this.notificationService = notificationService;
        this.orderItemRepository = orderItemRepository;
        this.couponService = couponService;
        this.walletService = walletService;
        this.cashfreeService = cashfreeService;
    }

    public static class CartItemRequest {
        public Long productId;
        public String productName;
        public Integer quantity;
        public Double price;
    }

    public static class CheckoutRequest {
        public String userId;
        public Long shopId;
        public Long productId;
        public String productName;
        public Integer quantity;
        public List<CartItemRequest> items;
        public String couponCode;
        public Boolean useWallet;
        public String paymentMethod; // COD or ONLINE
        public String deliveryAddress;
        public Double userLatitude;
        public Double userLongitude;
        public String customerName;
        public String customerPhone;
    }

    @PostMapping("/checkout")
    @Transactional
    public ResponseEntity<?> checkout(@RequestBody CheckoutRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Request body is required."));
        }
        if (request.userId == null || request.userId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId is required."));
        }
        if (request.shopId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "shopId is required."));
        }
        String requestedPaymentMethod = request.paymentMethod != null ? request.paymentMethod.trim().toUpperCase() : "COD";
        if (!"COD".equals(requestedPaymentMethod) && !"ONLINE".equals(requestedPaymentMethod)) {
            return ResponseEntity.badRequest().body(Map.of("message", "paymentMethod must be COD or ONLINE."));
        }

        Shop shop = shopRepository.findById(request.shopId).orElse(null);
        if (shop == null || !Boolean.TRUE.equals(shop.getApproved()) || !Boolean.TRUE.equals(shop.getActive())) {
            return ResponseEntity.status(403).body(Map.of("message", "This shop is currently unavailable."));
        }
        if ("COD".equals(requestedPaymentMethod) && Boolean.TRUE.equals(shop.getCodBlocked())) {
            return ResponseEntity.status(403).body(Map.of("message", "This shop is not accepting COD orders at the moment."));
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<CartItemRequest> cartItems = new ArrayList<>();
        List<Product> productsToUpdate = new ArrayList<>();

        if (request.items != null && !request.items.isEmpty()) {
            for (CartItemRequest itemReq : request.items) {
                if (itemReq.productId == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Every cart item requires productId."));
                }
                if (itemReq.quantity == null || itemReq.quantity <= 0) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Quantity must be greater than zero."));
                }
                Product p = productRepository.findById(itemReq.productId).orElse(null);
                if (p == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Product not found: " + itemReq.productName));
                }
                if (!request.shopId.equals(p.getShopId())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "All cart items must belong to the selected shop."));
                }
                if (Boolean.FALSE.equals(p.getIsAvailable())) {
                    return ResponseEntity.badRequest().body(Map.of("message", p.getName() + " is not available."));
                }
                if (p.getStockQuantity() == null || p.getStockQuantity() < itemReq.quantity) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Insufficient stock for " + p.getName() + ". Only " + p.getStockQuantity() + " left."));
                }
                BigDecimal price = BigDecimal.valueOf(p.getSellingPrice());
                BigDecimal itemTotal = price.multiply(BigDecimal.valueOf(itemReq.quantity));
                subtotal = subtotal.add(itemTotal);
                itemReq.productName = p.getName();
                itemReq.price = p.getSellingPrice();
                cartItems.add(itemReq);
                p.setStockQuantity(p.getStockQuantity() - itemReq.quantity);
                productsToUpdate.add(p);
            }
        } else if (request.productId != null) {
            if (request.quantity == null || request.quantity <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Quantity must be greater than zero."));
            }
            Product product = productRepository.findById(request.productId).orElse(null);
            if (product == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Product not found."));
            }
            if (!request.shopId.equals(product.getShopId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Product does not belong to the selected shop."));
            }
            if (Boolean.FALSE.equals(product.getIsAvailable())) {
                return ResponseEntity.badRequest().body(Map.of("message", product.getName() + " is not available."));
            }
            if (product.getStockQuantity() == null || product.getStockQuantity() < request.quantity) {
                return ResponseEntity.badRequest().body(Map.of("message", "Insufficient stock available. Only " + product.getStockQuantity() + " left."));
            }
            subtotal = BigDecimal.valueOf(product.getSellingPrice()).multiply(BigDecimal.valueOf(request.quantity));
            CartItemRequest itemReq = new CartItemRequest();
            itemReq.productId = product.getId();
            itemReq.productName = product.getName();
            itemReq.quantity = request.quantity;
            itemReq.price = product.getSellingPrice();
            cartItems.add(itemReq);
            product.setStockQuantity(product.getStockQuantity() - request.quantity);
            productsToUpdate.add(product);
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "No items or product specified for order."));
        }

        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);

        double distanceKm = 0.0;
        if (shop != null && shop.getLatitude() != null && shop.getLongitude() != null
                && request.userLatitude != null && request.userLongitude != null) {
            distanceKm = DistanceUtils.calculateDistance(
                    request.userLatitude, request.userLongitude,
                    shop.getLatitude(), shop.getLongitude()
            );
        }

        BigDecimal deliveryFee = BigDecimal.valueOf(pricingService.calculateDeliveryFee(distanceKm)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal platformFee = BigDecimal.valueOf(pricingService.calculatePlatformFee(distanceKm)).setScale(2, RoundingMode.HALF_UP);

        // Coupon calculation from DB
        BigDecimal couponDiscount = couponService.validateAndCalculateDiscount(request.couponCode, subtotal);

        // Gross total before wallet
        BigDecimal grossTotal = subtotal.add(deliveryFee).add(platformFee).subtract(couponDiscount);
        if (grossTotal.compareTo(BigDecimal.ZERO) < 0) {
            grossTotal = BigDecimal.ZERO;
        }

        // Wallet deduction
        BigDecimal walletAmountUsed = BigDecimal.ZERO;
        if (Boolean.TRUE.equals(request.useWallet) && request.userId != null) {
            BigDecimal walletBalance = walletService.getBalance(request.userId);
            walletAmountUsed = walletBalance.min(grossTotal).setScale(2, RoundingMode.HALF_UP);
            if (walletAmountUsed.compareTo(BigDecimal.ZERO) > 0) {
                walletService.debit(request.userId, walletAmountUsed, "ORDER-PENDING", "Applied to order checkout");
            }
        }

        BigDecimal finalTotalAmount = grossTotal.subtract(walletAmountUsed);
        if (finalTotalAmount.compareTo(BigDecimal.ZERO) < 0) {
            finalTotalAmount = BigDecimal.ZERO;
        }

        CartItemRequest primaryItem = cartItems.get(0);
        Product firstProduct = productRepository.findById(primaryItem.productId).orElse(null);

        Order order = new Order();
        order.setUserId(request.userId);
        order.setShopId(request.shopId);
        order.setProductId(primaryItem.productId);
        order.setProductName(primaryItem.productName);
        order.setProductImageUrl(firstProduct != null ? firstProduct.getImageUrl() : null);
        order.setQuantity(primaryItem.quantity);
        order.setSubtotal(subtotal);
        order.setDeliveryFee(deliveryFee);
        order.setPlatformFee(platformFee);
        order.setCouponCode(request.couponCode != null && couponDiscount.compareTo(BigDecimal.ZERO) > 0 ? request.couponCode : null);
        order.setCouponDiscount(couponDiscount);
        order.setWalletAmountUsed(walletAmountUsed);
        order.setDistanceKm(Math.round(distanceKm * 10.0) / 10.0);
        order.setTotalAmount(finalTotalAmount);
        order.setDeliveryAddress(request.deliveryAddress);
        order.setPaymentMethod(requestedPaymentMethod);

        // Deduct stock for all items
        for (Product p : productsToUpdate) {
            productRepository.save(p);
        }

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

        if ("COD".equals(requestedPaymentMethod)) {
            order.setPaymentStatus("COD_PENDING");
            order.setOrderStatus(OrderStatus.SHOP_PENDING);
            order.setShopResponseDeadline(Instant.now().plus(10, ChronoUnit.MINUTES));
            Order savedOrder = orderRepository.save(order);
            if (savedOrder.getDeliveryOtpHash() == null) {
                String otp = String.format("%04d", Math.abs(savedOrder.getId().hashCode()) % 9000 + 1000);
                savedOrder.setDeliveryOtpHash(otp);
                savedOrder = orderRepository.save(savedOrder);
            }

            // Save OrderItem records for multi-item cart
            for (CartItemRequest itemReq : cartItems) {
                OrderItem item = OrderItem.builder()
                        .orderId(savedOrder.getId())
                        .productId(itemReq.productId)
                        .productName(itemReq.productName)
                        .priceAtOrder(itemReq.price)
                        .quantity(itemReq.quantity)
                        .build();
                orderItemRepository.save(item);
            }

            Payment payment = Payment.builder()
                    .orderId(savedOrder.getId())
                    .userId(request.userId)
                    .paymentMethod("COD")
                    .paymentStatus("COD_PENDING")
                    .amount(savedOrder.getTotalAmount())
                    .currency("INR")
                    .build();
            paymentRepository.save(payment);

            notificationService.notifyShop(savedOrder);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "orderId", savedOrder.getId(),
                    "paymentMethod", "COD",
                    "message", "Order placed successfully via Cash on Delivery!"
            ));
        } else {
            order.setPaymentStatus("PENDING");
            order.setOrderStatus(OrderStatus.PAYMENT_PENDING);
            Order savedOrder = orderRepository.save(order);

            // Save OrderItem records for multi-item cart
            for (CartItemRequest itemReq : cartItems) {
                OrderItem item = OrderItem.builder()
                        .orderId(savedOrder.getId())
                        .productId(itemReq.productId)
                        .productName(itemReq.productName)
                        .priceAtOrder(itemReq.price)
                        .quantity(itemReq.quantity)
                        .build();
                orderItemRepository.save(item);
            }

            try {
                String cfOrderId = "CF-ORD-" + savedOrder.getId() + "-" + System.currentTimeMillis();
                String returnUrl = cashfreeService.buildReturnUrl(savedOrder.getId());
                Map<String, Object> cfRes = cashfreeService.createOrder(
                        cfOrderId, savedOrder.getTotalAmount(), savedOrder.getSubtotal(), null, request.userId, customerPhone, "customer@ruvo.in", returnUrl
                );

                Payment payment = Payment.builder()
                        .orderId(savedOrder.getId())
                        .userId(request.userId)
                        .paymentMethod("ONLINE")
                        .paymentStatus("PENDING")
                        .amount(savedOrder.getTotalAmount())
                        .currency("INR")
                        .cashfreeOrderId(cfOrderId)
                        .build();
                paymentRepository.save(payment);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "orderId", savedOrder.getId(),
                        "paymentMethod", "ONLINE",
                        "cashfreeOrderId", cfOrderId,
                        "paymentSessionId", cfRes.get("payment_session_id"),
                        "amount", savedOrder.getTotalAmount()
                ));
            } catch (Exception e) {
                savedOrder.setPaymentStatus("FAILED");
                savedOrder.setOrderStatus("PAYMENT_FAILED");
                orderRepository.save(savedOrder);
                restoreReservedStock(cartItems);
                if (walletAmountUsed.compareTo(BigDecimal.ZERO) > 0) {
                    walletService.credit(request.userId, walletAmountUsed, "ORDER-FAILED-" + savedOrder.getId(), "Refund wallet debit after payment initialization failure");
                }

                return ResponseEntity.internalServerError().body(Map.of("message", "Failed to create Cashfree payment order: " + e.getMessage()));
            }
        }
    }

    @PostMapping("/fail")
    @Transactional
    public ResponseEntity<?> failPayment(@RequestBody Map<String, Long> payload) {
        Long orderId = payload.get("orderId");
        if (orderId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "OrderId required."));
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            if ("SUCCESS".equalsIgnoreCase(order.getPaymentStatus()) || "DELIVERED".equalsIgnoreCase(order.getOrderStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Successful or delivered orders cannot be marked failed."));
            }
            boolean alreadyFailed = "FAILED".equalsIgnoreCase(order.getPaymentStatus())
                    || "PAYMENT_FAILED".equalsIgnoreCase(order.getPaymentStatus())
                    || "PAYMENT_FAILED".equalsIgnoreCase(order.getOrderStatus());
            order.setPaymentStatus("FAILED");
            order.setOrderStatus("PAYMENT_FAILED");
            orderRepository.save(order);
            if (!alreadyFailed) {
                restoreReservedStock(order.getId());
                if (order.getWalletAmountUsed() != null && order.getWalletAmountUsed().compareTo(BigDecimal.ZERO) > 0) {
                    walletService.credit(order.getUserId(), order.getWalletAmountUsed(), "ORDER-FAILED-" + order.getId(), "Refund wallet debit after failed payment");
                }
            }

            Optional<Payment> paymentOpt = paymentRepository.findByOrderId(order.getId());
            if (paymentOpt.isPresent()) {
                Payment payment = paymentOpt.get();
                payment.setPaymentStatus("FAILED");
                paymentRepository.save(payment);
            }
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Payment marked as failed."));
    }

    private void restoreReservedStock(List<CartItemRequest> cartItems) {
        for (CartItemRequest item : cartItems) {
            productRepository.findById(item.productId).ifPresent(product -> {
                product.setStockQuantity(product.getStockQuantity() + item.quantity);
                productRepository.save(product);
            });
        }
    }

    private void restoreReservedStock(Long orderId) {
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        for (OrderItem item : items) {
            productRepository.findById(item.getProductId()).ifPresent(product -> {
                product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                productRepository.save(product);
            });
        }
    }
}
