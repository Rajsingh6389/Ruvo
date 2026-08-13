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

    @Column(name = "from_km", nullable = false)
    private Double fromKm;

    @Column(name = "to_km", nullable = false)
    private Double toKm;

    @Column(name = "delivery_fee", nullable = false)
    private Double deliveryFee;

    @Column(name = "platform_fee", nullable = false)
    private Double platformFee;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
