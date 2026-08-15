package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Delivery;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.DeliveryRepository;
import Ranex.ruvo.repository.ShopRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import Ranex.ruvo.model.User;
import Ranex.ruvo.repository.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final DeliveryRepository deliveryRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    public OrderController(OrderRepository orderRepository, ProductRepository productRepository,
                           DeliveryRepository deliveryRepository, ShopRepository shopRepository,
                           UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.deliveryRepository = deliveryRepository;
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody Order order) {
        Product product = productRepository.findById(order.getProductId())
                .orElse(null);

        if (product == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Product not found."));
        }

        if (product.getStockQuantity() < order.getQuantity()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Insufficient stock available. Only " + product.getStockQuantity() + " left."));
        }

        // Deduct stock
        product.setStockQuantity(product.getStockQuantity() - order.getQuantity());
        productRepository.save(product);

        // Save order
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(Map.of("success", true, "orderId", saved.getId(), "message", "Order placed successfully via Cash on Delivery!"));
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<Order>> getMyOrders(@RequestParam String userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<Order>> getShopOrders(@PathVariable Long shopId) {
        List<Order> orders = orderRepository.findByShopId(shopId);
        return ResponseEntity.ok(orders);
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
