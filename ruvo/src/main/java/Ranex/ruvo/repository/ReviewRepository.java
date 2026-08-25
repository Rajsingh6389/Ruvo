package Ranex.ruvo.repository;

import Ranex.ruvo.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByShopIdAndIsApprovedTrueOrderByCreatedAtDesc(Long shopId);
    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Review> findByOrderIdAndUserId(Long orderId, Long userId);
    boolean existsByOrderIdAndUserId(Long orderId, Long userId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.shopId = :shopId AND r.isApproved = true")
    Double getAverageRatingByShopId(Long shopId);
    
    @Query("SELECT COUNT(r) FROM Review r WHERE r.shopId = :shopId AND r.isApproved = true")
    Long getCountByShopId(Long shopId);
}
