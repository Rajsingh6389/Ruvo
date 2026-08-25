package Ranex.ruvo.repository;

import Ranex.ruvo.model.RuvoCommissionLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RuvoCommissionLedgerRepository extends JpaRepository<RuvoCommissionLedger, Long> {

    List<RuvoCommissionLedger> findByShopIdAndCycleId(Long shopId, Long cycleId);

    List<RuvoCommissionLedger> findByCycleId(Long cycleId);

    boolean existsByOrderId(Long orderId);

    List<RuvoCommissionLedger> findBySettlementId(Long settlementId);
}
