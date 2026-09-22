package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "push_notifications")
public class PushNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "app_type")
    private String appType; // CUSTOMER, SHOP, PARTNER, ADMIN

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "body", nullable = false, length = 1000)
    private String body;

    @Column(name = "data", length = 2000)
    private String data; // JSON string for additional structured data

    @Column(name = "type", nullable = false)
    private String type; // ORDER_PLACED, NEW_ORDER, ORDER_ACCEPTED, etc.

    @Column(name = "reference_type")
    private String referenceType; // ORDER, SHOP, SETTLEMENT, PAYMENT

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "delivered", nullable = false)
    @Builder.Default
    private Boolean delivered = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "read_at")
    private Instant readAt;

    public void setUserId(Long id) {
        this.userId = id != null ? String.valueOf(id) : null;
    }

    public void setUserId(String id) {
        this.userId = id;
    }
}
