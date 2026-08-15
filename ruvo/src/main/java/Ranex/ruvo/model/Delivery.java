package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "deliveries")
public class Delivery {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(nullable = false)
    private String status; // "CREATED", "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"

    @Column(name = "pickup_location", nullable = false)
    private String pickupLocation;

    @Column(name = "delivery_location", nullable = false)
    private String deliveryLocation;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "picked_up_at")
    private Instant pickedUpAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "delivery_fee", nullable = false)
    private Double deliveryFee;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
        if (status == null) status = "CREATED";
        if (deliveryFee == null) deliveryFee = 50.0; // Default flat delivery earning rate
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
