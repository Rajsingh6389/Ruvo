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
          navigation.navigate(screen, { orderId });
        } else {
          navigation.navigate(screen);
        }
        return;
      }

      if (orderId) {
        if (
          notifType === 'ORDER_DELIVERED' ||
          notifType === 'REFUND_COMPLETED' ||
          notifType === 'REFUND_INITIATED' ||
          notifType === 'ORDER_REJECTED' ||
          notifType === 'ORDER_CANCELLED'
        ) {
          navigation.navigate('OrderHistory', { orderId });
        } else {
          navigation.navigate('CustomerTracking', { orderId });
        }
        return;
      }

      // Default fallback
      navigation.navigate('Notifications');
    } catch (err) {
      console.warn('[RuVo Notifications] Navigation on notification tap failed:', err);
    }
  };

  useEffect(() => {
    try {
      setupAndroidNotificationChannels();

      const userId = user?.id ? String(user.id) : (user as any)?.mobileNumber;
      if (userId) {
        registerForPushNotificationsAsync(userId);
      }

      // Check if running in Expo Go (remote push listeners throw in SDK 53+)
      if (isExpoGo) {
        return;
      }

      const Notifications = getExpoNotifications();
      if (!Notifications) return;

      // 1. Foreground notification received listener
      try {
        notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
          console.log('[RuVo Notifications] Received foreground notification:', notification.request.content.title);
        });
      } catch (err) {}

      // 2. Notification response (tap) listener (background / foreground)
      try {
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;
          console.log('[RuVo Notifications] Notification tapped with data:', data);
          handleNotificationNavigation(data);
        });
      } catch (err) {}

      // 3. Cold Start check: app opened directly by tapping a notification when terminated
      try {
        Notifications.getLastNotificationResponseAsync?.().then((response: any) => {
          if (response) {
            const data = response.notification.request.content.data;
            console.log('[RuVo Notifications] Cold start launch from notification:', data);
            handleNotificationNavigation(data);
          }
        }).catch(() => {});
      } catch (err) {}
    } catch (err) {
      console.warn('[RuVo Notifications] Error initializing notifications:', err);
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
  }, [user?.id, (user as any)?.mobileNumber]);
}
