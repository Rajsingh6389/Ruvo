package Ranex.ruvo.service;

import Ranex.ruvo.model.Offer;
import Ranex.ruvo.repository.OfferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OfferService {
    
    private final OfferRepository offerRepository;
    
    public Offer createOffer(Offer offer) {
        // Validate
        if (offer.getCode() != null) {
            offer.setCode(offer.getCode().toUpperCase().trim());
        }
        return offerRepository.save(offer);
    }
    
    public List<Offer> getActiveOffersForShop(Long shopId) {
        return offerRepository.findByShopIdAndActiveTrue(shopId);
    }
    
    public List<Offer> getAllOffersForShop(Long shopId) {
        return offerRepository.findByShopId(shopId);
    }
    
    public void deleteOffer(Long id) {
        offerRepository.deleteById(id);
    }
    
    public Offer toggleOfferStatus(Long id, boolean active) {
        Offer offer = offerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Offer not found"));
        offer.setActive(active);
        return offerRepository.save(offer);
    }
    
    public Map<String, Object> validateAndCalculateDiscount(String code, Long shopId, BigDecimal cartValue) {
        Offer offer = offerRepository.findByCodeAndShopIdAndActiveTrue(code.toUpperCase().trim(), shopId)
            .orElseThrow(() -> new RuntimeException("Invalid or expired coupon code"));
            
        if (offer.getMinOrderValue() != null && cartValue.compareTo(offer.getMinOrderValue()) < 0) {
            throw new RuntimeException("Minimum order value to apply this coupon is ₹" + offer.getMinOrderValue());
        }
        
        BigDecimal discountAmount = BigDecimal.ZERO;
        
        if ("PERCENTAGE".equalsIgnoreCase(offer.getDiscountType())) {
            discountAmount = cartValue.multiply(offer.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (offer.getMaxDiscount() != null && discountAmount.compareTo(offer.getMaxDiscount()) > 0) {
                discountAmount = offer.getMaxDiscount();
            }
        } else if ("FLAT".equalsIgnoreCase(offer.getDiscountType())) {
            discountAmount = offer.getDiscountValue();
        }
        
        // Discount cannot exceed cart value
        if (discountAmount.compareTo(cartValue) > 0) {
            discountAmount = cartValue;
        }
        
        return Map.of(
            "valid", true,
            "discountAmount", discountAmount,
            "offerId", offer.getId(),
            "code", offer.getCode()
        );
    }
}
