package Ranex.ruvo.jobs;

import Ranex.ruvo.model.Settlement;
import Ranex.ruvo.repository.SettlementRepository;
import Ranex.ruvo.repository.ShopRepository;
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

    public ScheduledSettlementJob(SettlementRepository settlementRepository,
                                   ShopRepository shopRepository) {
        this.settlementRepository = settlementRepository;
        this.shopRepository = shopRepository;
    }

    /**
     * Runs every 15 minutes.
     * 1. Finds PENDING settlements past dueAt.
     * 2. Marks them OVERDUE.
     * 3. Blocks associated shops.
     */
    @Scheduled(fixedRate = 900_000) // 15 minutes
    @Transactional
    public void checkOverdueSettlements() {
        List<Settlement> overdueSettlements = settlementRepository
                .findByStatusAndDueAtBefore("PENDING", Instant.now());

        if (overdueSettlements.isEmpty()) return;

        // Mark each OVERDUE
        for (Settlement s : overdueSettlements) {
            s.setStatus("OVERDUE");
            settlementRepository.save(s);
        }

        // Group by shopId to decide which shops to block
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
