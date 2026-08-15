package Ranex.ruvo.jobs;

import Ranex.ruvo.service.DeliveryService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ScheduledDeliveryTimeoutJob {

    private final DeliveryService deliveryService;

    public ScheduledDeliveryTimeoutJob(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @Scheduled(fixedRate = 10000) // Every 10 seconds check for 1-minute expiration
    public void timeoutDeliveryRequests() {
        deliveryService.expireDeliveryRequests();
    }
}
