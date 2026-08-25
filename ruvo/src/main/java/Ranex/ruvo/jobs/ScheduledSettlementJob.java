package Ranex.ruvo.jobs;

import Ranex.ruvo.model.Settlement;
import Ranex.ruvo.repository.SettlementRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.service.RuvoCommissionService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class ScheduledSettlementJob {

    private final SettlementRepository settlementRepository;
    private final ShopRepository shopRepository;
    private final RuvoCommissionService commissionService;

    public ScheduledSettlementJob(SettlementRepository settlementRepository,
                                  ShopRepository shopRepository,
                                  RuvoCommissionService commissionService) {
        this.settlementRepository = settlementRepository;
        this.shopRepository = shopRepository;
        this.commissionService = commissionService;
    }

    /**
     * Runs every 15 minutes.
     * 1. Finds PENDING settlements past dueAt.
     * 2. Marks them OVERDUE.
     * 3. Blocks associated shops for settlement.
     */
    @Scheduled(fixedRate = 900_000) // 15 minutes
    @Transactional
    public void checkOverdueSettlements() {
        List<Settlement> overdueSettlements = settlementRepository
                .findByStatusAndDueAtBefore("PENDING", Instant.now());

        if (overdueSettlements.isEmpty()) return;

        for (Settlement s : overdueSettlements) {
            s.setStatus("OVERDUE");
            settlementRepository.save(s);
        }

        Map<Long, Long> shopOverdueCount = overdueSettlements.stream()
                .collect(Collectors.groupingBy(Settlement::getShopId, Collectors.counting()));

        shopOverdueCount.keySet().forEach(shopId -> {
            shopRepository.findById(shopId).ifPresent(shop -> {
                if (!Boolean.TRUE.equals(shop.getSettlementBlocked())) {
                    shop.setSettlementBlocked(true);
                    shopRepository.save(shop);
                    System.out.println("[SettlementScheduler] Shop " + shop.getName() + " blocked due to overdue settlement.");
                }
            });
        });
    }

    /**
     * Runs every hour to manage RuVo commission 2-day cycles:
     * 1. Closes cycles past cycleEnd
     * 2. Marks unpaid closed cycles as OVERDUE after dueAt
     * 3. Applies COD restriction on shops with overdue cycles past grace period
     */
    @Scheduled(fixedRate = 3_600_000) // 1 hour
    @Transactional
    public void processCommissionCycles() {
        try {
            commissionService.closeExpiredCycles();
            commissionService.markOverdueCycles();
            commissionService.applyCodRestrictions();
        } catch (Exception e) {
            System.err.println("[CommissionScheduler Error] " + e.getMessage());
        }
    }

    /**
     * Called externally after a settlement is PAID to check if shop should be unblocked.
     */
    @Transactional
    public void checkAndUnblockShop(Long shopId) {
        boolean hasOverdue = settlementRepository.existsByShopIdAndStatus(shopId, "OVERDUE");
        boolean hasPending = settlementRepository.existsByShopIdAndStatus(shopId, "PENDING");

        if (!hasOverdue && !hasPending) {
            shopRepository.findById(shopId).ifPresent(shop -> {
                shop.setSettlementBlocked(false);
                shopRepository.save(shop);
                System.out.println("[SettlementScheduler] Shop " + shop.getName() + " unblocked. All settlements cleared.");
            });
        }
    }
}
