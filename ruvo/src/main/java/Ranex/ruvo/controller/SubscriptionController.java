package Ranex.ruvo.controller;

import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.service.RazorpayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/subscription")
@CrossOrigin(origins = "*")
public class SubscriptionController {

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private RazorpayService razorpayService;

    @PostMapping("/initiate")
    public ResponseEntity<?> initiateSubscription(@RequestBody Map<String, String> payload) {
        try {
            Long shopId = Long.parseLong(payload.get("shopId"));
            String plan = payload.get("plan"); // "MONTHLY" or "YEARLY"

            Optional<Shop> shopOpt = shopRepository.findById(shopId);
            if (shopOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Shop not found"));
            }

            BigDecimal amount;
            if ("MONTHLY".equalsIgnoreCase(plan)) {
                amount = new BigDecimal("149.00");
            } else if ("YEARLY".equalsIgnoreCase(plan)) {
                amount = new BigDecimal("1499.00");
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid subscription plan"));
            }

            String orderIdStr = "SUB_" + shopId + "_" + System.currentTimeMillis();
            Map<String, Object> rzpRes = razorpayService.createOrder(orderIdStr, amount, BigDecimal.ZERO, null, null, null);
            if (rzpRes == null || rzpRes.get("razorpay_order_id") == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Failed to initialize Razorpay for subscription"));
            }

            Map<String, Object> response = new HashMap<>(rzpRes);
            response.put("shopId", shopId.toString());
            response.put("plan", plan.toUpperCase());
            response.put("amount", amount.toString());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifySubscription(@RequestBody Map<String, String> payload) {
        try {
            Long shopId = Long.parseLong(payload.get("shopId"));
            String plan = payload.get("plan");
            String razorpayOrderId = payload.get("razorpay_order_id");
            String paymentId = payload.get("razorpay_payment_id");
            String signature = payload.get("razorpay_signature");

            if (razorpayOrderId == null || paymentId == null || signature == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing Razorpay details"));
            }

            boolean isValid = razorpayService.verifyPaymentSignature(razorpayOrderId, paymentId, signature);
            if (!isValid) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid payment signature"));
            }

            Optional<Shop> shopOpt = shopRepository.findById(shopId);
            if (shopOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Shop not found"));
            }

            Shop shop = shopOpt.get();
            shop.setSubscriptionActive(true);
            shop.setSubscriptionType(plan.toUpperCase());
            
            LocalDateTime now = LocalDateTime.now();
            if ("YEARLY".equalsIgnoreCase(plan)) {
                shop.setSubscriptionExpiry(now.plusYears(1));
            } else {
                shop.setSubscriptionExpiry(now.plusDays(30)); 
            }

            shopRepository.save(shop);
            return ResponseEntity.ok(Map.of("success", true, "message", "Subscription activated successfully"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
