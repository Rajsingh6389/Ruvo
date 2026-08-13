package Ranex.ruvo.controller;

import Ranex.ruvo.service.PricingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/checkout")
@CrossOrigin(origins = "*")
public class CheckoutController {

    private final PricingService pricingService;

    public CheckoutController(PricingService pricingService) {
        this.pricingService = pricingService;
    }

    @PostMapping("/quote")
    public ResponseEntity<?> getQuote(@RequestBody QuoteRequest request) {
        try {
            Map<String, Object> quote = pricingService.getQuote(
                request.getShopId(),
                request.getLatitude(),
                request.getLongitude(),
                request.getItems()
            );
            return ResponseEntity.ok(quote);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "code", "SERVICE_UNAVAILABLE",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "message", "Failed to calculate quote: " + e.getMessage()
            ));
        }
    }

    public static class QuoteRequest {
        private Long shopId;
        private Double latitude;
        private Double longitude;
        private List<PricingService.QuoteItemRequest> items;

        public Long getShopId() { return shopId; }
        public void setShopId(Long shopId) { this.shopId = shopId; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
        public List<PricingService.QuoteItemRequest> getItems() { return items; }
        public void setItems(List<PricingService.QuoteItemRequest> items) { this.items = items; }
    }
}
