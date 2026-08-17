package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** One real person, identified exclusively by a mobile number. */
@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "auth_identities", uniqueConstraints = @UniqueConstraint(columnNames = "mobile_number"))
public class AuthIdentity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mobile_number", nullable = false, unique = true, length = 20)
    private String mobileNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AccountStatus status = AccountStatus.APPROVED;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    private Instant lastLogin;

    @PrePersist void created() { if (createdAt == null) createdAt = Instant.now(); }
}
