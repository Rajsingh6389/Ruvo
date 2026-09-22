import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { API_BASE_URL } from '../config/api';

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === ExecutionEnvironment.StoreClient;

let _notificationsModule: any = null;

export function getExpoNotifications(): any {
  if (isExpoGo) {
    return null;
  }
  if (!_notificationsModule) {
    try {
      _notificationsModule = require('expo-notifications');
      if (_notificationsModule && _notificationsModule.setNotificationHandler) {
        _notificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      }
    } catch (e) {
      console.warn('[RuVo Partner Notifications] expo-notifications not available:', e);
      return null;
    }
  }
  return _notificationsModule;
}

export interface InAppNotification {
  id: number;
  userId: string;
  title: string;
  body: string;
  type: string;
  referenceType?: string;
  referenceId?: number;
  orderId?: number;
  data?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

/**
 * Configure Android Notification Channels for RuVo Delivery Partner
 */
export async function setupAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || isExpoGo) return;

  const Notifications = getExpoNotifications();
  if (!Notifications) return;

  try {
    await Notifications.setNotificationChannelAsync('ruvo_partner_delivery', {
      name: 'New Deliveries & Orders',
      description: 'Loud high-urgency notifications for new delivery requests and orders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF7A00',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('ruvo_partner_earnings', {
      name: 'Earnings & Payouts',
      description: 'Delivery earnings added and weekly payout notifications',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('ruvo_partner_account', {
      name: 'Account & Verification',
      description: 'KYC approval, bank verification, and account review status',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  } catch (error) {
    console.warn('[RuVo Partner Notifications] Failed to create Android notification channels:', error);
  }
}

/**
 * Request notification permissions and register Expo push token with backend
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  if (!userId) return null;

  if (isExpoGo) {
    console.log('[RuVo Partner Notifications] Push notification registration is skipped in Expo Go (remote push notifications require a development build in SDK 53+).');
    return null;
  }

  const Notifications = getExpoNotifications();
  if (!Notifications) return null;

  try {
    await setupAndroidNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[RuVo Partner Notifications] Push notification permission not granted');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const pushToken = tokenData.data;

    console.log('[RuVo Partner Notifications] Obtained push token:', pushToken);

    // Register token with backend
    await fetch(`${API_BASE_URL}/api/notifications/device-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        appType: 'PARTNER',
        token: pushToken,
        platform: Platform.OS.toUpperCase(),
        appVersion: Constants?.expoConfig?.version ?? '1.0.0',
      }),
    });

    return pushToken;
  } catch (error) {
    console.warn('[RuVo Partner Notifications] Failed to register push token:', error);
    return null;
  }
}

/**
 * Unregister device push token upon logout
 */
export async function unregisterPushTokenAsync(token: string): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${API_BASE_URL}/api/notifications/unregister-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.warn('[RuVo Partner Notifications] Failed to unregister push token:', error);
  }
}

/**
 * Fetch in-app notification history for delivery partner
 */
export async function fetchUserNotifications(userId: string): Promise<InAppNotification[]> {
  if (!userId) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/mine?userId=${encodeURIComponent(userId)}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.warn('[RuVo Partner Notifications] Failed to fetch notifications:', error);
    return [];
  }
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count?userId=${encodeURIComponent(userId)}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}
