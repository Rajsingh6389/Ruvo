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
    name = "razorpay_linked_accounts",
    indexes = {
        @Index(name = "idx_rzp_linked_acc_shop_id", columnList = "shop_id"),
        @Index(name = "idx_rzp_linked_acc_partner_id", columnList = "partner_id"),
        @Index(name = "idx_rzp_linked_acc_id", columnList = "razorpay_account_id"),
        @Index(name = "idx_rzp_linked_acc_status", columnList = "status")
    }
)
public class RazorpayLinkedAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "razorpay_account_id", nullable = false, unique = true, length = 100)
    private String razorpayAccountId;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "legal_business_name", length = 200)
    private String legalBusinessName;

    @Column(name = "business_type", length = 50)
    @Builder.Default
    private String businessType = "individual";

    @Column(name = "contact_name", length = 150)
    private String contactName;

    /**
     * created, activated, suspended, under_review, needs_clarification
     */
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "created";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = "created";
        if (businessType == null) businessType = "individual";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
