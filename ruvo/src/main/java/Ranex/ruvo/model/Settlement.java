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
    name = "settlements",
    indexes = {
        @Index(name = "idx_sett_shop", columnList = "shop_id"),
        @Index(name = "idx_sett_partner", columnList = "delivery_partner_id"),
        @Index(name = "idx_sett_status", columnList = "status")
    }
)
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "settlement_id", unique = true)
    private String settlementId;

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
    private Integer orderCount = 0;

    // Financial ledger breakdown — all BigDecimal
    @Column(name = "cod_collected", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal codCollected = BigDecimal.ZERO;

    @Column(name = "delivery_charge", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal deliveryCharge = BigDecimal.ZERO;

    @Column(name = "ruvo_commission", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal ruvoCommission = BigDecimal.ZERO;

    @Column(name = "net_cash_to_shop", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal netCashToShop = BigDecimal.ZERO;

    @Column(name = "partner_gross_earning", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal partnerGrossEarning = BigDecimal.ZERO;

    @Column(name = "partner_net_earning", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal partnerNetEarning = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    // COD_COLLECTION, PARTNER_EARNING, RUVO_PLATFORM_FEE, MASTER_SETTLEMENT
    @Column(name = "settlement_type", nullable = false)
    @Builder.Default
    private String settlementType = "MASTER_SETTLEMENT";

    // CASH, UPI
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

    @Column(name = "otp_failed_attempts")
    @Builder.Default
    private Integer otpFailedAttempts = 0;

    @Column(name = "otp_locked")
    @Builder.Default
    private Boolean otpLocked = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private Long version;

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
