package Ranex.ruvo.repository;

import Ranex.ruvo.model.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    
    // For Shop-wise COD Due
    List<Settlement> findByShopIdAndStatusIn(Long shopId, List<String> statuses);
    
    // For Partner's point of view on COD they owe
    List<Settlement> findByDeliveryPartnerIdAndSettlementTypeAndStatusIn(
        Long partnerId, String settlementType, List<String> statuses);
        
    // For Overdue Scheduler
    List<Settlement> findByStatusAndDueAtBefore(String status, Instant timestamp);
    
    // Check if shop has any overdue settlements
    boolean existsByShopIdAndStatus(Long shopId, String status);
}
