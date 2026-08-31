package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Partner-only login identity. Its mobile number is deliberately independent
 * from users.mobile_number, so one person may be both a customer and rider.
 */
@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "partner_accounts", uniqueConstraints = @UniqueConstraint(columnNames = "mobile_number"))
public class PartnerAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mobile_number", nullable = false, unique = true, length = 20)
    private String mobileNumber;

    @Column(name = "auth_identity_id", unique = true)
    private Long authIdentityId;

    /** Internal security principal used only by the partner domain. */
    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "security_user_id", nullable = false, unique = true)
    private User securityUser;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
