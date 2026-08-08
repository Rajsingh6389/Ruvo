package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String category;

    @Column(name = "brand_name")
    private String brandName;

    private String description;

    // Actual / MRP price
    @Column(name = "actual_price", nullable = false)
    private Double actualPrice;

    // Price at which shopkeeper sells the product
    @Column(name = "selling_price", nullable = false)
    private Double sellingPrice;

    // Discount percentage — always calculated server-side
    private Double discount;

    // Available stock
    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity;

    // Example: kg, g, litre, ml, piece, pack
    private String unit;

    @Column(name = "image_url")
    private String imageUrl;

    // Shopkeeper can turn this OFF without deleting the product
    @Column(name = "is_available", nullable = false)
    @Builder.Default
    private Boolean isAvailable = true;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;
}
