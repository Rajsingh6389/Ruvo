package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** Roles are memberships, not a mutually-exclusive property of a phone number. */
@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "auth_identity_roles", uniqueConstraints = @UniqueConstraint(columnNames = {"auth_identity_id", "role"}))
public class AuthIdentityRole {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "auth_identity_id", nullable = false)
    private AuthIdentity identity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist void created() { if (createdAt == null) createdAt = Instant.now(); }
}
