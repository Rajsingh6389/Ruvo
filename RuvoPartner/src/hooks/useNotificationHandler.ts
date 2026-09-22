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
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    const notifType = data.type || data.notificationType;
    const orderId = data.orderId ? Number(data.orderId) : undefined;
    const screen = data.screen;

    try {
      if (screen) {
        if (orderId) {
          navigation.navigate(screen, { orderId, deliveryId: orderId });
        } else {
          navigation.navigate(screen);
        }
        return;
      }

      if (notifType === 'NEW_DELIVERY_REQUEST' || notifType === 'DELIVERY_REQUEST') {
        navigation.navigate('MainTabs', { screen: 'Deliveries' });
        return;
      }

      if (
        notifType === 'DELIVERY_ASSIGNED' ||
        notifType === 'ORDER_PICKED_UP' ||
        notifType === 'OUT_FOR_DELIVERY'
      ) {
        if (orderId) {
          navigation.navigate('ActiveDelivery', { deliveryId: orderId, orderId });
        } else {
          navigation.navigate('MainTabs', { screen: 'Deliveries' });
        }
        return;
      }

      if (notifType === 'PARTNER_EARNINGS_ADDED') {
        navigation.navigate('MainTabs', { screen: 'Earnings' });
        return;
      }

      if (notifType === 'PARTNER_ACCOUNT_APPROVED') {
        navigation.navigate('MainTabs', { screen: 'Home' });
        return;
      }

      if (notifType?.includes('BANK') || notifType?.includes('ACCOUNT')) {
        navigation.navigate('VerificationStatus');
        return;
      }

      // Default fallback
      navigation.navigate('MainTabs', { screen: 'Notifications' });
    } catch (err) {
      console.warn('[RuVo Partner Notifications] Navigation on notification tap failed:', err);
    }
  };

  useEffect(() => {
    try {
      setupAndroidNotificationChannels();

      const partnerUserId = (user as any)?.id ? String((user as any).id) : (user as any)?.mobileNumber || (user as any)?.phone;
      if (partnerUserId) {
        registerForPushNotificationsAsync(String(partnerUserId));
      }

      // Check if running in Expo Go (remote push listeners throw in SDK 53+)
      if (isExpoGo) {
        return;
      }

      const Notifications = getExpoNotifications();
      if (!Notifications) return;

      // 1. Foreground listener
      try {
        notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
          console.log('[RuVo Partner Notifications] Foreground notification:', notification.request.content.title);
        });
      } catch (err) {}

      // 2. Notification response / tap listener
      try {
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;
          console.log('[RuVo Partner Notifications] Tapped notification data:', data);
          handleNotificationNavigation(data);
        });
      } catch (err) {}

      // 3. Cold Start check
      try {
        Notifications.getLastNotificationResponseAsync?.().then((response: any) => {
          if (response) {
            const data = response.notification.request.content.data;
            console.log('[RuVo Partner Notifications] Cold start launch:', data);
            handleNotificationNavigation(data);
          }
        }).catch(() => {});
      } catch (err) {}
    } catch (err) {
      console.warn('[RuVo Partner Notifications] Error initializing notifications:', err);
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
  }, [(user as any)?.id, (user as any)?.mobileNumber, (user as any)?.phone]);
}
