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

    default Optional<DeliveryPartner> findByPhoneFlexible(String phone) {
        if (phone == null || phone.isBlank()) return Optional.empty();

        Optional<DeliveryPartner> opt = findByPhone(phone);
        if (opt.isPresent()) return opt;

        String cleanDigits = phone.replaceAll("[^0-9]", "");

        if (cleanDigits.length() == 10) {
            opt = findByPhone("+91" + cleanDigits);
            if (opt.isPresent()) return opt;

            opt = findByPhone(cleanDigits);
            if (opt.isPresent()) return opt;
        }

        if (cleanDigits.length() == 12 && cleanDigits.startsWith("91")) {
            String bare10 = cleanDigits.substring(2);
            opt = findByPhone(bare10);
            if (opt.isPresent()) return opt;

            opt = findByPhone("+" + cleanDigits);
            if (opt.isPresent()) return opt;

            opt = findByPhone(cleanDigits);
            if (opt.isPresent()) return opt;
        }

        if (phone.startsWith("+91")) {
            String rawWithoutPlus = phone.substring(3);
            opt = findByPhone(rawWithoutPlus);
            if (opt.isPresent()) return opt;
        }

        return Optional.empty();
    }

    default Optional<DeliveryPartner> findByUserIdFlexible(String userId) {
        if (userId == null || userId.isBlank()) return Optional.empty();

        Optional<DeliveryPartner> opt = findByUserId(userId);
        if (opt.isPresent()) return opt;

        String cleanDigits = userId.replaceAll("[^0-9]", "");

        if (cleanDigits.length() == 10) {
            opt = findByUserId("+91" + cleanDigits);
            if (opt.isPresent()) return opt;

            opt = findByUserId(cleanDigits);
            if (opt.isPresent()) return opt;
        }

        if (cleanDigits.length() == 12 && cleanDigits.startsWith("91")) {
            String bare10 = cleanDigits.substring(2);
            opt = findByUserId(bare10);
            if (opt.isPresent()) return opt;

            opt = findByUserId("+" + cleanDigits);
            if (opt.isPresent()) return opt;

            opt = findByUserId(cleanDigits);
            if (opt.isPresent()) return opt;
        }

        if (userId.startsWith("+91")) {
            String rawWithoutPlus = userId.substring(3);
            opt = findByUserId(rawWithoutPlus);
            if (opt.isPresent()) return opt;
        }

        return Optional.empty();
    }


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
