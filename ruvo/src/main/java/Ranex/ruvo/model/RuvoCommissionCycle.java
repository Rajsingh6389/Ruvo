package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Two-day commission cycle for each shop.
 * Tracks total commission accrued, payments made, and outstanding balance.
 *
 * Lifecycle: OPEN → CLOSED → PENDING_PAYMENT → PAID | PARTIALLY_PAID | OVERDUE
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "ruvo_commission_cycles",
    indexes = {
        @Index(name = "idx_cc_shop", columnList = "shop_id"),
        @Index(name = "idx_cc_status", columnList = "status"),
        @Index(name = "idx_cc_due_at", columnList = "due_at")
    }
)
public class RuvoCommissionCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cycle_id", unique = true, nullable = false)
    private String cycleId;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "cycle_start", nullable = false)
    private Instant cycleStart;

    @Column(name = "cycle_end", nullable = false)
    private Instant cycleEnd;

    @Column(name = "due_at", nullable = false)
    private Instant dueAt;

    @Column(name = "grace_period_ends_at")
    private Instant gracePeriodEndsAt;

    @Column(name = "total_commission", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalCommission = BigDecimal.ZERO;

    @Column(name = "total_paid", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalPaid = BigDecimal.ZERO;

    @Column(name = "outstanding_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal outstandingAmount = BigDecimal.ZERO;

    /**
     * OPEN, CLOSED, PENDING_PAYMENT, PARTIALLY_PAID, PAID, OVERDUE
     */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
