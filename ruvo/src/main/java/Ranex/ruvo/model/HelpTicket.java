package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "help_tickets")
public class HelpTicket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_type", nullable = false)
    private String userType; // USER, SHOP_OWNER, PARTNER

    @Column(name = "category", nullable = false)
    private String category; // BUG_REPORT, FEATURE_REQUEST, IMPROVEMENT, GENERAL, ORDER_ISSUE, PAYMENT_ISSUE

    @Column(name = "subject", nullable = false)
    private String subject;

    @Column(name = "description", nullable = false, length = 2000)
    private String description;

    @Column(name = "priority")
    @Builder.Default
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "OPEN"; // OPEN, IN_PROGRESS, RESOLVED, CLOSED

    @Column(name = "admin_response", length = 2000)
    private String adminResponse;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by")
    private Long resolvedBy;
}
