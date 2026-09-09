import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export interface DeliveryRequest {
  requestId: number;
  orderId: number;
  distanceKm?: number;
  expiresAt: string;
  status: string;
  deliveryAddress?: string;
  totalAmount?: number;
  paymentMethod?: string;
  deliveryFee?: number;
}

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {}

export function useDeliveryAlerts(requests: DeliveryRequest[]) {
  const previousRequestsRef = useRef<DeliveryRequest[]>([]);

  useEffect(() => {
    if (!Notifications) return;
    const initNotifications = async () => {
      try {
        const { granted } = (await Notifications.getPermissionsAsync()) as any;
        if (!granted) {
          await Notifications.requestPermissionsAsync();
        }
        
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Orders & Deliveries',
            description: 'Alerts for new delivery requests',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: '#EA580C',
            enableVibrate: true,
          });
        }
      } catch {}
    };
    initNotifications();
  }, []);

  useEffect(() => {
    if (!Notifications) return;
    const prevRequests = previousRequestsRef.current;
    
    if (prevRequests.length >= 0 && requests.length > 0) {
      const newPendingRequests = requests.filter((currentReq) => {
        if (currentReq.status !== 'PENDING') return false;
        
        const oldReq = prevRequests.find((r) => r.requestId === currentReq.requestId);
        if (!oldReq) return true;
        if (oldReq.status !== 'PENDING') return true;

        return false;
      });

      if (newPendingRequests.length > 0 && prevRequests.length > 0) {
        newPendingRequests.forEach((req) => {
          Notifications.scheduleNotificationAsync?.({
            content: {
              title: '🚀 New Delivery Request!',
              body: `A new order is ready for pickup (${req.distanceKm ? req.distanceKm + ' km away' : 'nearby'}).`,
              sound: true,
            },
            trigger: null,
          }).catch(() => {});
        });
      } else if (newPendingRequests.length > 0 && prevRequests.length === 0) {
        newPendingRequests.forEach((req) => {
          Notifications.scheduleNotificationAsync?.({
            content: {
              title: '🚀 Pending Delivery Request!',
              body: `You have an active request ready for pickup.`,
              sound: true,
            },
            trigger: null,
          }).catch(() => {});
        });
      }
    }
    
    previousRequestsRef.current = requests;
  }, [requests]);
}
