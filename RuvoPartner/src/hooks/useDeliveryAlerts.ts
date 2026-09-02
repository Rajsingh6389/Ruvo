import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

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

// Ensure notifications show persistently in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useDeliveryAlerts(requests: DeliveryRequest[]) {
  const previousRequestsRef = useRef<DeliveryRequest[]>([]);

  useEffect(() => {
    const askPermissions = async () => {
      const { granted } = (await Notifications.getPermissionsAsync()) as any;
      if (!granted) {
         await Notifications.requestPermissionsAsync();
      }
    };
    askPermissions();
  }, []);

  useEffect(() => {
    const prevRequests = previousRequestsRef.current;
    
    if (prevRequests.length >= 0 && requests.length > 0) { // Note prevRequests can be 0 when starting
      const newPendingRequests = requests.filter((currentReq) => {
        if (currentReq.status !== 'PENDING') return false;
        
        const oldReq = prevRequests.find((r) => r.requestId === currentReq.requestId);
        if (!oldReq) return true;
        if (oldReq.status !== 'PENDING') return true;

        return false;
      });

      // Avoid spamming if initial load mounts with existing requests, but let's notify anyway so they know
      // Actually, if prevRequests length was 0, it means the very first fetch might trigger notification. Handled!

      if (newPendingRequests.length > 0 && prevRequests.length > 0) {
        newPendingRequests.forEach((req) => {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🚀 New Delivery Request!',
              body: `A new order is ready for pickup (${req.distanceKm ? req.distanceKm + ' km away' : 'nearby'}).`,
              sound: true,
            },
            trigger: null, // trigger immediately
          });
        });
      } else if (newPendingRequests.length > 0 && prevRequests.length === 0) {
         // Optionally notify on startup if there's an active one? Sure.
         newPendingRequests.forEach((req) => {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🚀 Pending Delivery Request!',
              body: `You have an active request ready for pickup.`,
              sound: true,
            },
            trigger: null,
          });
        });
      }
    }
    
    previousRequestsRef.current = requests;
  }, [requests]);
}
