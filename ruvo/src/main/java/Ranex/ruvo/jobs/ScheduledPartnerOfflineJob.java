package Ranex.ruvo.jobs;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.model.User;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Automatically sets all currently-online delivery partners to OFFLINE at midnight every day.
 * This prevents partners from remaining online across day boundaries unintentionally.
 */
@Component
public class ScheduledPartnerOfflineJob {

    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final UserRepository userRepository;

    public ScheduledPartnerOfflineJob(DeliveryPartnerRepository deliveryPartnerRepository, UserRepository userRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.userRepository = userRepository;
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
            if (partner.getUserId() != null) {
                Optional<User> uOpt = userRepository.findByMobileNumber(partner.getUserId())
                        .or(() -> partner.getPhone() != null ? userRepository.findByMobileNumber(partner.getPhone()) : Optional.empty());
                uOpt.ifPresent(u -> {
                    u.setIsAvailable(false);
                    userRepository.save(u);
                });
            }
        }
        deliveryPartnerRepository.saveAll(onlinePartners);

        System.out.println("🌙 [AutoOffline] Midnight reset: " + onlinePartners.size() + " partner(s) taken offline automatically.");
    }
}
