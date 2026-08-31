package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "partner_profiles")
public class PartnerProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "auth_identity_id", unique = true)
    private Long authIdentityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VerificationStatus verificationStatus; // PENDING, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED

    private String adminReason; // reason for rejection
}
