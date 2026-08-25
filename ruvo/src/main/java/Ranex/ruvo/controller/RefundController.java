package Ranex.ruvo.controller;

import Ranex.ruvo.model.Refund;
import Ranex.ruvo.model.RefundReason;
import Ranex.ruvo.service.RefundService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/refunds")
@CrossOrigin(origins = "*")
public class RefundController {

    private final RefundService refundService;

    public RefundController(RefundService refundService) {
        this.refundService = refundService;
    }

    /**
     * User requests refund for an order
     */
    @PostMapping("/request")
    public ResponseEntity<?> requestRefund(@RequestBody Map<String, Object> request) {
        try {
            Long orderId = Long.parseLong(request.get("orderId").toString());
            String reasonStr = (String) request.getOrDefault("reason", "USER_REQUEST");
            String description = (String) request.getOrDefault("description", "User requested refund");

            RefundReason reason;
            try {
                reason = RefundReason.valueOf(reasonStr);
            } catch (IllegalArgumentException e) {
                reason = RefundReason.USER_REQUEST;
            }

            Refund refund = refundService.initiateRefund(orderId, reason, "USER", description);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Refund request submitted successfully",
                "refund", mapRefund(refund)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to process refund: " + e.getMessage()
            ));
        }
    }

    /**
     * Get user's refund history
     */
    @GetMapping("/my-refunds")
    public ResponseEntity<?> getUserRefunds(@RequestParam Long userId) {
        try {
            List<Refund> refunds = refundService.getUserRefunds(userId);
            List<Map<String, Object>> refundList = refunds.stream()
                .map(this::mapRefund)
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "refunds", refundList
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch refunds: " + e.getMessage()
            ));
        }
    }

    /**
     * Get refund status for a specific order
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getOrderRefund(@PathVariable Long orderId) {
        try {
            return refundService.getRefundByOrderId(orderId)
                .map(refund -> ResponseEntity.ok(Map.of(
                    "success", true,
                    "refund", mapRefund(refund)
                )))
                .orElse(ResponseEntity.ok(Map.of(
                    "success", true,
                    "refund", null,
                    "message", "No refund found for this order"
                )));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch refund: " + e.getMessage()
            ));
        }
    }

    /**
     * Admin: Get all pending refunds
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPendingRefunds() {
        try {
            List<Refund> refunds = refundService.getPendingRefunds();
            List<Map<String, Object>> refundList = refunds.stream()
                .map(this::mapRefund)
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "refunds", refundList,
                "count", refundList.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch pending refunds: " + e.getMessage()
            ));
        }
    }

    /**
     * Admin: Process a pending refund
     */
    @PostMapping("/{refundId}/process")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> processRefund(@PathVariable Long refundId) {
        try {
            Refund refund = refundService.processRefund(refundId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Refund processed successfully",
                "refund", mapRefund(refund)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to process refund: " + e.getMessage()
            ));
        }
    }

    private Map<String, Object> mapRefund(Refund refund) {
        Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", refund.getId());
        map.put("orderId", refund.getOrderId());
        map.put("userId", refund.getUserId());
        map.put("amount", refund.getAmount());
        map.put("currency", refund.getCurrency());
        map.put("status", refund.getStatus().name());
        map.put("reason", refund.getReason().name());
        map.put("description", refund.getDescription() != null ? refund.getDescription() : "");
        map.put("refundReference", refund.getRefundReference() != null ? refund.getRefundReference() : "");
        map.put("initiatedBy", refund.getInitiatedBy() != null ? refund.getInitiatedBy() : "");
        map.put("createdAt", refund.getCreatedAt().toString());
        map.put("processedAt", refund.getProcessedAt() != null ? refund.getProcessedAt().toString() : "");
        return map;
    }
}
