package Ranex.ruvo.service;

import Ranex.ruvo.model.Notification;
import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.NotificationRepository;
import Ranex.ruvo.repository.ShopRepository;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ShopRepository shopRepository;

    public NotificationService(NotificationRepository notificationRepository, ShopRepository shopRepository) {
        this.notificationRepository = notificationRepository;
        this.shopRepository = shopRepository;
    }

    public void notifyShop(Order order) {
        Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
        if (shop != null && shop.getOwnerId() != null) {
            Notification notification = Notification.builder()
                .userId(shop.getOwnerId())
                .orderId(order.getId())
                .type("SHOP_NEW_ORDER")
                .title("New Order #" + order.getId())
                .message(order.getQuantity() + " items. Total: ₹" + order.getTotalAmount() + ". Accept within 10 minutes.")
                .build();
            notificationRepository.save(notification);
        }
    }

    public void notifyCustomer(Order order, String title, String message, String type) {
        Notification notification = Notification.builder()
            .userId(order.getUserId())
            .orderId(order.getId())
            .type(type)
            .title(title)
            .message(message)
            .build();
        notificationRepository.save(notification);
    }
}
