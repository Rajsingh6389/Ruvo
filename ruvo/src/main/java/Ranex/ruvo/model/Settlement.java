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

    @Column(name = "settlement_id", unique = true)
    private String settlementId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "shop_name")
    private String shopName;

    @Column(name = "delivery_partner_id")
    private Long deliveryPartnerId;

    @Column(name = "delivery_partner_name")
    private String deliveryPartnerName;

    @Column(name = "order_count")
    @Builder.Default
    private Integer orderCount = 1;

    // Financial ledger breakdown
    @Column(name = "cod_collected")
    @Builder.Default
    private Double codCollected = 0.0;

    @Column(name = "delivery_charge")
    @Builder.Default
    private Double deliveryCharge = 0.0;

    @Column(name = "ruvo_commission")
    @Builder.Default
    private Double ruvoCommission = 0.0;

    @Column(name = "net_cash_to_shop")
    @Builder.Default
    private Double netCashToShop = 0.0;

    @Column(name = "partner_gross_earning")
    @Builder.Default
    private Double partnerGrossEarning = 0.0;

    @Column(name = "partner_net_earning")
    @Builder.Default
    private Double partnerNetEarning = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double amount = 0.0;

    // COD_COLLECTION, PARTNER_EARNING, RUVO_PLATFORM_FEE, MASTER_SETTLEMENT
    @Column(name = "settlement_type", nullable = false)
    @Builder.Default
    private String settlementType = "MASTER_SETTLEMENT";

    // CASH, UPI (Temporarily coming soon for UPI)
    @Column(name = "payment_method")
    @Builder.Default
    private String paymentMethod = "CASH";

    // PENDING, OTP_GENERATED, AWAITING_CONFIRMATION, COMPLETED, EXPIRED, CANCELLED, FAILED, DISPUTED
    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "otp_hash")
    private String otpHash;

    @Column(name = "otp_expires_at")
    private Instant otpExpiresAt;

    @Column(name = "otp_verified_at")
    private Instant otpVerifiedAt;

    @Column(name = "otp_verified")
    @Builder.Default
    private Boolean otpVerified = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
        if (dueAt == null) {
            dueAt = Instant.now().plus(2, java.time.temporal.ChronoUnit.DAYS);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
