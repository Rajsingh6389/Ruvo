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
    name = "razorpay_stakeholders",
    indexes = {
        @Index(name = "idx_rzp_sth_linked_acc", columnList = "linked_account_id"),
        @Index(name = "idx_rzp_sth_id", columnList = "razorpay_stakeholder_id")
    }
)
public class RazorpayStakeholder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "linked_account_id", nullable = false)
    private Long linkedAccountId;

    @Column(name = "razorpay_stakeholder_id", length = 100)
    private String razorpayStakeholderId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "relationship", length = 100)
    @Builder.Default
    private String relationship = "owner";

    /** Masked PAN for security compliance (e.g. ABCDE1234F -> ABCXX1234F) */
    @Column(name = "pan_masked", length = 20)
    private String panMasked;

    @Column(name = "status", length = 50)
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
        if (relationship == null) relationship = "owner";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
