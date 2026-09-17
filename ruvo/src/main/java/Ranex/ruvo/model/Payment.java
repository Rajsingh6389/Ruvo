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
        @Index(name = "idx_razorpay_order_id", columnList = "razorpay_order_id"),
        @Index(name = "idx_razorpay_payment_id", columnList = "razorpay_payment_id"),
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
    private String paymentMethod = "RAZORPAY";

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
    // RAZORPAY INFORMATION
    // ==============================

    /**
     * Razorpay Order ID.
     */
    @Column(name = "razorpay_order_id", length = 150)
    private String razorpayOrderId;

    /**
     * Actual Razorpay Payment ID.
     */
    @Column(name = "razorpay_payment_id", length = 150)
    private String razorpayPaymentId;

    /**
     * Razorpay payment status.
     */
    @Column(name = "razorpay_status", length = 50)
    private String razorpayStatus;

    /**
     * Payment instrument.
     */
    @Column(name = "razorpay_payment_method", length = 50)
    private String razorpayPaymentMethod;

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
     * Razorpay webhook/event identifier.
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
            String razorpayPaymentId,
            String razorpayStatus,
            String paymentMethod
    ) {

        this.paymentStatus = "SUCCESS";

        this.razorpayPaymentId = razorpayPaymentId;
        this.razorpayStatus = razorpayStatus;
        this.razorpayPaymentMethod = paymentMethod;

        this.paidAt = Instant.now();

        this.failureCode = null;
        this.failureReason = null;
        this.failedAt = null;
    }

    public void markFailed(
            String razorpayStatus,
            String failureCode,
            String failureReason
    ) {

        this.paymentStatus = "FAILED";

        this.razorpayStatus = razorpayStatus;
        this.failureCode = failureCode;
        this.failureReason = failureReason;

        this.failedAt = Instant.now();
    }

    public void markCancelled() {

        this.paymentStatus = "CANCELLED";

        this.razorpayStatus = "USER_DROPPED";
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
