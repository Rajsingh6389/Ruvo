package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
    name = "route_transfers",
    indexes = {
        @Index(name = "idx_route_trf_order_id", columnList = "order_id"),
        @Index(name = "idx_route_trf_payment_id", columnList = "payment_id"),
        @Index(name = "idx_route_trf_shop_id", columnList = "shop_id"),
        @Index(name = "idx_route_trf_rzp_id", columnList = "razorpay_transfer_id"),
        @Index(name = "idx_route_trf_status", columnList = "status")
    }
)
public class RouteTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "payment_id", nullable = false)
    private Long paymentId;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "razorpay_transfer_id", length = 100)
    private String razorpayTransferId;

    @Column(name = "linked_account_id", nullable = false, length = 100)
    private String linkedAccountId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "commission_amount", precision = 12, scale = 2)
    private BigDecimal commissionAmount;

    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    /**
     * processed, failed, reversed, pending
     */
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "pending";

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (currency == null) currency = "INR";
        if (status == null) status = "pending";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
