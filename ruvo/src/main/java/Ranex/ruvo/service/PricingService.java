package Ranex.ruvo.service;

import Ranex.ruvo.model.PricingConfig;
import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.PricingConfigRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.util.DistanceUtils;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PricingService {

    // Default slabs used when no PricingConfig rows exist in DB
    private static final double DEFAULT_PLATFORM_FEE = 6.0;
    private static final double DEFAULT_GST_RATE      = 18.0;

    private final PricingConfigRepository pricingConfigRepository;
    private final ShopRepository          shopRepository;
    private final ProductRepository       productRepository;

    public PricingService(PricingConfigRepository pricingConfigRepository,
                          ShopRepository shopRepository,
                          ProductRepository productRepository) {
        this.pricingConfigRepository = pricingConfigRepository;
        this.shopRepository          = shopRepository;
        this.productRepository       = productRepository;
    }

    // ─────────────────────────────────────────────────────────────────
    // Core: hybrid delivery fee (distance slab × cart modifier)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Returns the delivery fee to charge the customer.
     *
     * Algorithm:
     *  1. Find the active PricingConfig row whose distance slab covers distanceKm.
     *  2. Apply the cart modifier if the row has one, otherwise use 1.0.
     *  3. Check the free-delivery threshold — if cartValue qualifies, return 0.
     *
     * Distance slabs (default if DB is empty):
     *   0–2 km  →  ₹10
     *   2–4 km  →  ₹20
     *   4–5 km  →  ₹30
     *   5+ km   →  ₹50  (not serviceable beyond configured max — caller checks)
     */
    public double calculateDeliveryFee(double distanceKm, double cartValue) {
        List<PricingConfig> configs = pricingConfigRepository.findByIsActiveTrue();

        // Free delivery check (use first active config that has a threshold)
        if (configs != null) {
            for (PricingConfig cfg : configs) {
                if (cfg.getFreeDeliveryThreshold() != null
                        && cartValue >= cfg.getFreeDeliveryThreshold()) {
                    return 0.0; // FREE delivery
                }
            }
        }

        // Distance slab lookup
        double baseFee    = fallbackDeliveryFee(distanceKm);
        double modifier   = 1.0;

        if (configs != null && !configs.isEmpty()) {
            for (PricingConfig cfg : configs) {
                // Ensure distanceKm matches within slab fromKm <= distanceKm < toKm, or distanceKm <= toKm for max bound
                boolean isLastSlab = cfg.getToKm() != null && cfg.getToKm() >= 5.0;
                boolean inRange = isLastSlab 
                        ? (distanceKm >= cfg.getFromKm() && distanceKm <= cfg.getToKm())
                        : (distanceKm >= cfg.getFromKm() && distanceKm < cfg.getToKm());
                if (inRange) {
                    baseFee  = cfg.getDeliveryFee();
                    modifier = resolveCartModifier(cfg, cartValue);
                    break;
                }
            }
        }

        double fee = baseFee * modifier;
        return round2(fee);
    }

    /** Picks the correct cart modifier from the config row. */
    private double resolveCartModifier(PricingConfig cfg, double cartValue) {
        if (cfg.getCartModifier() == null) return 1.0;
        // If the row has cart bounds, only apply modifier when cart is in range
        boolean minOk = cfg.getCartMinValue() == null || cartValue >= cfg.getCartMinValue();
        boolean maxOk = cfg.getCartMaxValue() == null || cartValue < cfg.getCartMaxValue();
        return (minOk && maxOk) ? cfg.getCartModifier() : 1.0;
    }

    /** Hard-coded default slabs used when DB is empty. */
    private double fallbackDeliveryFee(double distanceKm) {
        if (distanceKm < 1.0) return 10.0; // 0 - 1 km  → ₹10
        if (distanceKm < 2.0) return 15.0; // 1 - 2 km  → ₹15
        if (distanceKm < 3.0) return 20.0; // 2 - 3 km  → ₹20
        return 25.0;                        // 3 - 5 km  → ₹25
    }

    // ─────────────────────────────────────────────────────────────────
    // Platform fee + GST helpers
    // ─────────────────────────────────────────────────────────────────

    public double getPlatformFee() {
        List<PricingConfig> configs = pricingConfigRepository.findByIsActiveTrue();
        if (configs != null && !configs.isEmpty()) {
            return configs.get(0).getPlatformFee();
        }
        return DEFAULT_PLATFORM_FEE;
    }

    /** Platform fee scaled dynamically by item quantity: base fee + (items * perItemCharge) */
    public double calculatePlatformFee(int totalItemsCount) {
        double baseFee = getPlatformFee();
        if (totalItemsCount <= 1) return baseFee;
        return baseFee + ((totalItemsCount - 1) * 2.0); // e.g. ₹5 base + ₹2 for each extra item
    }

    public double getGstRate() {
        List<PricingConfig> configs = pricingConfigRepository.findByIsActiveTrue();
        if (configs != null && !configs.isEmpty() && configs.get(0).getGstRate() != null) {
            return configs.get(0).getGstRate();
        }
        return DEFAULT_GST_RATE;
    }

    /** GST amount on platform fee (to be collected from shopkeeper in settlement). */
    public double calculateGstOnPlatformFee(double platformFee) {
        return round2(platformFee * getGstRate() / 100.0);
    }

    // ─────────────────────────────────────────────────────────────────
    // Full order quote
    // ─────────────────────────────────────────────────────────────────

    /**
     * Returns the complete price breakdown for an order.
     *
     * Response keys:
     *   subtotal, deliveryFee, platformFee, gstOnPlatformFee,
     *   couponDiscount, grandTotal,
     *   riderPayout, shopPayout, ruvoRevenue,
     *   isFreeDelivery, distanceKm
     *
     * Split rules:
     *   - Rider gets: deliveryFee (always; on free delivery, covered by platform)
     *   - Shop gets:  subtotal − couponDiscount − platformFee − gstOnPlatformFee
     *   - RuVo gets:  platformFee (collects GST, deposits to govt)
     */
    public Map<String, Object> getQuote(Long shopId, Double lat, Double lng,
                                        List<QuoteItemRequest> items,
                                        String couponCode) {

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found"));
        if (Boolean.FALSE.equals(shop.getApproved()) || Boolean.FALSE.equals(shop.getActive())) {
            throw new IllegalArgumentException("Shop is currently unavailable");
        }

        // Distance
        double distanceKm = 0.0;
        if (shop.getLatitude() != null && shop.getLongitude() != null) {
            distanceKm = DistanceUtils.calculateDistance(lat, lng, shop.getLatitude(), shop.getLongitude());
        }
        if (!DistanceUtils.isServiceable(distanceKm)) {
            throw new IllegalArgumentException("We are not in your area right now");
        }

        // Subtotal & Total Item Quantity
        double subtotal = 0.0;
        int totalItemCount = 0;
        if (items != null) {
            for (QuoteItemRequest item : items) {
                Product p = productRepository.findById(item.getProductId()).orElse(null);
                if (p != null) {
                    int qty = item.getQuantity() != null ? item.getQuantity() : 1;
                    subtotal += p.getSellingPrice() * qty;
                    totalItemCount += qty;
                }
            }
        }

        // Fees
        double deliveryFee        = calculateDeliveryFee(distanceKm, subtotal);
        boolean isFreeDelivery    = deliveryFee == 0.0;
        double platformFee        = calculatePlatformFee(totalItemCount);
        double gstOnPlatformFee   = calculateGstOnPlatformFee(platformFee);

        // Grand total (customer pays)
        double grandTotal = round2(subtotal + deliveryFee + platformFee + gstOnPlatformFee);

        // ── Payout split ──────────────────────────────────────────────
        // Rider always gets the delivery fee.
        // On free delivery, platform fee is redirected to rider — RuVo earns ₹0 that order
        // (acceptable in starting phase; add commission later to fix).
        double riderPayout;
        double ruvoRevenue;
        if (isFreeDelivery) {
            // Rider gets the platform fee as compensation for the free delivery
            riderPayout = platformFee;
            ruvoRevenue = 0.0;
        } else {
            riderPayout = deliveryFee;
            ruvoRevenue = platformFee; // RuVo keeps platformFee, pays gstOnPlatformFee to govt
        }

        // Shop net = subtotal
        // (Platform fee + GST are paid by the customer on top of subtotal; coupon discounts are handled at order placement)
        double shopPayout = round2(subtotal);

        Map<String, Object> response = new HashMap<>();
        response.put("subtotal",           round2(subtotal));
        response.put("deliveryFee",        deliveryFee);
        response.put("platformFee",        platformFee);
        response.put("gstOnPlatformFee",   round2(gstOnPlatformFee));
        response.put("grandTotal",         grandTotal);
        response.put("isFreeDelivery",     isFreeDelivery);
        response.put("distanceKm",         round1(distanceKm));

        // Internal split (used by SettlementService)
        response.put("riderPayout",  round2(riderPayout));
        response.put("shopPayout",   round2(shopPayout));
        response.put("ruvoRevenue",  round2(ruvoRevenue));

        return response;
    }

    // ─────────────────────────────────────────────────────────────────
    // Backward-compatible overload (no items, no coupon)
    // ─────────────────────────────────────────────────────────────────
    public double calculateDeliveryFee(double distanceKm) {
        return calculateDeliveryFee(distanceKm, Double.MAX_VALUE); // no cart value = no modifier
    }

    public double calculatePlatformFee(double distanceKm) {
        return getPlatformFee();
    }

    // ─────────────────────────────────────────────────────────────────
    // Rounding helpers
    // ─────────────────────────────────────────────────────────────────
    private static double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private static double round1(double v) {
        return BigDecimal.valueOf(v).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    // ─────────────────────────────────────────────────────────────────
    // Inner DTO
    // ─────────────────────────────────────────────────────────────────
    public static class QuoteItemRequest {
        private Long    productId;
        private Integer quantity;

        public Long    getProductId()              { return productId; }
        public void    setProductId(Long productId){ this.productId = productId; }
        public Integer getQuantity()               { return quantity; }
        public void    setQuantity(Integer qty)    { this.quantity = qty; }
    }
}
