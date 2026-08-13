package Ranex.ruvo.controller;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.Payment;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.PaymentRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.service.RazorpayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final RazorpayService razorpayService;

    public PaymentController(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            ProductRepository productRepository,
            RazorpayService razorpayService) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.razorpayService = razorpayService;
    }

    // Request DTO for Checkout
    public static class CheckoutRequest {
        public String userId;
        public Long shopId;
        public Long productId;
        public String productName;
        public Integer quantity;
        public String paymentMethod; // COD or ONLINE
        public String deliveryAddress;
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

        // Trust server-side price calculation
        Double totalAmount = product.getSellingPrice() * request.quantity;

        // 1. Create the Order in PENDING status
        Order order = new Order();
        order.setUserId(request.userId);
        order.setShopId(request.shopId);
        order.setProductId(request.productId);
        order.setProductName(request.productName);
        order.setQuantity(request.quantity);
        order.setTotalAmount(totalAmount);
        order.setPaymentMethod(request.paymentMethod);
        order.setDeliveryAddress(request.deliveryAddress);

        if ("COD".equalsIgnoreCase(request.paymentMethod)) {
            // Deduct stock immediately for COD
            product.setStockQuantity(product.getStockQuantity() - request.quantity);
            productRepository.save(product);

            order.setPaymentStatus("PENDING");
            order.setOrderStatus("CONFIRMED");
            Order savedOrder = orderRepository.save(order);

            // Log payment
            Payment payment = Payment.builder()
                    .orderId(savedOrder.getId())
                    .userId(request.userId)
                    .paymentMethod("COD")
                    .paymentStatus("COD_PENDING")
                    .amount(totalAmount)
                    .currency("INR")
                    .build();
            paymentRepository.save(payment);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "orderId", savedOrder.getId(),
                    "paymentMethod", "COD",
                    "message", "Order placed successfully via Cash on Delivery!"
            ));
        } else {
            // Online Payment Flow (Razorpay)
            order.setPaymentStatus("PENDING");
            order.setOrderStatus("PAYMENT_PENDING");
            Order savedOrder = orderRepository.save(order);

            try {
                // Initialize Razorpay Order
                com.razorpay.Order rzpOrder = razorpayService.createOrder(totalAmount, "receipt_order_" + savedOrder.getId());
                String rzpOrderId = rzpOrder.get("id");

                // Log pending payment
                Payment payment = Payment.builder()
                        .orderId(savedOrder.getId())
                        .userId(request.userId)
                        .paymentMethod("ONLINE")
                        .paymentStatus("PENDING")
                        .amount(totalAmount)
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
                        "amount", totalAmount,
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
            if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
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

            // Update order status
            order.setPaymentStatus("PAID");
            order.setOrderStatus("CONFIRMED");
            orderRepository.save(order);

            // Update payment transaction logs
            Optional<Payment> paymentOpt = paymentRepository.findByOrderId(order.getId());
            if (paymentOpt.isPresent()) {
                Payment payment = paymentOpt.get();
                payment.setPaymentStatus("SUCCESS");
                payment.setGatewayPaymentId(request.razorpayPaymentId);
                payment.setGatewayOrderId(request.razorpayOrderId);
                paymentRepository.save(payment);
            }

            return ResponseEntity.ok(Map.of("success", true, "orderId", order.getId(), "message", "Payment verified and order confirmed successfully!"));
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
