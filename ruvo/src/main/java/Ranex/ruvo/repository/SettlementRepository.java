package Ranex.ruvo.repository;

import Ranex.ruvo.model.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    Optional<Settlement> findBySettlementId(String settlementId);
    
    // For Shop-wise COD Due
    List<Settlement> findByShopIdAndStatusIn(Long shopId, List<String> statuses);
    
    List<Settlement> findByShopId(Long shopId);

    // For Partner's point of view on COD they owe / earnings
    List<Settlement> findByDeliveryPartnerIdAndSettlementTypeAndStatusIn(
        Long partnerId, String settlementType, List<String> statuses);

    List<Settlement> findByDeliveryPartnerIdAndStatusIn(Long partnerId, List<String> statuses);

    List<Settlement> findByDeliveryPartnerId(Long partnerId);
        
    // For Overdue Scheduler
    List<Settlement> findByStatusAndDueAtBefore(String status, Instant timestamp);
    
    // Check if shop has any overdue settlements
    boolean existsByShopIdAndStatus(Long shopId, String status);

    Optional<Settlement> findByDeliveryPartnerIdAndShopIdAndStatusIn(Long partnerId, Long shopId, List<String> statuses);
}
