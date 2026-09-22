import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  registerForPushNotificationsAsync,
  setupAndroidNotificationChannels,
  getExpoNotifications,
  isExpoGo,
} from '../services/notificationService';

export function useNotificationHandler() {
  const { userId, user } = useAuth();
  const navigation = useNavigation<any>();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    const notifType = data.type || data.notificationType;
    const orderId = data.orderId ? String(data.orderId) : undefined;
    const screen = data.screen;

    try {
      if (screen) {
        if (orderId) {
          navigation.navigate(screen, { orderId });
        } else {
          navigation.navigate(screen);
        }
        return;
      }

      if (notifType === 'NEW_ORDER' || notifType === 'ORDER_CANCELLED' || notifType === 'ORDER_PLACED') {
        navigation.navigate('ShopOrders', orderId ? { orderId } : undefined);
        return;
      }

      if (notifType === 'DELIVERY_PARTNER_ASSIGNED' || notifType === 'DELIVERY_PARTNER_ARRIVED') {
        if (orderId) {
          navigation.navigate('DeliveryPartnerAssignment', { orderId });
        } else {
          navigation.navigate('ShopOrders');
        }
        return;
      }

      if (notifType === 'LOW_STOCK' || notifType?.startsWith('PRODUCT_')) {
        navigation.navigate('MyProducts');
        return;
      }

      if (notifType?.includes('BANK') || notifType?.includes('ACCOUNT')) {
        navigation.navigate('EditBankAccount');
        return;
      }

      // Default fallback
      navigation.navigate('Notifications');
    } catch (err) {
      console.warn('[RuVo Shop Notifications] Navigation on notification tap failed:', err);
    }
  };

  useEffect(() => {
    try {
      setupAndroidNotificationChannels();

      const effectiveUserId = userId || (user as any)?.mobileNumber || user?.id;
      if (effectiveUserId) {
        registerForPushNotificationsAsync(String(effectiveUserId));
      }

      if (isExpoGo) {
        return;
      }

      const Notifications = getExpoNotifications();
      if (!Notifications) return;

      // 1. Foreground listener
      try {
        notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
          console.log('[RuVo Shop Notifications] Foreground notification:', notification.request.content.title);
        });
      } catch (err) {}

      // 2. Notification response / tap listener
      try {
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;
          console.log('[RuVo Shop Notifications] Tapped notification data:', data);
          handleNotificationNavigation(data);
        });
      } catch (err) {}

      // 3. Cold Start check
      try {
        Notifications.getLastNotificationResponseAsync?.().then((response: any) => {
          if (response) {
            const data = response.notification.request.content.data;
            console.log('[RuVo Shop Notifications] Cold start launch:', data);
            handleNotificationNavigation(data);
          }
        }).catch(() => {});
      } catch (err) {}
    } catch (err) {
      console.warn('[RuVo Shop Notifications] Error initializing notifications:', err);
    }

    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
      } catch (e) {}
      try {
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (e) {}
    };
  }, [userId, user?.id, (user as any)?.mobileNumber]);
}
