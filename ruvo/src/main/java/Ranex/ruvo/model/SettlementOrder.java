package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Immutable snapshot mapping a Settlement to the specific Orders it covers.
 * Created at settlement-initiation time so that later orders can never
 * accidentally contaminate an existing settlement.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "settlement_orders",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_settlement_order",
        columnNames = {"settlement_id", "order_id"}
    ),
    indexes = {
        @Index(name = "idx_so_settlement", columnList = "settlement_id"),
        @Index(name = "idx_so_order", columnList = "order_id")
    }
)
public class SettlementOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "settlement_id", nullable = false)
    private Long settlementId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "cod_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal codAmount;

    @Column(name = "delivery_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal deliveryFee;

    @Column(name = "platform_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal platformFee;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
