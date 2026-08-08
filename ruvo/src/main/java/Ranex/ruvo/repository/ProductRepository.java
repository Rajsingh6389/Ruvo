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
}
