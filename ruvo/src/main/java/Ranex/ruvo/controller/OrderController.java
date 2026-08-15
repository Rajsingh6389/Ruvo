package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderItem;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.model.Delivery;
import Ranex.ruvo.model.User;
import Ranex.ruvo.repository.OrderItemRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.repository.DeliveryRepository;
import Ranex.ruvo.repository.UserRepository;
import Ranex.ruvo.service.PricingService;
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

    public OrderController(OrderRepository orderRepository,
                           ProductRepository productRepository,
                           ShopRepository shopRepository,
                           OrderItemRepository orderItemRepository,
                           PricingService pricingService,
                           Ranex.ruvo.service.DeliveryService deliveryService,
                           Ranex.ruvo.service.NotificationService notificationService,
                           Ranex.ruvo.repository.DeliveryPartnerRepository deliveryPartnerRepository,
                           DeliveryRepository deliveryRepository,
                           UserRepository userRepository) {
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
        order.setDeliveryFee(deliveryFee);
        order.setPlatformFee(platformFee);
        order.setSubtotal(Math.round(subtotal * 100.0) / 100.0);
        order.setTotalAmount(Math.round(totalAmount * 100.0) / 100.0);

        // Set status
        order.setOrderStatus(OrderStatus.SHOP_PENDING);
        order.setShopResponseDeadline(Instant.now().plus(10, ChronoUnit.MINUTES));

        // Save order
        Order saved = orderRepository.save(order);

        // Create OrderItem snapshot
        OrderItem item = OrderItem.builder()
                .orderId(saved.getId())
                .productId(product.getId())
                .productName(product.getName())
                .priceAtOrder(product.getSellingPrice())
                .quantity(saved.getQuantity())
                .build();
        orderItemRepository.save(item);

        // Phase 5 - Notify shopkeeper
        notificationService.notifyShop(saved);

        return ResponseEntity.ok(Map.of("success", true, "orderId", saved.getId(), "message", "Order placed successfully!"));
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<Order>> getMyOrders(@RequestParam String userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        for (Order o : orders) {
            if ((o.getProductImageUrl() == null || o.getProductImageUrl().isEmpty()) && o.getProductId() != null) {
                productRepository.findById(o.getProductId()).ifPresent(p -> {
                    o.setProductImageUrl(p.getImageUrl());
                    orderRepository.save(o);
                });
            }
        }
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if ((order.getProductImageUrl() == null || order.getProductImageUrl().isEmpty()) && order.getProductId() != null) {
            productRepository.findById(order.getProductId()).ifPresent(p -> {
                order.setProductImageUrl(p.getImageUrl());
                orderRepository.save(order);
            });
        }
        return ResponseEntity.ok(order);
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<Order>> getShopOrders(@PathVariable Long shopId) {
        // Validate that the authenticated user owns this shop
        List<Order> orders = orderRepository.findByShopId(shopId);
        for (Order o : orders) {
            if ((o.getProductImageUrl() == null || o.getProductImageUrl().isEmpty()) && o.getProductId() != null) {
                productRepository.findById(o.getProductId()).ifPresent(p -> {
                    o.setProductImageUrl(p.getImageUrl());
                    orderRepository.save(o);
                });
            }
        }
        return ResponseEntity.ok(orders);
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
    public ResponseEntity<?> getShopDeliveryPartners(@PathVariable Long shopId) {
        java.util.List<Ranex.ruvo.model.DeliveryPartner> partners =
            deliveryPartnerRepository.findByShopIdAndApprovedTrueAndActiveTrueAndAvailableTrue(shopId);
        return ResponseEntity.ok(partners);
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
        return ResponseEntity.ok(Map.of("assigned", true, "name", partner.getName(), "phone", partner.getPhone()));
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
