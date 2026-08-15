package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    // Customer snapshot stored at order creation so shopkeeper sees name + phone
    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_phone")
    private String customerPhone;

    @Column(name = "product_image_url")
    private String productImageUrl;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod; // e.g. "COD"

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus; // e.g. "PENDING", "PAID", "FAILED"

    @Column(name = "order_status", nullable = false)
    private String orderStatus; // e.g. "CONFIRMED", "PAYMENT_PENDING", "PAYMENT_FAILED", "PLACED"

    @Column(name = "delivery_address", nullable = false)
    private String deliveryAddress;

    // Delivery & Pricing fields (Phase 2 / Phase 4)
    @Column(name = "delivery_latitude")
    private Double deliveryLatitude;

    @Column(name = "delivery_longitude")
    private Double deliveryLongitude;

    @Column(name = "distance_km")
    private Double distanceKm;

    @Column(name = "subtotal")
    private Double subtotal;

    @Column(name = "delivery_fee")
    private Double deliveryFee;

    @Column(name = "platform_fee")
    private Double platformFee;

    // Tracking / Assignment fields (Phase 4 / Phase 7)
    @Column(name = "shop_response_deadline")
    private Instant shopResponseDeadline;

    @Column(name = "delivery_partner_id")
    private Long deliveryPartnerId;

    @Column(name = "delivery_otp_hash")
    private String deliveryOtpHash;

    @Column(name = "delivery_otp_verified")
    @Builder.Default
    private Boolean deliveryOtpVerified = false;

    @Column(name = "delivery_otp_expires_at")
    private Instant deliveryOtpExpiresAt;

    @Column(name = "picked_up_at")
    private Instant pickedUpAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
        if (paymentMethod == null) paymentMethod = "COD";
        // Only set defaults if they haven't already been explicitly set
        if (paymentStatus == null) {
            paymentStatus = "COD".equalsIgnoreCase(paymentMethod) ? "COD_PENDING" : "PENDING";
        }
        if (orderStatus == null) {
            // SHOP_PENDING for COD, PAYMENT_PENDING for online — caller should always set these explicitly
            orderStatus = "COD".equalsIgnoreCase(paymentMethod) ? "SHOP_PENDING" : "PAYMENT_PENDING";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
