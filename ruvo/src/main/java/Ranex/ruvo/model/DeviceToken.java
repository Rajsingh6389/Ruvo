package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "device_tokens")
public class DeviceToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_type", nullable = false)
    private String userType; // USER, SHOP_OWNER, PARTNER

    @Column(name = "token", nullable = false, length = 500)
    private String token;

    @Column(name = "platform")
    private String platform; // ANDROID, IOS

    @Column(name = "app_version")
    private String appVersion;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;
}
