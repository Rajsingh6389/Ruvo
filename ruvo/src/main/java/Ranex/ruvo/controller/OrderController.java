package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderItem;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.repository.OrderItemRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.service.PricingService;
import Ranex.ruvo.util.DistanceUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final OrderItemRepository orderItemRepository;
    private final PricingService pricingService;

    public OrderController(OrderRepository orderRepository,
                           ProductRepository productRepository,
                           ShopRepository shopRepository,
                           OrderItemRepository orderItemRepository,
                           PricingService pricingService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
        this.orderItemRepository = orderItemRepository;
        this.pricingService = pricingService;
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

        // TODO: Phase 5 - Call NotificationService to notify shopkeeper

        return ResponseEntity.ok(Map.of("success", true, "orderId", saved.getId(), "message", "Order placed successfully!"));
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<Order>> getMyOrders(@RequestParam String userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        return ResponseEntity.ok(orders);
    }
}
