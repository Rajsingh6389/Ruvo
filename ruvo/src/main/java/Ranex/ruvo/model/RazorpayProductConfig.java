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
    name = "razorpay_product_configs",
    indexes = {
        @Index(name = "idx_rzp_prod_linked_acc", columnList = "linked_account_id"),
        @Index(name = "idx_rzp_prod_status", columnList = "status")
    }
)
public class RazorpayProductConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "linked_account_id", nullable = false)
    private Long linkedAccountId;

    @Column(name = "product_name", nullable = false, length = 50)
    @Builder.Default
    private String productName = "route";

    @Column(name = "razorpay_product_id", length = 100)
    private String razorpayProductId;

    /**
     * created, requested, under_review, needs_clarification, activated, suspended, failed
     */
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "created";

    @Column(name = "tnc_accepted")
    @Builder.Default
    private Boolean tncAccepted = true;

    /**
     * JSON text containing pending dynamic requirements returned from Razorpay API
     */
    @Column(name = "pending_requirements", columnDefinition = "TEXT")
    private String pendingRequirements;

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
        if (productName == null) productName = "route";
        if (tncAccepted == null) tncAccepted = true;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
