package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderItem;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.model.Delivery;
import Ranex.ruvo.model.User;
import Ranex.ruvo.model.RefundReason;
import Ranex.ruvo.repository.OrderItemRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.repository.DeliveryRepository;
import Ranex.ruvo.repository.UserRepository;
import Ranex.ruvo.service.PricingService;
import Ranex.ruvo.service.RefundService;
import Ranex.ruvo.util.DistanceUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final OrderItemRepository orderItemRepository;
    private final PricingService pricingService;
    private final Ranex.ruvo.service.DeliveryService deliveryService;
    private final Ranex.ruvo.service.NotificationService notificationService;
    private final Ranex.ruvo.repository.DeliveryPartnerRepository deliveryPartnerRepository;
    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final Ranex.ruvo.repository.DeliveryRequestRepository deliveryRequestRepository;
    private final RefundService refundService;

    public OrderController(OrderRepository orderRepository,
                           ProductRepository productRepository,
                           ShopRepository shopRepository,
                           OrderItemRepository orderItemRepository,
                           PricingService pricingService,
                           Ranex.ruvo.service.DeliveryService deliveryService,
                           Ranex.ruvo.service.NotificationService notificationService,
                           Ranex.ruvo.repository.DeliveryPartnerRepository deliveryPartnerRepository,
                           DeliveryRepository deliveryRepository,
                           UserRepository userRepository,
                           Ranex.ruvo.repository.DeliveryRequestRepository deliveryRequestRepository,
                           RefundService refundService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
        this.orderItemRepository = orderItemRepository;
        this.pricingService = pricingService;
        this.deliveryService = deliveryService;
        this.notificationService = notificationService;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.deliveryRepository = deliveryRepository;
        this.userRepository = userRepository;
        this.deliveryRequestRepository = deliveryRequestRepository;
        this.refundService = refundService;
    }

    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody Order order) {
        
        // 1. Verify Shop is available
        Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
        if (shop == null || shop.getApproved() == null || !shop.getApproved() || shop.getActive() == null || !shop.getActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "code", "SHOP_UNAVAILABLE",
                    "message", "This shop is currently unavailable."
            ));
        }

        // 1b. Settlement-blocked guard (Phase 14)
        if (Boolean.TRUE.equals(shop.getSettlementBlocked())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "code", "SHOP_SETTLEMENT_BLOCKED",
                    "message", "This shop is temporarily unavailable in your area."
            ));
        }

        // 1c. COD-blocked guard (commission overdue)
        if ("COD".equalsIgnoreCase(order.getPaymentMethod()) && Boolean.TRUE.equals(shop.getCodBlocked())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "code", "SHOP_COD_BLOCKED",
                    "message", "This shop is not accepting COD orders at the moment."
            ));
        }

        // 2. Validate customer location & get distance
        if (order.getDeliveryLatitude() == null || order.getDeliveryLongitude() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "MISSING_LOCATION",
                    "message", "Delivery latitude and longitude are required."
            ));
        }

        double distanceKm = 0.0;
        if (shop.getLatitude() != null && shop.getLongitude() != null) {
            distanceKm = DistanceUtils.calculateDistance(
                    order.getDeliveryLatitude(), order.getDeliveryLongitude(),
                    shop.getLatitude(), shop.getLongitude()
            );

            if (!DistanceUtils.isServiceable(distanceKm)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "code", "SERVICE_UNAVAILABLE",
                        "message", "We are not in your area right now"
                ));
            }
        }

        Product product = productRepository.findById(order.getProductId()).orElse(null);

        if (product == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Product not found."));
        }

        if (product.getStockQuantity() < order.getQuantity()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Insufficient stock available. Only " + product.getStockQuantity() + " left."));
        }

        // Deduct stock
        product.setStockQuantity(product.getStockQuantity() - order.getQuantity());
        productRepository.save(product);

        // Compute Pricing Securely
        double deliveryFee = pricingService.calculateDeliveryFee(distanceKm);
        double platformFee = pricingService.calculatePlatformFee(distanceKm);
        double subtotal = product.getSellingPrice() * order.getQuantity();
        double totalAmount = subtotal + deliveryFee + platformFee;

        order.setProductImageUrl(product.getImageUrl());
        order.setDistanceKm(Math.round(distanceKm * 10.0) / 10.0);
        order.setDeliveryFee(java.math.BigDecimal.valueOf(deliveryFee).setScale(2, java.math.RoundingMode.HALF_UP));
        order.setPlatformFee(java.math.BigDecimal.valueOf(platformFee).setScale(2, java.math.RoundingMode.HALF_UP));
        order.setSubtotal(java.math.BigDecimal.valueOf(subtotal).setScale(2, java.math.RoundingMode.HALF_UP));
        order.setTotalAmount(java.math.BigDecimal.valueOf(totalAmount).setScale(2, java.math.RoundingMode.HALF_UP));

        // Set status
        order.setOrderStatus(OrderStatus.SHOP_PENDING);
        order.setShopResponseDeadline(Instant.now().plus(10, ChronoUnit.MINUTES));

        // Save order
        Order saved = orderRepository.save(order);
        if (saved.getDeliveryOtpHash() == null) {
            String otp = String.format("%04d", Math.abs(saved.getId().hashCode()) % 9000 + 1000);
            saved.setDeliveryOtpHash(otp);
            saved = orderRepository.save(saved);
        }

        // Create OrderItem snapshots
        if (order.getItems() != null && !order.getItems().isEmpty()) {
            for (OrderItem reqItem : order.getItems()) {
                OrderItem item = OrderItem.builder()
                        .orderId(saved.getId())
                        .productId(reqItem.getProductId())
                        .productName(reqItem.getProductName())
                        .priceAtOrder(reqItem.getPriceAtOrder() != null ? reqItem.getPriceAtOrder() : 0.0)
                        .quantity(reqItem.getQuantity() != null ? reqItem.getQuantity() : 1)
                        .build();
                orderItemRepository.save(item);
                
                // Deduct stock for each additional cart item (primary item was already deducted)
                if (!reqItem.getProductId().equals(product.getId())) {
                    productRepository.findById(reqItem.getProductId()).ifPresent(extraProduct -> {
                        if (extraProduct.getStockQuantity() >= item.getQuantity()) {
                            extraProduct.setStockQuantity(extraProduct.getStockQuantity() - item.getQuantity());
                            productRepository.save(extraProduct);
                        }
                    });
                }
            }
        } else {
            OrderItem item = OrderItem.builder()
                    .orderId(saved.getId())
                    .productId(product.getId())
                    .productName(product.getName())
                    .priceAtOrder(product.getSellingPrice())
                    .quantity(saved.getQuantity())
                    .build();
            orderItemRepository.save(item);
        }

        // Phase 5 - Notify shopkeeper
        notificationService.notifyShop(saved);

        return ResponseEntity.ok(Map.of("success", true, "orderId", saved.getId(), "message", "Order placed successfully!"));
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<Order>> getMyOrders(@RequestParam String userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        List<Order> validOrders = new ArrayList<>();

        for (Order o : orders) {
            // Filter out failed payment orders so customer side is clean
            if ("PAYMENT_FAILED".equalsIgnoreCase(o.getPaymentStatus()) ||
                "FAILED".equalsIgnoreCase(o.getPaymentStatus()) ||
                "PAYMENT_FAILED".equalsIgnoreCase(o.getOrderStatus()) ||
                "FAILED".equalsIgnoreCase(o.getOrderStatus())) {
                continue;
            }

            // Check 10-minute timeout for delivery partner assignment
            checkAndTimeoutOrder(o);

            if ((o.getProductImageUrl() == null || o.getProductImageUrl().isEmpty()) && o.getProductId() != null) {
                productRepository.findById(o.getProductId()).ifPresent(p -> {
                    o.setProductImageUrl(p.getImageUrl());
                    orderRepository.save(o);
                });
            }
            
            // Enrich with items list
            List<OrderItem> items = orderItemRepository.findByOrderId(o.getId());
            if (items != null && !items.isEmpty()) {
                o.setItems(items);
            }
            
            validOrders.add(o);
        }
        return ResponseEntity.ok(validOrders);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        checkAndTimeoutOrder(order);

        final Order finalOrder = order;
        if ((finalOrder.getProductImageUrl() == null || finalOrder.getProductImageUrl().isEmpty()) && finalOrder.getProductId() != null) {
            productRepository.findById(finalOrder.getProductId()).ifPresent(p -> {
                finalOrder.setProductImageUrl(p.getImageUrl());
                orderRepository.save(finalOrder);
            });
        }
        
        // Enrich with items list
        List<OrderItem> items = orderItemRepository.findByOrderId(finalOrder.getId());
        if (items != null && !items.isEmpty()) {
            finalOrder.setItems(items);
        }
        
        return ResponseEntity.ok(finalOrder);
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<Order>> getShopOrders(@PathVariable Long shopId) {
        List<Order> orders = orderRepository.findByShopId(shopId);
        for (Order o : orders) {
            checkAndTimeoutOrder(o);
            if ((o.getProductImageUrl() == null || o.getProductImageUrl().isEmpty()) && o.getProductId() != null) {
                productRepository.findById(o.getProductId()).ifPresent(p -> {
                    o.setProductImageUrl(p.getImageUrl());
                    orderRepository.save(o);
                });
            }
            
            // Enrich with items list
            List<OrderItem> items = orderItemRepository.findByOrderId(o.getId());
            if (items != null && !items.isEmpty()) {
                o.setItems(items);
            }
        }
        return ResponseEntity.ok(orders);
    }

    private void checkAndTimeoutOrder(Order order) {
        if (order == null || order.getOrderStatus() == null) return;

        // 1. Shopkeeper response timeout (10 minutes)
        if (OrderStatus.SHOP_PENDING.equalsIgnoreCase(order.getOrderStatus())) {
            Instant deadline = order.getShopResponseDeadline();
            Instant refTime = order.getCreatedAt() != null ? order.getCreatedAt() : Instant.now();
            boolean timedOut = (deadline != null && Instant.now().isAfter(deadline)) ||
                               Instant.now().isAfter(refTime.plus(10, ChronoUnit.MINUTES));
            if (timedOut) {
                order.setOrderStatus(OrderStatus.SHOP_TIMEOUT);
                // Restore product stock
                if (order.getProductId() != null && order.getQuantity() != null) {
                    productRepository.findById(order.getProductId()).ifPresent(p -> {
                        p.setStockQuantity(p.getStockQuantity() + order.getQuantity());
                        productRepository.save(p);
                    });
                }
                orderRepository.save(order);
                
                // Trigger refund for online payments
                try {
                    refundService.autoRefundIfEligible(order);
                } catch (Exception e) {
                    System.err.println("Failed to process refund for order " + order.getId() + ": " + e.getMessage());
                }
                
                notificationService.notifyCustomer(order, "Order Cancelled",
                    "The shop did not accept your order in time. Your order has been cancelled.", OrderStatus.SHOP_TIMEOUT);
                return;
            }
        }

        // 2. Delivery Partner Assignment Timeout
        if (order.getDeliveryPartnerId() == null &&
            (OrderStatus.DELIVERY_ASSIGNMENT.equalsIgnoreCase(order.getOrderStatus()) ||
             OrderStatus.SHOP_ACCEPTED.equalsIgnoreCase(order.getOrderStatus()))) {
            Instant refTime = order.getUpdatedAt() != null ? order.getUpdatedAt() : order.getCreatedAt();
            if (refTime != null && Instant.now().isAfter(refTime.plus(10, ChronoUnit.MINUTES))) {
                order.setOrderStatus("CANCELLED_NO_PARTNER_FOUND");
                // Restore product stock
                if (order.getProductId() != null && order.getQuantity() != null) {
                    productRepository.findById(order.getProductId()).ifPresent(p -> {
                        p.setStockQuantity(p.getStockQuantity() + order.getQuantity());
                        productRepository.save(p);
                    });
                }
                orderRepository.save(order);
                
                // Trigger refund for online payments
                try {
                    refundService.autoRefundIfEligible(order);
                } catch (Exception e) {
                    System.err.println("Failed to process refund for order " + order.getId() + ": " + e.getMessage());
                }
                
                notificationService.notifyCustomer(order, "Order Cancelled",
                    "No delivery partner could be assigned within 10 minutes.", "CANCELLED_NO_PARTNER_FOUND");
            }
        }
    }

    @PostMapping("/{orderId}/cancel-by-shopkeeper")
    public ResponseEntity<?> cancelByShopkeeper(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        // Allow cancellation if order is PENDING, ACCEPTED, or in DELIVERY_ASSIGNMENT before pickup
        if (OrderStatus.DELIVERY_ASSIGNED.equalsIgnoreCase(order.getOrderStatus()) ||
            "PICKED_UP".equalsIgnoreCase(order.getOrderStatus()) ||
            "DELIVERED".equalsIgnoreCase(order.getOrderStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot cancel order after delivery partner has picked it up."));
        }

        order.setOrderStatus("CANCELLED_BY_SHOP");
        // Restore stock
        if (order.getProductId() != null && order.getQuantity() != null) {
            productRepository.findById(order.getProductId()).ifPresent(p -> {
                p.setStockQuantity(p.getStockQuantity() + order.getQuantity());
                productRepository.save(p);
            });
        }
        orderRepository.save(order);

        // Trigger refund for online payments
        try {
            refundService.autoRefundIfEligible(order);
        } catch (Exception e) {
            // Log error but don't fail the cancellation
            System.err.println("Failed to process refund for order " + orderId + ": " + e.getMessage());
        }

        notificationService.notifyCustomer(order, "Order Cancelled by Shop",
            "The shopkeeper had to cancel this order. If paid, your refund will be processed.", "CANCELLED_BY_SHOP");

        return ResponseEntity.ok(Map.of("success", true, "message", "Order cancelled successfully"));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrderByUser(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        String status = order.getOrderStatus() != null ? order.getOrderStatus().toUpperCase() : "";

        // Check if order has already been picked up or delivered
        if ("PICKED_UP".equals(status) || "OUT_FOR_DELIVERY".equals(status) || "DELIVERED".equals(status)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot cancel order after delivery partner has picked it up."));
        }

        if (status.startsWith("CANCELLED")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order is already cancelled."));
        }

        order.setOrderStatus("CANCELLED_BY_USER");

        // Restore product stock
        if (order.getProductId() != null && order.getQuantity() != null) {
            productRepository.findById(order.getProductId()).ifPresent(p -> {
                p.setStockQuantity(p.getStockQuantity() + order.getQuantity());
                productRepository.save(p);
            });
        }
        orderRepository.save(order);

        // Trigger refund for online payments
        try {
            refundService.autoRefundIfEligible(order);
        } catch (Exception e) {
            // Log error but don't fail the cancellation
            System.err.println("Failed to process refund for order " + orderId + ": " + e.getMessage());
        }

        notificationService.notifyCustomer(order, "Order Cancelled",
            "Your order #" + order.getId() + " has been cancelled successfully.", "CANCELLED_BY_USER");

        return ResponseEntity.ok(Map.of("success", true, "message", "Order cancelled successfully"));
    }

    @PostMapping("/{orderId}/accept")
    public ResponseEntity<?> acceptOrder(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        if (!OrderStatus.SHOP_PENDING.equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order is not in PENDING state"));
        }

        order.setOrderStatus(OrderStatus.SHOP_ACCEPTED);
        orderRepository.save(order);

        // Start delivery assignment process
        order.setOrderStatus(OrderStatus.DELIVERY_ASSIGNMENT);
        orderRepository.save(order);
        try {
            deliveryService.findAndAssignNextPartner(order);
        } catch (Exception e) {
            // Log and handle
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Order accepted"));
    }

    @PostMapping("/{orderId}/reject")
    public ResponseEntity<?> rejectOrder(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        if (!OrderStatus.SHOP_PENDING.equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order is not in PENDING state"));
        }

        order.setOrderStatus(OrderStatus.SHOP_REJECTED);
        orderRepository.save(order);

        // Trigger refund logic for online payments

        notificationService.notifyCustomer(order, "Order Cancelled", "Your order was not accepted by the shop.", "SHOP_REJECTED");
        return ResponseEntity.ok(Map.of("success", true, "message", "Order rejected"));
    }

    @GetMapping("/shop/{shopId}/delivery-partners")
    public ResponseEntity<?> getShopDeliveryPartners(@PathVariable Long shopId, @RequestParam(required = false) Long orderId) {
        Shop shop = shopRepository.findById(shopId).orElse(null);
        Double shopLat = shop != null ? shop.getLatitude() : null;
        Double shopLng = shop != null ? shop.getLongitude() : null;

        Map<Long, String> requestStatusMap = new HashMap<>();
        if (orderId != null) {
            List<Ranex.ruvo.model.DeliveryRequest> requests = deliveryRequestRepository.findByOrderId(orderId);
            for (Ranex.ruvo.model.DeliveryRequest req : requests) {
                if (req.getPartnerId() != null) {
                    requestStatusMap.put(req.getPartnerId(), req.getStatus());
                }
            }
        }

        List<Ranex.ruvo.model.DeliveryPartner> allPartners = deliveryPartnerRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Ranex.ruvo.model.DeliveryPartner p : allPartners) {
            if (!Boolean.TRUE.equals(p.getActive()) ||
                !Boolean.TRUE.equals(p.getApproved()) ||
                !Boolean.TRUE.equals(p.getAvailable())) {
                continue;
            }
            if (p.getShopId() != null && !p.getShopId().equals(shopId)) {
                continue;
            }

            // If orderId was specified and requests exist, show ONLY partners who received a delivery request for this order!
            if (orderId != null && !requestStatusMap.isEmpty() && !requestStatusMap.containsKey(p.getId())) {
                continue;
            }

            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("name", p.getName());
            map.put("phone", p.getPhone());
            map.put("latitude", p.getLatitude());
            map.put("longitude", p.getLongitude());
            map.put("locationName", p.getLocationName() != null ? p.getLocationName() : "Live Location");
            map.put("available", p.getAvailable());
            map.put("approved", p.getApproved());
            map.put("active", p.getActive());
            if (requestStatusMap.containsKey(p.getId())) {
                map.put("requestStatus", requestStatusMap.get(p.getId()));
            }

            double distanceKm = 999.0;
            if (shopLat != null && shopLng != null && p.getLatitude() != null && p.getLongitude() != null) {
                distanceKm = DistanceUtils.calculateDistance(shopLat, shopLng, p.getLatitude(), p.getLongitude());
                distanceKm = Math.round(distanceKm * 10.0) / 10.0;
            }
            map.put("distanceKm", distanceKm);
            result.add(map);
        }

        // Sort by nearest driver first
        result.sort((a, b) -> Double.compare((Double) a.get("distanceKm"), (Double) b.get("distanceKm")));

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{orderId}/assign-partner")
    public ResponseEntity<?> assignPartnerManually(@PathVariable Long orderId, @RequestParam Long partnerId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        if (!OrderStatus.SHOP_ACCEPTED.equals(order.getOrderStatus()) &&
            !OrderStatus.DELIVERY_ASSIGNMENT.equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order is not in assignment state"));
        }

        Ranex.ruvo.model.DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId).orElse(null);
        if (partner == null) return ResponseEntity.badRequest().body(Map.of("message", "Partner not found"));

        order.setDeliveryPartnerId(partnerId);
        order.setOrderStatus(OrderStatus.DELIVERY_ASSIGNED);
        orderRepository.save(order);

        notificationService.notifyCustomer(order, "Delivery Assigned",
            partner.getName() + " is picking up your order. Contact: " + partner.getPhone(), "DELIVERY_ASSIGNED");

        return ResponseEntity.ok(Map.of("success", true, "partner", partner.getName()));
    }

    @GetMapping("/{orderId}/partner")
    public ResponseEntity<?> getOrderPartner(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if (order.getDeliveryPartnerId() == null) return ResponseEntity.ok(Map.of("assigned", false));
        Ranex.ruvo.model.DeliveryPartner partner = deliveryPartnerRepository.findById(order.getDeliveryPartnerId()).orElse(null);
        if (partner == null) return ResponseEntity.ok(Map.of("assigned", false));

        Map<String, Object> map = new HashMap<>();
        map.put("assigned", true);
        map.put("id", partner.getId());
        map.put("name", partner.getName());
        map.put("phone", partner.getPhone());
        map.put("latitude", partner.getLatitude());
        map.put("longitude", partner.getLongitude());
        map.put("locationName", partner.getLocationName() != null ? partner.getLocationName() : "En route");
        map.put("active", partner.getActive() != null ? partner.getActive() : true);
        map.put("available", partner.getAvailable() != null ? partner.getAvailable() : true);
        return ResponseEntity.ok(map);
    }

    @PostMapping("/{orderId}/mark-cash-received")
    public ResponseEntity<?> markCashReceived(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        order.setPaymentStatus("PAID");
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of("success", true, "message", "Cash marked as received!"));
    }

    @PostMapping("/shop/{shopId}/partner/{partnerId}/settle-cod")
    public ResponseEntity<?> settlePartnerCodCash(@PathVariable Long shopId, @PathVariable Long partnerId) {
        List<Order> orders = orderRepository.findByShopId(shopId);
        int updatedCount = 0;
        for (Order o : orders) {
            if (partnerId.equals(o.getDeliveryPartnerId()) && !"PAID".equalsIgnoreCase(o.getPaymentStatus())) {
                o.setPaymentStatus("PAID");
                orderRepository.save(o);
                updatedCount++;
            }
        }
        return ResponseEntity.ok(Map.of("success", true, "count", updatedCount, "message", "Settled " + updatedCount + " orders from partner!"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestParam String status) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order not found."));
        }
        order.setOrderStatus(status);
        orderRepository.save(order);

        // Automatically create delivery record if READY_FOR_PICKUP
        if ("READY_FOR_PICKUP".equalsIgnoreCase(status)) {
            Optional<Delivery> existingDelivery = deliveryRepository.findByOrderId(order.getId());
            if (existingDelivery.isEmpty()) {
                String pickup = "Shop address";
                Optional<Shop> shopOpt = shopRepository.findById(order.getShopId());
                if (shopOpt.isPresent()) {
                    Shop shop = shopOpt.get();
                    pickup = shop.getName() + ", " + shop.getAddress();
                }
                Delivery delivery = Delivery.builder()
                        .orderId(order.getId())
                        .pickupLocation(pickup)
                        .deliveryLocation(order.getDeliveryAddress())
                        .status("CREATED")
                        .deliveryFee(50.0)
                        .build();
                deliveryRepository.save(delivery);
            }
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Order status updated to " + status));
    }

    @GetMapping("/{id}/delivery")
    public ResponseEntity<?> getOrderDelivery(@PathVariable Long id) {
        Optional<Delivery> deliveryOpt = deliveryRepository.findByOrderId(id);
        if (deliveryOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("hasDelivery", false));
        }
        Delivery delivery = deliveryOpt.get();
        Map<String, Object> result = new HashMap<>();
        result.put("hasDelivery", true);
        result.put("deliveryId", delivery.getId());
        result.put("status", delivery.getStatus());
        result.put("pickupLocation", delivery.getPickupLocation());
        result.put("deliveryLocation", delivery.getDeliveryLocation());
        result.put("deliveryFee", delivery.getDeliveryFee());

        if (delivery.getPartnerId() != null) {
            Optional<User> partnerOpt = userRepository.findById(delivery.getPartnerId());
            if (partnerOpt.isPresent()) {
                User partner = partnerOpt.get();
                result.put("partnerName", partner.getName());
                result.put("partnerMobile", partner.getMobileNumber());
            }
        }
        return ResponseEntity.ok(result);
    }
}
