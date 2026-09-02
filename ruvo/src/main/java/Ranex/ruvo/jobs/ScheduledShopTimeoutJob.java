package Ranex.ruvo.jobs;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class ScheduledShopTimeoutJob {

    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final NotificationService notificationService;

    public ScheduledShopTimeoutJob(OrderRepository orderRepository, ShopRepository shopRepository, NotificationService notificationService) {
        this.orderRepository = orderRepository;
        this.shopRepository = shopRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRate = 60000)
    public void timeoutPendingOrders() {
        // Find orders in SHOP_PENDING status where shopResponseDeadline has passed
        List<Order> orders = orderRepository.findAll().stream()
            .filter(o -> OrderStatus.SHOP_PENDING.equals(o.getOrderStatus()))
            .filter(o -> o.getShopResponseDeadline() != null && o.getShopResponseDeadline().isBefore(Instant.now()))
            .toList();

        for (Order order : orders) {
            order.setOrderStatus(OrderStatus.SHOP_TIMEOUT);
            orderRepository.save(order);
            
            notificationService.notifyCustomer(
                order, 
                "Order Cancelled", 
                "The shop did not respond in time for Order #" + order.getId(), 
                "SHOP_TIMEOUT"
            );
        }
    }

    @Scheduled(fixedRate = 300000) // Runs every 5 minutes
    public void autoDisableShopsWithOverdueCodSettlement() {
        List<Shop> shops = shopRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        for (Shop shop : shops) {
            if (shop.getUnpaidPlatformFee() != null 
                && shop.getUnpaidPlatformFee().compareTo(java.math.BigDecimal.ZERO) > 0
                && shop.getOldestUnpaidCodAt() != null) {
                
                long hoursElapsed = Duration.between(shop.getOldestUnpaidCodAt(), now).toHours();
                if (hoursElapsed >= 48 && Boolean.TRUE.equals(shop.getActive())) {
                    shop.setActive(false);
                    shop.setDisabledDueToSettlement(true);
                    shopRepository.save(shop);
                }
            }
        }
    }
}
