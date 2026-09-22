package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
    name = "seller_bank_accounts",
    indexes = {
        @Index(name = "idx_seller_bank_shop_id", columnList = "shop_id"),
        @Index(name = "idx_seller_bank_partner_id", columnList = "partner_id"),
        @Index(name = "idx_seller_bank_status", columnList = "status"),
        @Index(name = "idx_seller_bank_active", columnList = "is_active")
    }
)
public class SellerBankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "user_id", length = 100)
    private String userId;

    @Column(name = "account_number_masked", nullable = false, length = 30)
    private String accountNumberMasked;

    @Column(name = "account_number_encrypted", length = 255)
    private String accountNumberEncrypted;

    @Column(name = "ifsc_code", nullable = false, length = 20)
    private String ifscCode;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "beneficiary_name", length = 150)
    private String beneficiaryName;

    @Column(name = "submitted_holder_name", length = 150)
    private String submittedHolderName;

    @Column(name = "bank_holder_name", length = 150)
    private String bankHolderName;

    /**
     * PENDING, VERIFIED, FAILED, NAME_MISMATCH, HOLD, REJECTED
     */
    @Column(name = "verification_status", length = 50)
    @Builder.Default
    private String verificationStatus = "PENDING";

    @Column(name = "name_match")
    private Boolean nameMatch;

    @Column(name = "name_match_score")
    private Double nameMatchScore;

    /**
     * PASS, HOLD, REJECT
     */
    @Column(name = "risk_status", length = 50)
    private String riskStatus;

    @Column(name = "risk_reason", length = 500)
    private String riskReason;

    @Column(name = "verification_reference", length = 100)
    private String verificationReference;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "attempts_count")
    @Builder.Default
    private Integer attemptsCount = 1;

    @Column(name = "last_attempt_at")
    private Instant lastAttemptAt;

    /**
     * PENDING, ACTIVE, REJECTED, UNDER_REVIEW, NEEDS_CLARIFICATION
     */
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = false;

    @Column(name = "razorpay_bank_reference", length = 100)
    private String razorpayBankReference;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = "PENDING";
        if (verificationStatus == null) verificationStatus = "PENDING";
        if (isActive == null) isActive = false;
        if (attemptsCount == null) attemptsCount = 1;
        if (lastAttemptAt == null) lastAttemptAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
