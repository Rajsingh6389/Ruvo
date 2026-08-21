package Ranex.ruvo.jobs;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Automatically sets all currently-online delivery partners to OFFLINE at midnight every day.
 * This prevents partners from remaining online across day boundaries unintentionally.
 *
 * The partner app also has a corresponding client-side midnight timer that shows
 * an "Auto-Offline" banner so the partner is aware they were taken offline.
 */
@Component
public class ScheduledPartnerOfflineJob {

    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public ScheduledPartnerOfflineJob(DeliveryPartnerRepository deliveryPartnerRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    /**
     * Runs at midnight (00:00:00) every day.
     * Takes all currently-available partners offline automatically.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void autoOfflineAtMidnight() {
        List<DeliveryPartner> onlinePartners = deliveryPartnerRepository.findByApprovedTrueAndActiveTrueAndAvailableTrue();
        if (onlinePartners.isEmpty()) {
            System.out.println("🌙 [AutoOffline] No online partners to take offline at midnight.");
            return;
        }

        for (DeliveryPartner partner : onlinePartners) {
            partner.setAvailable(false);
        }
        deliveryPartnerRepository.saveAll(onlinePartners);

        System.out.println("🌙 [AutoOffline] Midnight reset: " + onlinePartners.size() + " partner(s) taken offline automatically.");
    }
}
