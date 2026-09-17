package Ranex.ruvo.controller;

import Ranex.ruvo.model.Offer;
import Ranex.ruvo.service.OfferService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offers")
@RequiredArgsConstructor
public class OfferController {
    
    private final OfferService offerService;
    
    @PostMapping
    public ResponseEntity<Offer> createOffer(@RequestBody Offer offer) {
        return ResponseEntity.ok(offerService.createOffer(offer));
    }
    
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<Offer>> getShopOffers(@PathVariable Long shopId) {
        return ResponseEntity.ok(offerService.getActiveOffersForShop(shopId));
    }

    @GetMapping("/shop/{shopId}/all")
    public ResponseEntity<List<Offer>> getAllShopOffers(@PathVariable Long shopId) {
        return ResponseEntity.ok(offerService.getAllOffersForShop(shopId));
    }
    
    @PutMapping("/{id}/status")
    public ResponseEntity<Offer> toggleStatus(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(offerService.toggleOfferStatus(id, active));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Boolean>> deleteOffer(@PathVariable Long id) {
        offerService.deleteOffer(id);
        return ResponseEntity.ok(Map.of("success", true));
    }
    
    @PostMapping("/validate")
    public ResponseEntity<?> validateOffer(@RequestBody Map<String, Object> request) {
        try {
            Object codeObj = request.get("code");
            Object shopIdObj = request.get("shopId");
            Object cartValueObj = request.get("cartValue");

            if (codeObj == null || shopIdObj == null || cartValueObj == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "valid", false,
                    "message", "Missing required fields: code, shopId, cartValue"
                ));
            }

            String code = codeObj.toString();
            Long shopId = Long.valueOf(shopIdObj.toString());
            BigDecimal cartValue = new BigDecimal(cartValueObj.toString());
            
            return ResponseEntity.ok(offerService.validateAndCalculateDiscount(code, shopId, cartValue));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "valid", false,
                "message", e.getMessage() != null ? e.getMessage() : "Coupon validation failed"
            ));
        }
    }
}
