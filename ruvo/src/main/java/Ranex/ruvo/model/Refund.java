package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "refunds")
public class Refund {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RefundStatus status; // PENDING, PROCESSING, COMPLETED, FAILED

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RefundReason reason; // SHOP_TIMEOUT, NO_PARTNER, SHOP_REJECTED, PAYMENT_FAILED, USER_REQUEST, ADMIN_INITIATED

    private String description;

    @Column(name = "refund_reference")
    private String refundReference; // Cashfree refund ID or manual reference

    @Column(name = "initiated_by")
    private String initiatedBy; // USER, SYSTEM, ADMIN

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;
}
