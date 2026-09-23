package Ranex.ruvo.repository;

import Ranex.ruvo.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // All products for a shop (shopkeeper My Products view)
    List<Product> findByShopId(Long shopId);

    // Only available products for a shop (customer view alternative)
    List<Product> findByShopIdAndIsAvailableTrue(Long shopId);
    

    List<Product> findByCategoryAndIsAvailableTrue(String category);
    // Get all available products from all approved and active shops (Explore mode)
    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Product p WHERE p.isAvailable = true AND p.shopId IN " +
        "(SELECT s.id FROM Shop s WHERE s.approved = true AND (s.active IS NULL OR s.active = true))"
    )
    List<Product> findExploreProducts();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Product p SET p.stockQuantity = p.stockQuantity - :quantity WHERE p.id = :productId AND p.stockQuantity >= :quantity")
    int reduceStockIfAvailable(@org.springframework.data.repository.query.Param("productId") Long productId, @org.springframework.data.repository.query.Param("quantity") Integer quantity);
}
