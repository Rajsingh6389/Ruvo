package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "pricing_config")
public class PricingConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Distance slab ────────────────────────────
    @Column(name = "from_km", nullable = false)
    private Double fromKm;

    @Column(name = "to_km", nullable = false)
    private Double toKm;

    /** Base delivery fee for this distance slab (before cart modifier). */
    @Column(name = "delivery_fee", nullable = false)
    private Double deliveryFee;

    // ── Cart value modifier ──────────────────────
    /**
     * Minimum cart value (inclusive) for this modifier row to apply.
     * NULL means "match any cart value" (used for distance-only rows).
     */
    @Column(name = "cart_min_value")
    private Double cartMinValue;

    /**
     * Maximum cart value (exclusive) for this modifier row.
     * NULL means no upper limit.
     */
    @Column(name = "cart_max_value")
    private Double cartMaxValue;

    /**
     * Multiplier applied to the distance base fee.
     * 1.0 = no change, 0.6 = 40% off, 0.0 = FREE delivery.
     * Defaults to 1.0 (no modifier).
     */
    @Column(name = "cart_modifier")
    @Builder.Default
    private Double cartModifier = 1.0;

    // ── Platform / GST ──────────────────────────
    @Column(name = "platform_fee", nullable = false)
    private Double platformFee;

    /**
     * GST rate (%) applied on platform fee.
     * Default 18% as per SAC 998314.
     */
    @Column(name = "gst_rate")
    @Builder.Default
    private Double gstRate = 18.0;

    // ── Free delivery threshold ──────────────────
    /**
     * If customer cart value >= this threshold, delivery is FREE
     * and the delivery fee goes entirely to the rider from platform margin.
     * NULL = no free delivery.
     */
    @Column(name = "free_delivery_threshold")
    private Double freeDeliveryThreshold;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
