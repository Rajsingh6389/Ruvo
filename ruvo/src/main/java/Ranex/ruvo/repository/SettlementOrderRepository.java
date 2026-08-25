package Ranex.ruvo.repository;

import Ranex.ruvo.model.SettlementOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SettlementOrderRepository extends JpaRepository<SettlementOrder, Long> {

    List<SettlementOrder> findBySettlementId(Long settlementId);

    boolean existsByOrderId(Long orderId);

    List<SettlementOrder> findByOrderId(Long orderId);
}
