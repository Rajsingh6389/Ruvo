package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "payments",
    indexes = {
        @Index(name = "idx_payment_order_id", columnList = "order_id"),
        @Index(name = "idx_payment_user_id", columnList = "user_id"),
        @Index(name = "idx_cashfree_order_id", columnList = "cashfree_order_id"),
        @Index(name = "idx_cashfree_payment_id", columnList = "cashfree_payment_id"),
        @Index(name = "idx_payment_status", columnList = "payment_status"),
        @Index(name = "idx_webhook_event_id", columnList = "webhook_event_id")
    }
)
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==============================
    // RUVO ORDER INFORMATION
    // ==============================

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    // ==============================
    // PAYMENT INFORMATION
    // ==============================

    @Column(name = "payment_method", nullable = false, length = 30)
    @Builder.Default
    private String paymentMethod = "CASHFREE";

    /**
     * RuVo internal payment status.
     *
     * PENDING
     * SUCCESS
     * FAILED
     * CANCELLED
     * REFUNDED
     * PARTIALLY_REFUNDED
     */
    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private String paymentStatus = "PENDING";

    @Column(
        name = "amount",
        nullable = false,
        precision = 12,
        scale = 2
    )
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    // ==============================
    // CASHFREE INFORMATION
    // ==============================

    /**
     * Cashfree Order ID.
     *
     * Example:
     * cf_order_xxxxx
     */
    @Column(name = "cashfree_order_id", length = 150)
    private String cashfreeOrderId;

    /**
     * Actual Cashfree Payment ID.
     *
     * IMPORTANT:
     * This is different from cashfreeOrderId.
     */
    @Column(name = "cashfree_payment_id", length = 150)
    private String cashfreePaymentId;

    /**
     * Cashfree payment status.
     *
     * Examples:
     * SUCCESS
     * FAILED
     * USER_DROPPED
     * PENDING
     */
    @Column(name = "cashfree_status", length = 50)
    private String cashfreeStatus;

    /**
     * Payment instrument.
     *
     * Examples:
     * UPI
     * CARD
     * NETBANKING
     * WALLET
     */
    @Column(name = "cashfree_payment_method", length = 50)
    private String cashfreePaymentMethod;

    // ==============================
    // FAILURE INFORMATION
    // ==============================

    @Column(name = "failure_code", length = 100)
    private String failureCode;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    // ==============================
    // WEBHOOK / IDEMPOTENCY
    // ==============================

    /**
     * Cashfree webhook/event identifier.
     *
     * Used to prevent duplicate webhook processing.
     */
    @Column(name = "webhook_event_id", length = 200)
    private String webhookEventId;

    @Builder.Default
    @Column(name = "processing_attempts", nullable = false)
    private Integer processingAttempts = 0;

    // ==============================
    // PAYMENT TIMESTAMPS
    // ==============================

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "failed_at")
    private Instant failedAt;

    @Column(name = "refunded_at")
    private Instant refundedAt;

    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // ==============================
    // JPA LIFECYCLE
    // ==============================

    @PrePersist
    protected void onCreate() {

        Instant now = Instant.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }

        if (processingAttempts == null) {
            processingAttempts = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    // ==============================
    // PAYMENT HELPERS
    // ==============================

    public void markSuccess(
            String cashfreePaymentId,
            String cashfreeStatus,
            String paymentMethod
    ) {

        this.paymentStatus = "SUCCESS";

        this.cashfreePaymentId = cashfreePaymentId;
        this.cashfreeStatus = cashfreeStatus;
        this.cashfreePaymentMethod = paymentMethod;

        this.paidAt = Instant.now();

        this.failureCode = null;
        this.failureReason = null;
        this.failedAt = null;
    }

    public void markFailed(
            String cashfreeStatus,
            String failureCode,
            String failureReason
    ) {

        this.paymentStatus = "FAILED";

        this.cashfreeStatus = cashfreeStatus;
        this.failureCode = failureCode;
        this.failureReason = failureReason;

        this.failedAt = Instant.now();
    }

    public void markCancelled() {

        this.paymentStatus = "CANCELLED";

        this.cashfreeStatus = "USER_DROPPED";
    }

    public void markRefunded() {

        this.paymentStatus = "REFUNDED";

        this.refundedAt = Instant.now();
    }

    public void incrementProcessingAttempts() {

        if (this.processingAttempts == null) {
            this.processingAttempts = 0;
        }

        this.processingAttempts++;
    }
}
