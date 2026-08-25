package Ranex.ruvo.controller;

import Ranex.ruvo.model.RuvoCommissionCycle;
import Ranex.ruvo.service.RuvoCommissionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/ruvo/commission")
@CrossOrigin(origins = "*")
public class RuvoCommissionController {

    private final RuvoCommissionService commissionService;

    public RuvoCommissionController(RuvoCommissionService commissionService) {
        this.commissionService = commissionService;
    }

    /**
     * GET /api/ruvo/commission/cycles?shopId=1
     * Get all commission cycles for a shop.
     */
    @GetMapping("/cycles")
    public ResponseEntity<List<RuvoCommissionCycle>> getShopCycles(@RequestParam Long shopId) {
        return ResponseEntity.ok(commissionService.getShopCycles(shopId));
    }

    /**
     * GET /api/ruvo/commission/cycle/{cycleId}
     * Get specific cycle details.
     */
    @GetMapping("/cycle/{cycleId}")
    public ResponseEntity<?> getCycleById(@PathVariable String cycleId) {
        Optional<RuvoCommissionCycle> cycle = commissionService.getCycleById(cycleId);
        if (cycle.isPresent()) {
            return ResponseEntity.ok(cycle.get());
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * POST /api/ruvo/commission/pay
     * Shopkeeper initiates "Pay RuVo" for a cycle.
     * Body: { "cycleId": "CYC-1-2026-08-23-...", "shopId": 1 }
     */
    @PostMapping("/pay")
    public ResponseEntity<?> initiatePayment(@RequestBody Map<String, Object> body) {
        String cycleId = (String) body.get("cycleId");
        Long shopId = body.get("shopId") != null ? Long.valueOf(body.get("shopId").toString()) : null;

        if (cycleId == null || shopId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Both cycleId and shopId are required."));
        }

        Map<String, Object> result = commissionService.initiateCommissionPayment(cycleId, shopId);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/ruvo/commission/webhook
     * Cashfree webhook endpoint for RuVo commission payments.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleCommissionWebhook(@RequestBody String rawPayload, HttpServletRequest request) {
        try {
            Map<String, Object> res = commissionService.processCommissionWebhook(rawPayload, request);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("[CommissionWebhook Error] " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", "Webhook processing failed."));
        }
    }
}
