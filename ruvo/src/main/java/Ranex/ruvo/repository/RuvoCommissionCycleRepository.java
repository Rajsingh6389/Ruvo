package Ranex.ruvo.repository;

import Ranex.ruvo.model.RuvoCommissionCycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RuvoCommissionCycleRepository extends JpaRepository<RuvoCommissionCycle, Long> {

    Optional<RuvoCommissionCycle> findByCycleId(String cycleId);

    Optional<RuvoCommissionCycle> findByShopIdAndStatus(Long shopId, String status);

    List<RuvoCommissionCycle> findByShopIdAndStatusIn(Long shopId, List<String> statuses);

    List<RuvoCommissionCycle> findByShopId(Long shopId);

    /** Cycles that are still OPEN but past their cycleEnd */
    List<RuvoCommissionCycle> findByStatusAndCycleEndBefore(String status, Instant now);

    /** Cycles that are CLOSED / PENDING_PAYMENT / PARTIALLY_PAID but past dueAt */
    List<RuvoCommissionCycle> findByStatusInAndDueAtBefore(List<String> statuses, Instant now);

    /** Cycles that are OVERDUE and past grace period */
    List<RuvoCommissionCycle> findByStatusAndGracePeriodEndsAtBefore(String status, Instant now);

    /** Check if shop has any overdue cycles */
    boolean existsByShopIdAndStatus(Long shopId, String status);

    /** Check if shop has any cycles with outstanding > 0 */
    boolean existsByShopIdAndStatusIn(Long shopId, List<String> statuses);
}
