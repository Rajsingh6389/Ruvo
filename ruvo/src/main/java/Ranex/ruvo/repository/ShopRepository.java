package Ranex.ruvo.repository;

import Ranex.ruvo.model.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    // Only shops that are approved by an admin AND active.
    // NULL-safe: treats approved/active IS NULL as true so legacy rows are included.
    @Query("SELECT s FROM Shop s WHERE (s.approved IS NULL OR s.approved = true) AND (s.active IS NULL OR s.active = true)")
    List<Shop> findAllApprovedAndActive();

    // All shops belonging to a given owner, regardless of approval status —
    // used so an owner can see their own shop while it's Pending Approval
    List<Shop> findByOwnerId(String ownerId);
    List<Shop> findByAuthIdentityId(Long authIdentityId);

    // Approved active shops filtered by category — NULL-safe
    @Query("SELECT s FROM Shop s WHERE s.category = :category AND (s.approved IS NULL OR s.approved = true) AND (s.active IS NULL OR s.active = true)")
    List<Shop> findByCategoryAndApprovedTrue(@Param("category") String category);

    // Shops still waiting on admin review (for an admin dashboard)
    List<Shop> findByApprovedFalse();

    // Haversine formula to find approved shops within X kilometers, nearest first.
    // Treats approved/active IS NULL as true too, in case any legacy rows predate the columns.
    @Query(value = "SELECT * FROM shops s WHERE " +
           "(s.approved IS NULL OR s.approved = true) AND " +
           "(s.active IS NULL OR s.active = true) AND " +
           "(s.settlement_blocked IS NULL OR s.settlement_blocked = false) AND " +
           "(6371 * acos(cos(radians(:userLat)) * cos(radians(s.latitude)) * " +
           "cos(radians(s.longitude) - radians(:userLng)) + " +
           "sin(radians(:userLat)) * sin(radians(s.latitude)))) <= :radius " +
           "ORDER BY (6371 * acos(cos(radians(:userLat)) * cos(radians(s.latitude)) * " +
           "cos(radians(s.longitude) - radians(:userLng)) + " +
           "sin(radians(:userLat)) * sin(radians(s.latitude)))) ASC",
           nativeQuery = true)
    List<Shop> findNearbyShops(
            @Param("userLat") Double userLat,
            @Param("userLng") Double userLng,
            @Param("radius") Double radius);
}
