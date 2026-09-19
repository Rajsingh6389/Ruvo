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
    name = "bank_account_audit_logs",
    indexes = {
        @Index(name = "idx_bank_audit_shop_id", columnList = "shop_id"),
        @Index(name = "idx_bank_audit_partner_id", columnList = "partner_id"),
        @Index(name = "idx_bank_audit_seller_id", columnList = "seller_id")
    }
)
public class BankAccountAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "seller_id", length = 100)
    private String sellerId;

    @Column(name = "old_config_reference", length = 100)
    private String oldConfigReference;

    @Column(name = "new_config_reference", length = 100)
    private String newConfigReference;

    @Column(name = "old_bank_masked", length = 30)
    private String oldBankMasked;

    @Column(name = "new_bank_masked", length = 30)
    private String newBankMasked;

    @Column(name = "old_ifsc", length = 20)
    private String oldIfsc;

    @Column(name = "new_ifsc", length = 20)
    private String newIfsc;

    /**
     * PENDING, SUBMITTED, ACTIVATED, REJECTED, NEEDS_CLARIFICATION
     */
    @Column(name = "razorpay_status", length = 50)
    private String razorpayStatus;

    @Column(name = "requested_by", length = 100)
    private String requestedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
