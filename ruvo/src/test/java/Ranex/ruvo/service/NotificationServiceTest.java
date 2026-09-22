package Ranex.ruvo.service;

import Ranex.ruvo.model.DeviceToken;
import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.PushNotification;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.DeviceTokenRepository;
import Ranex.ruvo.repository.PushNotificationRepository;
import Ranex.ruvo.repository.ShopRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    @Mock
    private PushNotificationRepository pushNotificationRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private DeliveryPartnerRepository deliveryPartnerRepository;

    @Mock
    private ExpoPushNotificationService expoPushNotificationService;

    private ObjectMapper objectMapper;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        notificationService = new NotificationService(
                deviceTokenRepository,
                pushNotificationRepository,
                shopRepository,
                deliveryPartnerRepository,
                expoPushNotificationService,
                objectMapper
        );
    }

    @Test
    @DisplayName("Should register new device push token")
    void testRegisterNewDeviceToken() {
        when(deviceTokenRepository.findByToken("ExponentPushToken[abc12345]")).thenReturn(Optional.empty());

        notificationService.registerDeviceToken("9876543210", "CUSTOMER", "ExponentPushToken[abc12345]", "ANDROID", "1.0.0");

        ArgumentCaptor<DeviceToken> captor = ArgumentCaptor.forClass(DeviceToken.class);
        verify(deviceTokenRepository).save(captor.capture());

        DeviceToken saved = captor.getValue();
        assertEquals("9876543210", saved.getUserId());
        assertEquals("CUSTOMER", saved.getAppType());
        assertEquals("ExponentPushToken[abc12345]", saved.getToken());
        assertEquals("ANDROID", saved.getPlatform());
        assertTrue(saved.getActive());
    }

    @Test
    @DisplayName("Should deactivate device token on unregister")
    void testUnregisterDeviceToken() {
        DeviceToken token = DeviceToken.builder()
                .userId("9876543210")
                .token("ExponentPushToken[abc12345]")
                .active(true)
                .build();

        when(deviceTokenRepository.findByToken("ExponentPushToken[abc12345]")).thenReturn(Optional.of(token));

        notificationService.unregisterDeviceToken("ExponentPushToken[abc12345]");

        assertFalse(token.getActive());
        verify(deviceTokenRepository).save(token);
    }

    @Test
    @DisplayName("Should send push notification and save in-app notification for order placed")
    void testNotifyCustomerOrderPlaced() {
        Order order = new Order();
        order.setId(1001L);
        order.setUserId("9876543210");
        order.setTotalAmount(new BigDecimal("299.00"));

        DeviceToken token = DeviceToken.builder()
                .userId("9876543210")
                .appType("CUSTOMER")
                .token("ExponentPushToken[abc12345]")
                .active(true)
                .build();

        when(deviceTokenRepository.findActiveTokensForUserFlexible("9876543210", "CUSTOMER"))
                .thenReturn(List.of(token));

        when(pushNotificationRepository.save(any(PushNotification.class)))
                .thenAnswer(inv -> {
                    PushNotification n = inv.getArgument(0);
                    n.setId(55L);
                    return n;
                });

        when(expoPushNotificationService.sendPushNotification(anyString(), anyString(), anyString(), anyMap(), anyString(), anyString()))
                .thenReturn(true);

        notificationService.notifyCustomerOrderPlaced(order);

        verify(pushNotificationRepository, atLeastOnce()).save(any(PushNotification.class));
        verify(expoPushNotificationService).sendPushNotification(
                eq("ExponentPushToken[abc12345]"),
                contains("Order Placed"),
                contains("1001"),
                anyMap(),
                eq("ruvo_orders"),
                eq("high")
        );
    }

    @Test
    @DisplayName("Should notify shopkeeper on new order")
    void testNotifyShopNewOrder() {
        Order order = new Order();
        order.setId(2002L);
        order.setShopId(10L);
        order.setTotalAmount(new BigDecimal("450.00"));

        Shop shop = new Shop();
        shop.setId(10L);
        shop.setName("Fresh Mart");
        shop.setOwnerId("shopowner123");

        DeviceToken token = DeviceToken.builder()
                .userId("shopowner123")
                .appType("SHOP")
                .token("ExponentPushToken[shopToken999]")
                .active(true)
                .build();

        when(deviceTokenRepository.findActiveTokensForUserFlexible("shopowner123", "SHOP"))
                .thenReturn(List.of(token));

        when(pushNotificationRepository.save(any(PushNotification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        when(expoPushNotificationService.sendPushNotification(anyString(), anyString(), anyString(), anyMap(), anyString(), anyString()))
                .thenReturn(true);

        notificationService.notifyShopNewOrder(order, shop);

        verify(expoPushNotificationService).sendPushNotification(
                eq("ExponentPushToken[shopToken999]"),
                contains("New Order"),
                contains("450"),
                anyMap(),
                eq("ruvo_shop_orders"),
                eq("high")
        );
    }

    @Test
    @DisplayName("Should notify delivery partner on new delivery request")
    void testNotifyPartnerNewDeliveryRequest() {
        Ranex.ruvo.model.DeliveryPartner partner = new Ranex.ruvo.model.DeliveryPartner();
        partner.setId(77L);
        partner.setUserId("rider77");

        Order order = new Order();
        order.setId(3003L);

        Shop shop = new Shop();
        shop.setName("Fresh Mart");

        DeviceToken token = DeviceToken.builder()
                .userId("rider77")
                .appType("PARTNER")
                .token("ExponentPushToken[riderToken1]")
                .active(true)
                .build();

        when(deviceTokenRepository.findActiveTokensForUserFlexible("rider77", "PARTNER"))
                .thenReturn(List.of(token));

        when(pushNotificationRepository.save(any(PushNotification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        when(expoPushNotificationService.sendPushNotification(anyString(), anyString(), anyString(), anyMap(), anyString(), anyString()))
                .thenReturn(true);

        notificationService.notifyPartnerNewDeliveryRequest(
                partner,
                order,
                shop,
                new BigDecimal("50.00")
        );

        verify(expoPushNotificationService).sendPushNotification(
                eq("ExponentPushToken[riderToken1]"),
                contains("New Delivery Request"),
                contains("50"),
                anyMap(),
                eq("ruvo_partner_delivery"),
                eq("high")
        );
    }

    @Test
    @DisplayName("Should notify customer on payment success")
    void testNotifyPaymentSuccess() {
        DeviceToken token = DeviceToken.builder()
                .userId("cust123")
                .appType("CUSTOMER")
                .token("ExponentPushToken[custToken]")
                .active(true)
                .build();

        when(deviceTokenRepository.findActiveTokensForUserFlexible("cust123", "CUSTOMER"))
                .thenReturn(List.of(token));

        when(pushNotificationRepository.save(any(PushNotification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        when(expoPushNotificationService.sendPushNotification(anyString(), anyString(), anyString(), anyMap(), anyString(), anyString()))
                .thenReturn(true);

        notificationService.notifyPaymentSuccess("cust123", 4004L, new BigDecimal("650.00"));

        verify(expoPushNotificationService).sendPushNotification(
                eq("ExponentPushToken[custToken]"),
                contains("Payment Successful"),
                contains("650"),
                anyMap(),
                eq("ruvo_payments"),
                eq("high")
        );
    }

    @Test
    @DisplayName("Should mark notification as read")
    void testMarkAsRead() {
        PushNotification notif = PushNotification.builder()
                .id(123L)
                .userId("cust123")
                .isRead(false)
                .build();

        when(pushNotificationRepository.findById(123L)).thenReturn(Optional.of(notif));

        notificationService.markAsRead(123L);

        assertTrue(notif.getIsRead());
        assertNotNull(notif.getReadAt());
        verify(pushNotificationRepository).save(notif);
    }
}
