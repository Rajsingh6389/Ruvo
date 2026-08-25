package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "reviews")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "rating", nullable = false)
    private Integer rating; // 1-5 stars

    @Column(name = "review_text", length = 1000)
    private String reviewText;

    @Column(name = "is_anonymous", nullable = false)
    @Builder.Default
    private Boolean isAnonymous = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "is_approved", nullable = false)
    @Builder.Default
    private Boolean isApproved = true;
}
