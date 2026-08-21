package Ranex.ruvo.repository;

import Ranex.ruvo.model.DeliveryPartner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryPartnerRepository extends JpaRepository<DeliveryPartner, Long> {
    
    Optional<DeliveryPartner> findByUserId(String userId);
    Optional<DeliveryPartner> findByAuthIdentityId(Long authIdentityId);
    Optional<DeliveryPartner> findByPhone(String phone);

    List<DeliveryPartner> findByApprovedFalse();

    List<DeliveryPartner> findByShopIdAndApprovedTrueAndActiveTrueAndAvailableTrue(Long shopId);

    List<DeliveryPartner> findByApprovedTrueAndActiveTrueAndAvailableTrue();

    // Find all RuVo (shopId IS NULL), approved, active, available partners within a radius
    @Query(value = "SELECT * FROM delivery_partners dp WHERE " +
           "dp.shop_id IS NULL AND dp.approved = true AND dp.active = true AND dp.available = true AND " +
           "dp.latitude IS NOT NULL AND dp.longitude IS NOT NULL AND " +
           "(6371 * acos(cos(radians(:pickupLat)) * cos(radians(dp.latitude)) * " +
           "cos(radians(dp.longitude) - radians(:pickupLng)) + " +
           "sin(radians(:pickupLat)) * sin(radians(dp.latitude)))) <= :radiusKm " +
           "ORDER BY (6371 * acos(cos(radians(:pickupLat)) * cos(radians(dp.latitude)) * " +
           "cos(radians(dp.longitude) - radians(:pickupLng)) + " +
           "sin(radians(:pickupLat)) * sin(radians(dp.latitude)))) ASC", 
           nativeQuery = true)
    List<DeliveryPartner> findNearbyRuvoPartners(Double pickupLat, Double pickupLng, Double radiusKm);
}
