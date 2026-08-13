package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OrderController(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
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
}
