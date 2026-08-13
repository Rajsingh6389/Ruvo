package Ranex.ruvo.service;

import Ranex.ruvo.model.PricingConfig;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.PricingConfigRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.util.DistanceUtils;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PricingService {

    private final PricingConfigRepository pricingConfigRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;

    public PricingService(PricingConfigRepository pricingConfigRepository,
                          ShopRepository shopRepository,
                          ProductRepository productRepository) {
        this.pricingConfigRepository = pricingConfigRepository;
        this.shopRepository = shopRepository;
        this.productRepository = productRepository;
    }

    public double calculateDeliveryFee(double distanceKm) {
        List<PricingConfig> configs = pricingConfigRepository.findByIsActiveTrue();
        if (configs != null && !configs.isEmpty()) {
            for (PricingConfig config : configs) {
                if (distanceKm >= config.getFromKm() && distanceKm < config.getToKm()) {
                    return config.getDeliveryFee();
                }
            }
        }
        // Fallback to DistanceUtils logic
        return DistanceUtils.calculateDeliveryFee(distanceKm);
    }

    public double calculatePlatformFee(double distanceKm) {
        List<PricingConfig> configs = pricingConfigRepository.findByIsActiveTrue();
        if (configs != null && !configs.isEmpty()) {
            return configs.get(0).getPlatformFee();
        }
        return DistanceUtils.calculatePlatformFee(distanceKm);
    }

    public Map<String, Object> getQuote(Long shopId, Double lat, Double lng, List<QuoteItemRequest> items) {
        Shop shop = shopRepository.findById(shopId).orElseThrow(() -> new IllegalArgumentException("Shop not found"));
        if (shop.getApproved() == null || !shop.getApproved() || shop.getActive() == null || !shop.getActive()) {
            throw new IllegalArgumentException("Shop is currently unavailable");
        }

        double distanceKm = 0.0;
        if (shop.getLatitude() != null && shop.getLongitude() != null) {
            distanceKm = DistanceUtils.calculateDistance(lat, lng, shop.getLatitude(), shop.getLongitude());
        }

        if (!DistanceUtils.isServiceable(distanceKm)) {
            throw new IllegalArgumentException("We are not in your area right now");
        }

        double deliveryFee = calculateDeliveryFee(distanceKm);
        double platformFee = calculatePlatformFee(distanceKm);

        double subtotal = 0.0;
        if (items != null) {
            for (QuoteItemRequest item : items) {
                Product p = productRepository.findById(item.getProductId()).orElse(null);
                if (p != null) {
                    subtotal += p.getSellingPrice() * item.getQuantity();
                }
            }
        }
        
        // Optionally add taxes if configured/needed
        double total = subtotal + deliveryFee + platformFee;

        Map<String, Object> response = new HashMap<>();
        response.put("subtotal", Math.round(subtotal * 100.0) / 100.0);
        response.put("distanceKm", Math.round(distanceKm * 10.0) / 10.0);
        response.put("deliveryFee", deliveryFee);
        response.put("platformFee", platformFee);
        response.put("total", Math.round(total * 100.0) / 100.0);

        return response;
    }

    public static class QuoteItemRequest {
        private Long productId;
        private Integer quantity;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}
