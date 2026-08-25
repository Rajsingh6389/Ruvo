package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Per-order commission entry. One and only one commission ledger row per order.
 * Links to the shop, order, settlement, and the commission cycle it belongs to.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "ruvo_commission_ledger",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_commission_order",
        columnNames = {"order_id"}
    ),
    indexes = {
        @Index(name = "idx_cl_shop", columnList = "shop_id"),
        @Index(name = "idx_cl_cycle", columnList = "cycle_id"),
        @Index(name = "idx_cl_settlement", columnList = "settlement_id")
    }
)
public class RuvoCommissionLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "settlement_id", nullable = false)
    private Long settlementId;

    @Column(name = "cycle_id")
    private Long cycleId;

    @Column(name = "commission_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal commissionAmount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
