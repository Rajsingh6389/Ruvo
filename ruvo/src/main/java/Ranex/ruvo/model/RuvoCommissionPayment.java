package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Cashfree payment for RuVo commission.
 * Supports partial payments — multiple payments can target the same cycle.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "ruvo_commission_payments",
    indexes = {
        @Index(name = "idx_cp_cycle", columnList = "cycle_id"),
        @Index(name = "idx_cp_shop", columnList = "shop_id"),
        @Index(name = "idx_cp_cf_order", columnList = "cashfree_order_id"),
        @Index(name = "idx_cp_webhook_event", columnList = "webhook_event_id")
    }
)
public class RuvoCommissionPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cycle_id", nullable = false)
    private Long cycleId;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "cashfree_order_id", length = 150)
    private String cashfreeOrderId;

    @Column(name = "cashfree_payment_id", length = 150)
    private String cashfreePaymentId;

    @Column(name = "payment_session_id", length = 300)
    private String paymentSessionId;

    /**
     * PENDING, SUCCESS, FAILED, CANCELLED
     */
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "webhook_event_id", length = 200)
    private String webhookEventId;

    @Column(name = "failure_code", length = 100)
    private String failureCode;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

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
