package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

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

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod; // e.g. "COD"

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus; // e.g. "PENDING", "PAID", "FAILED"

    @Column(name = "order_status", nullable = false)
    private String orderStatus; // e.g. "CONFIRMED", "PAYMENT_PENDING", "PAYMENT_FAILED", "PLACED"

    @Column(name = "delivery_address", nullable = false)
    private String deliveryAddress;

    // Delivery & Pricing fields
    @Column(name = "delivery_latitude")
    private Double deliveryLatitude;

    @Column(name = "delivery_longitude")
    private Double deliveryLongitude;

    @Column(name = "distance_km")
    private Double distanceKm;

    @Column(name = "subtotal", precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "delivery_fee", precision = 12, scale = 2)
    private BigDecimal deliveryFee;

    @Column(name = "platform_fee", precision = 12, scale = 2)
    private BigDecimal platformFee;

    @Column(name = "coupon_code")
    private String couponCode;

    @Column(name = "coupon_discount", precision = 12, scale = 2)
    private BigDecimal couponDiscount;

    @Column(name = "wallet_amount_used", precision = 12, scale = 2)
    private BigDecimal walletAmountUsed;

    // Tracking / Assignment fields
    @Column(name = "shop_response_deadline")
    private Instant shopResponseDeadline;

    /**
     * When the rider search began. The 10-minute dispatch window is measured from here,
     * not from createdAt — a shop may take up to 10 minutes to accept, which would
     * otherwise leave the order no time to find a rider at all.
     */
    @Column(name = "dispatch_started_at")
    private Instant dispatchStartedAt;

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

    @Column(name = "handover_otp")
    private String handoverOtp;

    @Column(name = "handover_otp_generated_at")
    private Instant handoverOtpGeneratedAt;

    @Column(name = "handover_verified")
    @Builder.Default
    private Boolean handoverVerified = false;

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

    // ==========================================
    // TRANSIENT FIELDS (Not persisted in this table)
    // ==========================================
    @Transient
    private String customerEmail;

    @Transient
    private List<OrderItem> items;
}
