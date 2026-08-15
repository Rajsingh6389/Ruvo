package Ranex.ruvo.jobs;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class ScheduledShopTimeoutJob {

    private final OrderRepository orderRepository;
    private final NotificationService notificationService;

    public ScheduledShopTimeoutJob(OrderRepository orderRepository, NotificationService notificationService) {
        this.orderRepository = orderRepository;
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
            
            // Optionally, we could issue refund if paid online here.
        }
    }
}
