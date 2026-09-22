package Ranex.ruvo.repository;

import Ranex.ruvo.model.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    // Only shops that are approved by an admin.
    // NULL-safe: treats approved IS NULL as true so legacy rows are included.
    @Query("SELECT s FROM Shop s WHERE (s.approved IS NULL OR s.approved = true)")
    List<Shop> findAllApprovedAndActive();

    // All shops belonging to a given owner, regardless of approval status —
    // used so an owner can see their own shop while it's Pending Approval
    List<Shop> findByOwnerId(String ownerId);
    List<Shop> findByAuthIdentityId(Long authIdentityId);

    @Query("SELECT s FROM Shop s WHERE " +
           "(:authIdentityId IS NOT NULL AND s.authIdentityId = :authIdentityId) OR " +
           "(:ownerId IS NOT NULL AND :ownerId != '' AND s.ownerId = :ownerId) OR " +
           "(:mobile IS NOT NULL AND :mobile != '' AND (s.phone = :mobile OR s.ownerId = :mobile)) OR " +
           "(:cleanMobile IS NOT NULL AND :cleanMobile != '' AND (s.phone = :cleanMobile OR s.ownerId = :cleanMobile))")
    List<Shop> findByOwnerFlexible(
            @Param("ownerId") String ownerId,
            @Param("authIdentityId") Long authIdentityId,
            @Param("mobile") String mobile,
            @Param("cleanMobile") String cleanMobile);

    // Approved shops filtered by category — NULL-safe
    @Query("SELECT s FROM Shop s WHERE s.category = :category AND (s.approved IS NULL OR s.approved = true)")
    List<Shop> findByCategoryAndApprovedTrue(@Param("category") String category);

    // Shops still waiting on admin review (for an admin dashboard).
    // STRICT GATE: Only shops whose bank accounts are verified by Razorpay and passed all RuVo risk checks (READY_FOR_ADMIN / ADMIN_PENDING) are admitted.
    @Query("SELECT s FROM Shop s WHERE (s.approved IS NULL OR s.approved = false) " +
           "AND s.bankVerificationStatus IN ('READY_FOR_ADMIN', 'ADMIN_PENDING')")
    List<Shop> findPendingApproval();

    // Haversine formula to find approved shops within X kilometers, nearest first.
    // Includes a bounding box pre-filter for fast spatial indexing and quick execution.
    @Query(value = "SELECT * FROM shops s WHERE " +
           "(s.approved IS NULL OR s.approved = true) AND " +
           "(s.settlement_blocked IS NULL OR s.settlement_blocked = false) AND " +
           "s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND " +
           "s.latitude BETWEEN (:userLat - (:radius / 111.0)) AND (:userLat + (:radius / 111.0)) AND " +
           "s.longitude BETWEEN (:userLng - (:radius / (111.0 * COS(RADIANS(:userLat))))) AND (:userLng + (:radius / (111.0 * COS(RADIANS(:userLat))))) AND " +
           "(6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(:userLat)) * cos(radians(s.latitude)) * " +
           "cos(radians(s.longitude) - radians(:userLng)) + " +
           "sin(radians(:userLat)) * sin(radians(s.latitude)))))) <= :radius " +
           "ORDER BY (6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(:userLat)) * cos(radians(s.latitude)) * " +
           "cos(radians(s.longitude) - radians(:userLng)) + " +
           "sin(radians(:userLat)) * sin(radians(s.latitude)))))) ASC",
           nativeQuery = true)
    List<Shop> findNearbyShops(
            @Param("userLat") Double userLat,
            @Param("userLng") Double userLng,
            @Param("radius") Double radius);
}
