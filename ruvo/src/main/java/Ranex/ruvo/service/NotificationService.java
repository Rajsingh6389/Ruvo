package Ranex.ruvo.service;

import Ranex.ruvo.model.DeviceToken;
import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.PushNotification;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.DeviceTokenRepository;
import Ranex.ruvo.repository.PushNotificationRepository;
import Ranex.ruvo.repository.ShopRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

@Service
public class NotificationService {

    @Value("${fcm.server.key:}")
    private String fcmServerKey;

    @Value("${fcm.send.url:https://fcm.googleapis.com/fcm/send}")
    private String fcmSendUrl;

    private final DeviceTokenRepository deviceTokenRepository;
    private final PushNotificationRepository notificationRepository;
    private final ShopRepository shopRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public NotificationService(DeviceTokenRepository deviceTokenRepository,
                              PushNotificationRepository notificationRepository,
                              ShopRepository shopRepository,
                              RestTemplate restTemplate,
                              ObjectMapper objectMapper) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.notificationRepository = notificationRepository;
        this.shopRepository = shopRepository;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Register or update device token for push notifications
     */
    public void registerDeviceToken(Long userId, String userType, String token, String platform, String appVersion) {
        Optional<DeviceToken> existing = deviceTokenRepository.findByToken(token);
        
        if (existing.isPresent()) {
            DeviceToken deviceToken = existing.get();
            deviceToken.setUserId(userId);
            deviceToken.setUserType(userType);
            deviceToken.setPlatform(platform);
            deviceToken.setAppVersion(appVersion);
            deviceToken.setActive(true);
            deviceToken.setUpdatedAt(Instant.now());
            deviceToken.setLastUsedAt(Instant.now());
            deviceTokenRepository.save(deviceToken);
        } else {
            DeviceToken deviceToken = DeviceToken.builder()
                .userId(userId)
                .userType(userType)
                .token(token)
                .platform(platform)
                .appVersion(appVersion)
                .active(true)
                .lastUsedAt(Instant.now())
                .build();
            deviceTokenRepository.save(deviceToken);
        }
    }

    /**
     * Unregister device token
     */
    public void unregisterDeviceToken(String token) {
        deviceTokenRepository.findByToken(token).ifPresent(dt -> {
            dt.setActive(false);
            dt.setUpdatedAt(Instant.now());
            deviceTokenRepository.save(dt);
        });
    }

    /**
     * Send push notification to a specific user
     */
    public void sendToUser(Long userId, String userType, String title, String body, 
                          String type, String referenceType, Long referenceId, Map<String, Object> data) {
        // Save notification to database
        PushNotification notification = PushNotification.builder()
            .userId(userId)
            .title(title)
            .body(body)
            .type(type)
            .referenceType(referenceType)
            .referenceId(referenceId)
            .build();

        if (data != null) {
            try {
                notification.setData(objectMapper.writeValueAsString(data));
            } catch (Exception e) {
                notification.setData("{}");
            }
        }

        notification = notificationRepository.save(notification);

        // Send push via FCM
        List<DeviceToken> tokens = deviceTokenRepository.findByUserIdAndUserTypeAndActiveTrue(userId, userType);
        for (DeviceToken deviceToken : tokens) {
            sendFcmPush(deviceToken.getToken(), title, body, data);
        }

        // Mark as delivered
        notification.setDelivered(true);
        notification.setDeliveredAt(Instant.now());
        notificationRepository.save(notification);
    }

    /**
     * Send push notification to all users of a specific type
     */
    public void sendToUserType(String userType, String title, String body, Map<String, Object> data) {
        List<DeviceToken> tokens = deviceTokenRepository.findByUserTypeAndActiveTrue(userType);
        for (DeviceToken deviceToken : tokens) {
            sendFcmPush(deviceToken.getToken(), title, body, data);
            
            // Save notification
            PushNotification notification = PushNotification.builder()
                .userId(deviceToken.getUserId())
                .title(title)
                .body(body)
                .type("SYSTEM")
                .delivered(true)
                .deliveredAt(Instant.now())
                .build();
            notificationRepository.save(notification);
        }
    }

    /**
     * Send FCM push notification
     */
    private void sendFcmPush(String token, String title, String body, Map<String, Object> data) {
        if (fcmServerKey == null || fcmServerKey.isBlank()) {
            // FCM not configured, skip
            return;
        }

        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("title", title);
            notification.put("body", body);
            notification.put("sound", "default");

            Map<String, Object> message = new HashMap<>();
            message.put("to", token);
            message.put("notification", notification);
            if (data != null) {
                message.put("data", data);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "key=" + fcmServerKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(message, headers);
            restTemplate.exchange(fcmSendUrl, HttpMethod.POST, entity, String.class);
        } catch (Exception e) {
            // Log error but don't throw
            System.err.println("Failed to send FCM push: " + e.getMessage());
        }
    }

    /**
     * Get user notifications
     */
    public List<PushNotification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notification count
     */
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    /**
     * Mark notification as read
     */
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            n.setReadAt(Instant.now());
            notificationRepository.save(n);
        });
    }

    /**
     * Mark all user notifications as read
     */
    public void markAllAsRead(Long userId) {
        List<PushNotification> unread = notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        for (PushNotification n : unread) {
            n.setRead(true);
            n.setReadAt(Instant.now());
            notificationRepository.save(n);
        }
    }

    // =========================================================
    // CONVENIENCE METHODS — used by controllers
    // =========================================================

    /**
     * Send notification to the customer who placed an order.
     */
    public void notifyCustomer(Order order, String title, String body, String type) {
        try {
            Long userId = Long.parseLong(order.getUserId());
            Map<String, Object> data = Map.of(
                "type", type,
                "orderId", order.getId()
            );
            sendToUser(userId, "CUSTOMER", title, body, type, "ORDER", order.getId(), data);
        } catch (Exception e) {
            System.err.println("[NotificationService] notifyCustomer failed for order #"
                + order.getId() + ": " + e.getMessage());
        }
    }

    /**
     * Send notification to the shop that received an order.
     */
    public void notifyShop(Order order) {
        try {
            Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
            if (shop == null || shop.getOwnerId() == null) {
                System.err.println("[NotificationService] notifyShop: shop not found or no ownerId for shop #"
                    + order.getShopId());
                return;
            }
            Long shopUserId = Long.parseLong(shop.getOwnerId());
            String title = "New Order #" + order.getId();
            String body = "You have a new order. Total: \u20b9" + order.getTotalAmount();
            Map<String, Object> data = Map.of(
                "type", "NEW_ORDER",
                "orderId", order.getId()
            );
            sendToUser(shopUserId, "SHOP", title, body, "NEW_ORDER", "ORDER", order.getId(), data);
        } catch (Exception e) {
            System.err.println("[NotificationService] notifyShop failed for order #"
                + order.getId() + ": " + e.getMessage());
        }
    }
}
