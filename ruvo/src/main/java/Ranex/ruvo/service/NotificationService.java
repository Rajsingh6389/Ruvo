package Ranex.ruvo.service;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.model.DeviceToken;
import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.PushNotification;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.DeviceTokenRepository;
import Ranex.ruvo.repository.PushNotificationRepository;
import Ranex.ruvo.repository.ShopRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final DeviceTokenRepository deviceTokenRepository;
    private final PushNotificationRepository notificationRepository;
    private final ShopRepository shopRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final ExpoPushNotificationService expoPushNotificationService;
    private final ObjectMapper objectMapper;

    public NotificationService(DeviceTokenRepository deviceTokenRepository,
                               PushNotificationRepository notificationRepository,
                               ShopRepository shopRepository,
                               DeliveryPartnerRepository deliveryPartnerRepository,
                               ExpoPushNotificationService expoPushNotificationService,
                               ObjectMapper objectMapper) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.notificationRepository = notificationRepository;
        this.shopRepository = shopRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.expoPushNotificationService = expoPushNotificationService;
        this.objectMapper = objectMapper;
    }

    /**
     * Register or update device push token
     */
    public void registerDeviceToken(String userId, String appType, String token, String platform, String appVersion) {
        if (token == null || token.isBlank() || userId == null || userId.isBlank()) {
            return;
        }

        String normalizedType = appType != null ? appType.toUpperCase().trim() : "CUSTOMER";
        String normalizedPlatform = platform != null ? platform.toUpperCase().trim() : "ANDROID";

        Optional<DeviceToken> existing = deviceTokenRepository.findByToken(token.trim());
        DeviceToken deviceToken;
        if (existing.isPresent()) {
            deviceToken = existing.get();
            deviceToken.setUserId(userId.trim());
            deviceToken.setAppType(normalizedType);
            deviceToken.setPlatform(normalizedPlatform);
            deviceToken.setAppVersion(appVersion != null ? appVersion : "1.0");
            deviceToken.setActive(true);
            deviceToken.setUpdatedAt(Instant.now());
            deviceToken.setLastUsedAt(Instant.now());
        } else {
            deviceToken = DeviceToken.builder()
                    .userId(userId.trim())
                    .appType(normalizedType)
                    .token(token.trim())
                    .platform(normalizedPlatform)
                    .appVersion(appVersion != null ? appVersion : "1.0")
                    .active(true)
                    .createdAt(Instant.now())
                    .lastUsedAt(Instant.now())
                    .build();
        }
        deviceTokenRepository.save(deviceToken);
        log.info("Registered push token for user {} ({}, {})", userId, normalizedType, normalizedPlatform);
    }

    /**
     * Backward-compatible token registration
     */
    public void registerDeviceToken(Long userId, String userType, String token, String platform, String appVersion) {
        registerDeviceToken(userId != null ? String.valueOf(userId) : null, userType, token, platform, appVersion);
    }

    /**
     * Unregister / deactivate push token on logout
     */
    public void unregisterDeviceToken(String token) {
        if (token == null || token.isBlank()) return;
        deviceTokenRepository.findByToken(token.trim()).ifPresent(dt -> {
            dt.setActive(false);
            dt.setUpdatedAt(Instant.now());
            deviceTokenRepository.save(dt);
            log.info("Deactivated push token: {}", token);
        });
    }

    /**
     * Core dispatch method: Persists in-app history + sends real remote push via Expo
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PushNotification sendNotification(String userId, String appType, String notificationType,
                                            String title, String message, Map<String, Object> data,
                                            String referenceType, Long referenceId, Long orderId,
                                            String priority, String channelId) {
        if (userId == null || userId.isBlank()) {
            log.warn("Cannot send notification without userId");
            return null;
        }

        String normAppType = appType != null ? appType.toUpperCase().trim() : "CUSTOMER";
        String normChannel = channelId != null ? channelId : resolveDefaultChannel(normAppType, notificationType);
        String normPriority = priority != null ? priority : ("NEW_ORDER".equals(notificationType) || "NEW_DELIVERY_REQUEST".equals(notificationType) ? "high" : "default");

        // 1. Save in-app notification in MySQL
        PushNotification notification = PushNotification.builder()
                .userId(userId.trim())
                .appType(normAppType)
                .title(title)
                .body(message)
                .type(notificationType)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .orderId(orderId)
                .isRead(false)
                .delivered(false)
                .createdAt(Instant.now())
                .build();

        Map<String, Object> payloadData = data != null ? new HashMap<>(data) : new HashMap<>();
        payloadData.put("notificationType", notificationType);
        payloadData.put("appType", normAppType);
        payloadData.put("type", notificationType);
        if (orderId != null) payloadData.put("orderId", String.valueOf(orderId));
        if (referenceId != null) payloadData.put("referenceId", String.valueOf(referenceId));
        if (referenceType != null) payloadData.put("referenceType", referenceType);

        try {
            notification.setData(objectMapper.writeValueAsString(payloadData));
        } catch (Exception e) {
            notification.setData("{}");
        }

        notification = notificationRepository.save(notification);
        payloadData.put("notificationId", String.valueOf(notification.getId()));

        // 2. Resolve active device tokens for the user and appType
        List<DeviceToken> tokens = deviceTokenRepository.findActiveTokensForUserFlexible(userId.trim(), normAppType);
        if (tokens.isEmpty() && !"CUSTOMER".equals(normAppType)) {
            // Also try fallback by user ID without app filter if none found
            tokens = deviceTokenRepository.findActiveTokensForUserFlexible(userId.trim(), null);
        }

        log.info("Sending push notification [{}] to user {} (Tokens found: {})", notificationType, userId, tokens.size());

        boolean anyDelivered = false;
        for (DeviceToken deviceToken : tokens) {
            boolean sent = expoPushNotificationService.sendPushNotification(
                    deviceToken.getToken(),
                    title,
                    message,
                    payloadData,
                    normChannel,
                    normPriority
            );
            if (sent) anyDelivered = true;
        }

        if (anyDelivered) {
            notification.setDelivered(true);
            notification.setDeliveredAt(Instant.now());
            notificationRepository.save(notification);
        }

        return notification;
    }

    /**
     * Backward-compatible sendToUser
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendToUser(Long userId, String userType, String title, String body,
                           String type, String referenceType, Long referenceId, Map<String, Object> data) {
        Long orderId = "ORDER".equalsIgnoreCase(referenceType) ? referenceId : null;
        sendNotification(
                String.valueOf(userId),
                userType,
                type,
                title,
                body,
                data,
                referenceType,
                referenceId,
                orderId,
                "high",
                resolveDefaultChannel(userType, type)
        );
    }

    /**
     * Send broadcast notification to all active devices of an appType
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendToUserType(String userType, String title, String body, Map<String, Object> data) {
        String normApp = userType != null ? userType.toUpperCase() : "CUSTOMER";
        List<DeviceToken> tokens = deviceTokenRepository.findByAppTypeAndActiveTrue(normApp);
        log.info("Broadcasting push notification to {} device(s) of type {}", tokens.size(), normApp);

        for (DeviceToken deviceToken : tokens) {
            expoPushNotificationService.sendPushNotification(
                    deviceToken.getToken(),
                    title,
                    body,
                    data,
                    resolveDefaultChannel(normApp, "SYSTEM"),
                    "default"
            );
        }
    }

    // =========================================================================
    // PHASE 8: CUSTOMER PUSH NOTIFICATIONS
    // =========================================================================

    public void notifyCustomerOrderPlaced(Order order) {
        if (order == null || order.getUserId() == null) return;
        String title = "Order Placed 🎉";
        String message = "Your Ruvo order #" + order.getId() + " has been placed successfully.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "CustomerTracking");
        sendNotification(order.getUserId(), "CUSTOMER", "ORDER_PLACED", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_orders");
    }

    public void notifyCustomerOrderAccepted(Order order, String shopName) {
        if (order == null || order.getUserId() == null) return;
        String name = shopName != null ? shopName : "the shop";
        String title = "Order Accepted ✅";
        String message = "Your order from " + name + " has been accepted.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "CustomerTracking");
        sendNotification(order.getUserId(), "CUSTOMER", "ORDER_ACCEPTED", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_orders");
    }

    public void notifyCustomerOrderRejected(Order order, String shopName) {
        if (order == null || order.getUserId() == null) return;
        String name = shopName != null ? shopName : "The shop";
        String title = "Order Couldn’t Be Accepted";
        String message = name + " couldn't accept your order.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "OrderHistory");
        sendNotification(order.getUserId(), "CUSTOMER", "ORDER_REJECTED", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_orders");
    }

    public void notifyCustomerOrderPreparing(Order order) {
        if (order == null || order.getUserId() == null) return;
        String title = "Your Order Is Being Prepared 👨‍🍳";
        String message = "Your order is being prepared.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "CustomerTracking");
        sendNotification(order.getUserId(), "CUSTOMER", "ORDER_PREPARING", title, message, data, "ORDER", order.getId(), order.getId(), "default", "ruvo_orders");
    }

    public void notifyCustomerOrderReady(Order order) {
        if (order == null || order.getUserId() == null) return;
        String title = "Order Ready 📦";
        String message = "Your order is ready for pickup.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "CustomerTracking");
        sendNotification(order.getUserId(), "CUSTOMER", "ORDER_READY", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_orders");
    }

    public void notifyCustomerPartnerAssigned(Order order, String partnerName) {
        if (order == null || order.getUserId() == null) return;
        String title = "Delivery Partner Assigned 🛵";
        String message = (partnerName != null && !partnerName.isBlank())
                ? partnerName + " has been assigned to deliver your order."
                : "Your delivery partner has been assigned.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "CustomerTracking");
        sendNotification(order.getUserId(), "CUSTOMER", "PARTNER_ASSIGNED", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_delivery");
    }

    public void notifyCustomerOrderPickedUp(Order order) {
        if (order == null || order.getUserId() == null) return;
        String title = "Order Picked Up 🛵";
        String message = "Your order is on its way.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "CustomerTracking");
        sendNotification(order.getUserId(), "CUSTOMER", "ORDER_PICKED_UP", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_delivery");
    }

    public void notifyCustomerOutForDelivery(Order order) {
        if (order == null || order.getUserId() == null) return;
        String title = "Out for Delivery 🛵";
        String message = "Your Ruvo order is on its way to you.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "CustomerTracking");
        sendNotification(order.getUserId(), "CUSTOMER", "ORDER_OUT_FOR_DELIVERY", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_delivery");
    }

    public void notifyCustomerPartnerNear(Order order) {
        if (order == null || order.getUserId() == null) return;
        String title = "Almost There 📍";
        String message = "Your delivery partner is nearby.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "CustomerTracking");
        sendNotification(order.getUserId(), "CUSTOMER", "PARTNER_NEAR_CUSTOMER", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_delivery");
    }

    public void notifyCustomerOrderDelivered(Order order) {
        if (order == null || order.getUserId() == null) return;
        String title = "Order Delivered 🎉";
        String message = "Your order has been delivered. Enjoy!";
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "screen", "OrderHistory");
        sendNotification(order.getUserId(), "CUSTOMER", "ORDER_DELIVERED", title, message, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_orders");
    }

    public void notifyCustomer(Order order, String title, String body, String type) {
        if (order == null || order.getUserId() == null) return;
        Map<String, Object> data = Map.of("orderId", String.valueOf(order.getId()), "type", type);
        sendNotification(order.getUserId(), "CUSTOMER", type, title, body, data, "ORDER", order.getId(), order.getId(), "high", "ruvo_orders");
    }

    // =========================================================================
    // PHASE 9: PAYMENT PUSH NOTIFICATIONS
    // =========================================================================

    public void notifyPaymentSuccess(String userId, Long orderId, BigDecimal amount) {
        String title = "Payment Successful ✅";
        String message = "Your payment of ₹" + (amount != null ? amount : "0") + " was successful.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(orderId), "screen", "CustomerTracking");
        sendNotification(userId, "CUSTOMER", "PAYMENT_SUCCESS", title, message, data, "ORDER", orderId, orderId, "high", "ruvo_payments");
    }

    public void notifyPaymentFailed(String userId, Long orderId, String reason) {
        String title = "Payment Failed ❌";
        String message = reason != null ? reason : "We couldn't complete your payment.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(orderId), "screen", "Checkout");
        sendNotification(userId, "CUSTOMER", "PAYMENT_FAILED", title, message, data, "ORDER", orderId, orderId, "high", "ruvo_payments");
    }

    public void notifyPaymentPending(String userId, Long orderId) {
        String title = "Payment Pending ⏳";
        String message = "We're waiting for payment confirmation.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(orderId), "screen", "Checkout");
        sendNotification(userId, "CUSTOMER", "PAYMENT_PENDING", title, message, data, "ORDER", orderId, orderId, "default", "ruvo_payments");
    }

    public void notifyRefundInitiated(String userId, Long orderId, BigDecimal amount) {
        String title = "Refund Initiated 💰";
        String message = "Your refund of ₹" + (amount != null ? amount : "0") + " has been initiated.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(orderId), "screen", "OrderHistory");
        sendNotification(userId, "CUSTOMER", "REFUND_INITIATED", title, message, data, "ORDER", orderId, orderId, "default", "ruvo_payments");
    }

    public void notifyRefundCompleted(String userId, Long orderId, BigDecimal amount) {
        String title = "Refund Completed 💰";
        String message = "₹" + (amount != null ? amount : "0") + " has been refunded successfully.";
        Map<String, Object> data = Map.of("orderId", String.valueOf(orderId), "screen", "OrderHistory");
        sendNotification(userId, "CUSTOMER", "REFUND_COMPLETED", title, message, data, "ORDER", orderId, orderId, "high", "ruvo_payments");
    }

    // =========================================================================
    // PHASE 10: RUVO SHOP PUSH NOTIFICATIONS
    // =========================================================================

    public void notifyShopNewOrder(Order order, Shop shop) {
        if (shop == null || shop.getOwnerId() == null) return;
        String title = "New Order 🔔";
        String message = "You received a new order worth ₹" + (order != null ? order.getTotalAmount() : "0") + ".";
        Map<String, Object> data = Map.of(
                "orderId", String.valueOf(order != null ? order.getId() : "0"),
                "shopId", String.valueOf(shop.getId()),
                "screen", "ShopOrders"
        );
        sendNotification(shop.getOwnerId(), "SHOP", "NEW_ORDER", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_shop_orders");
    }

    public void notifyShop(Order order) {
        if (order == null || order.getShopId() == null) return;
        Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
        if (shop != null) {
            notifyShopNewOrder(order, shop);
        }
    }

    public void notifyShopOrderCancelled(Order order, Shop shop, String reason) {
        if (shop == null || shop.getOwnerId() == null) return;
        String title = "Order Cancelled";
        String message = "Order #" + (order != null ? order.getId() : "") + " has been cancelled.";
        Map<String, Object> data = Map.of(
                "orderId", String.valueOf(order != null ? order.getId() : "0"),
                "screen", "ShopOrders"
        );
        sendNotification(shop.getOwnerId(), "SHOP", "ORDER_CANCELLED", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_shop_orders");
    }

    public void notifyShopLowStock(String shopOwnerId, String productName) {
        if (shopOwnerId == null) return;
        String title = "Low Stock ⚠️";
        String message = productName + " is running low on stock.";
        Map<String, Object> data = Map.of("screen", "MyProducts");
        sendNotification(shopOwnerId, "SHOP", "LOW_STOCK", title, message, data, "INVENTORY", null, null, "default", "ruvo_shop_inventory");
    }

    public void notifyShopProductApproved(String shopOwnerId, String productName) {
        if (shopOwnerId == null) return;
        String title = "Product Approved 🎉";
        String message = productName + " is now live on Ruvo.";
        Map<String, Object> data = Map.of("screen", "MyProducts");
        sendNotification(shopOwnerId, "SHOP", "PRODUCT_APPROVED", title, message, data, "PRODUCT", null, null, "default", "ruvo_shop_inventory");
    }

    public void notifyShopProductRejected(String shopOwnerId, String productName, String reason) {
        if (shopOwnerId == null) return;
        String title = "Product Needs Changes";
        String message = productName + " needs changes before it can go live." + (reason != null ? " (" + reason + ")" : "");
        Map<String, Object> data = Map.of("screen", "MyProducts");
        sendNotification(shopOwnerId, "SHOP", "PRODUCT_REJECTED", title, message, data, "PRODUCT", null, null, "default", "ruvo_shop_inventory");
    }

    // =========================================================================
    // PHASE 11: RUVO PARTNER PUSH NOTIFICATIONS
    // =========================================================================

    public void notifyPartnerNewDeliveryRequest(DeliveryPartner partner, Order order, Shop shop, BigDecimal earning) {
        if (partner == null || partner.getUserId() == null) return;
        String shopName = shop != null ? shop.getName() : "Local Shop";
        String title = "New Delivery Request 🛵";
        String message = "Pickup from " + shopName + ". Estimated earning ₹" + (earning != null ? earning : "35") + ".";
        Map<String, Object> data = Map.of(
                "orderId", String.valueOf(order != null ? order.getId() : "0"),
                "screen", "Deliveries"
        );
        sendNotification(partner.getUserId(), "PARTNER", "NEW_DELIVERY_REQUEST", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_partner_delivery");
    }

    public void notifyPartnerDeliveryAccepted(String partnerUserId, Order order) {
        if (partnerUserId == null) return;
        String title = "Delivery Accepted ✅";
        String message = "Pickup details are now available.";
        Map<String, Object> data = Map.of(
                "orderId", String.valueOf(order != null ? order.getId() : "0"),
                "screen", "ActiveDelivery"
        );
        sendNotification(partnerUserId, "PARTNER", "DELIVERY_ACCEPTED", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_partner_delivery");
    }

    public void notifyPartnerOrderReady(String partnerUserId, Order order) {
        if (partnerUserId == null) return;
        String title = "Order Ready 📦";
        String message = "The order is ready for pickup.";
        Map<String, Object> data = Map.of(
                "orderId", String.valueOf(order != null ? order.getId() : "0"),
                "screen", "ActiveDelivery"
        );
        sendNotification(partnerUserId, "PARTNER", "ORDER_READY", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_partner_delivery");
    }

    public void notifyPartnerReachedShop(String partnerUserId, Order order) {
        if (partnerUserId == null) return;
        String title = "Pickup Location Reached 📍";
        String message = "You have reached the shop.";
        Map<String, Object> data = Map.of(
                "orderId", String.valueOf(order != null ? order.getId() : "0"),
                "screen", "ActiveDelivery"
        );
        sendNotification(partnerUserId, "PARTNER", "PARTNER_REACHED_SHOP", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_partner_delivery");
    }

    public void notifyPartnerOrderPickedUp(String partnerUserId, Order order) {
        if (partnerUserId == null) return;
        String title = "Order Picked Up 🛵";
        String message = "Proceed to the customer location.";
        Map<String, Object> data = Map.of(
                "orderId", String.valueOf(order != null ? order.getId() : "0"),
                "screen", "ActiveDelivery"
        );
        sendNotification(partnerUserId, "PARTNER", "ORDER_PICKED_UP", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_partner_delivery");
    }

    public void notifyPartnerNearCustomer(String partnerUserId, Order order) {
        if (partnerUserId == null) return;
        String title = "Customer Nearby 📍";
        String message = "You are near the delivery location.";
        Map<String, Object> data = Map.of(
                "orderId", String.valueOf(order != null ? order.getId() : "0"),
                "screen", "ActiveDelivery"
        );
        sendNotification(partnerUserId, "PARTNER", "PARTNER_NEAR_CUSTOMER", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_partner_delivery");
    }

    public void notifyPartnerDeliveryCancelled(String partnerUserId, Order order) {
        if (partnerUserId == null) return;
        String title = "Delivery Cancelled";
        String message = "This delivery has been cancelled.";
        Map<String, Object> data = Map.of("screen", "Deliveries");
        sendNotification(partnerUserId, "PARTNER", "DELIVERY_CANCELLED", title, message, data, "ORDER",
                order != null ? order.getId() : null, order != null ? order.getId() : null, "high", "ruvo_partner_delivery");
    }

    public void notifyPartnerEarningsAdded(String partnerUserId, BigDecimal amount) {
        if (partnerUserId == null) return;
        String title = "Earnings Added 💰";
        String message = "₹" + (amount != null ? amount : "0") + " has been added to your earnings.";
        Map<String, Object> data = Map.of("screen", "Earnings");
        sendNotification(partnerUserId, "PARTNER", "PARTNER_EARNINGS_ADDED", title, message, data, "EARNINGS", null, null, "default", "ruvo_partner_earnings");
    }

    // =========================================================================
    // PHASE 12: BANK & ACCOUNT VERIFICATION NOTIFICATIONS
    // =========================================================================

    public void notifyBankVerificationStarted(String userId, String appType) {
        if (userId == null) return;
        String title = "Bank Verification Started 🔄";
        String message = "Your bank account verification is currently in progress.";
        String channel = "PARTNER".equalsIgnoreCase(appType) ? "ruvo_partner_account" : "ruvo_account";
        sendNotification(userId, appType, "BANK_VERIFICATION_STARTED", title, message, null, "BANK", null, null, "high", channel);
    }

    public void notifyBankVerificationSuccess(String userId, String appType) {
        if (userId == null) return;
        String title = "Bank Account Verified ✅";
        String message = "Your bank account details have been verified successfully.";
        String channel = "PARTNER".equalsIgnoreCase(appType) ? "ruvo_partner_account" : "ruvo_account";
        sendNotification(userId, appType, "BANK_VERIFICATION_SUCCESS", title, message, null, "BANK", null, null, "high", channel);
    }

    public void notifyBankVerificationFailed(String userId, String appType, String reason) {
        if (userId == null) return;
        String title = "Bank Verification Failed ❌";
        String message = reason != null ? reason : "Bank verification failed. Please check account details.";
        String channel = "PARTNER".equalsIgnoreCase(appType) ? "ruvo_partner_account" : "ruvo_account";
        sendNotification(userId, appType, "BANK_VERIFICATION_FAILED", title, message, null, "BANK", null, null, "high", channel);
    }

    public void notifyPartnerAccountUnderReview(String userId) {
        if (userId == null) return;
        String title = "Account Under Review 🔍";
        String message = "Your delivery partner profile is under review by RuVo admin.";
        sendNotification(userId, "PARTNER", "PARTNER_ACCOUNT_UNDER_REVIEW", title, message, null, "ACCOUNT", null, null, "high", "ruvo_partner_account");
    }

    public void notifyPartnerAccountApproved(String userId) {
        if (userId == null) return;
        String title = "Account Approved 🎉";
        String message = "Congratulations! Your partner account has been approved. You can now accept deliveries.";
        Map<String, Object> data = Map.of("screen", "Home");
        sendNotification(userId, "PARTNER", "PARTNER_ACCOUNT_APPROVED", title, message, data, "ACCOUNT", null, null, "high", "ruvo_partner_account");
    }

    public void notifyPartnerAccountRejected(String userId, String reason) {
        if (userId == null) return;
        String title = "Account Review Update";
        String message = "Your partner registration could not be approved" + (reason != null ? ": " + reason : ".");
        sendNotification(userId, "PARTNER", "PARTNER_ACCOUNT_REJECTED", title, message, null, "ACCOUNT", null, null, "high", "ruvo_partner_account");
    }

    // =========================================================================
    // IN-APP NOTIFICATION HISTORY & READ MANAGEMENT
    // =========================================================================

    public List<PushNotification> getUserNotifications(String userId) {
        return notificationRepository.findByUserIdFlexible(userId);
    }

    public List<PushNotification> getUserNotifications(Long userId) {
        return getUserNotifications(String.valueOf(userId));
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countUnreadByUserIdFlexible(userId);
    }

    public long getUnreadCount(Long userId) {
        return getUnreadCount(String.valueOf(userId));
    }

    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setIsRead(true);
            n.setReadAt(Instant.now());
            notificationRepository.save(n);
        });
    }

    public void markAllAsRead(String userId) {
        List<PushNotification> notifications = notificationRepository.findByUserIdFlexible(userId);
        for (PushNotification n : notifications) {
            if (!Boolean.TRUE.equals(n.getIsRead())) {
                n.setIsRead(true);
                n.setReadAt(Instant.now());
                notificationRepository.save(n);
            }
        }
    }

    public void markAllAsRead(Long userId) {
        markAllAsRead(String.valueOf(userId));
    }

    private String resolveDefaultChannel(String appType, String notifType) {
        if ("SHOP".equalsIgnoreCase(appType)) {
            if ("NEW_ORDER".equals(notifType) || "ORDER_CANCELLED".equals(notifType)) return "ruvo_shop_orders";
            if ("LOW_STOCK".equals(notifType) || notifType.startsWith("PRODUCT_")) return "ruvo_shop_inventory";
            if (notifType.contains("PAYMENT") || notifType.contains("SETTLEMENT")) return "ruvo_shop_payments";
            return "ruvo_shop_account";
        }
        if ("PARTNER".equalsIgnoreCase(appType)) {
            if ("PARTNER_EARNINGS_ADDED".equals(notifType)) return "ruvo_partner_earnings";
            if (notifType.contains("ACCOUNT") || notifType.contains("BANK")) return "ruvo_partner_account";
            return "ruvo_partner_delivery";
        }
        // CUSTOMER
        if (notifType.contains("DELIVERY") || notifType.contains("PARTNER") || notifType.contains("TRACKING")) return "ruvo_delivery";
        if (notifType.contains("PAYMENT") || notifType.contains("REFUND")) return "ruvo_payments";
        if (notifType.contains("PROMO") || notifType.contains("OFFER")) return "ruvo_promotions";
        if (notifType.contains("ACCOUNT") || notifType.contains("BANK")) return "ruvo_account";
        return "ruvo_orders";
    }
}

