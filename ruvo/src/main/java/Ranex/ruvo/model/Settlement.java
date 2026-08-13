package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "settlements")
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "delivery_partner_id")
    private Long deliveryPartnerId;

    @Column(nullable = false)
    private Double amount;

    // COD_COLLECTION, PARTNER_EARNING, RUVO_PLATFORM_FEE
    @Column(name = "settlement_type", nullable = false)
    private String settlementType;

    // CASH, UPI
    @Column(name = "payment_method")
    private String paymentMethod; 

    // PENDING, PAID, OVERDUE, CANCELLED
    @Column(nullable = false)
    private String status;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "otp_hash")
    private String otpHash;

    @Column(name = "otp_verified")
    @Builder.Default
    private Boolean otpVerified = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
