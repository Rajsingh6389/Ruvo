package Ranex.ruvo.controller;

import Ranex.ruvo.service.RazorpayRouteService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks/razorpay")
public class RazorpayRouteWebhookController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayRouteWebhookController.class);

    private final RazorpayRouteService razorpayRouteService;

    public RazorpayRouteWebhookController(RazorpayRouteService razorpayRouteService) {
        this.razorpayRouteService = razorpayRouteService;
    }

    /**
     * API 9: Razorpay Route Webhook Endpoint
     */
    @PostMapping("/route")
    public ResponseEntity<?> handleRazorpayRouteWebhook(
            @RequestBody String rawPayload,
            HttpServletRequest request) {

        String signature = request.getHeader("x-razorpay-signature");
        log.info("Received Razorpay Route webhook. Signature present: {}", (signature != null && !signature.isBlank()));

        if (!razorpayRouteService.verifyWebhookSignature(rawPayload, signature)) {
            log.error("Invalid Razorpay Webhook signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "message", "Invalid signature"));
        }

        try {
            razorpayRouteService.processWebhookEvent(rawPayload);
            return ResponseEntity.ok(Map.of("success", true, "message", "Webhook processed successfully"));
        } catch (Exception e) {
            log.error("Error processing Razorpay Route webhook: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Webhook handling error: " + e.getMessage()));
        }
    }
}
