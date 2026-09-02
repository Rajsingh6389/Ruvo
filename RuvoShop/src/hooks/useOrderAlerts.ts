import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useToast } from '../context/ToastContext';
import { Order } from '../types/order';

export function useOrderAlerts(orders: any[]) {
  const previousOrdersRef = useRef<Order[]>([]);
  const { showToast } = useToast();

  const playAlertSound = async () => {
    try {
      // Create a sound object from a predefined system notification URI or local asset
      // Since we don't have a local MP3, we will use a small beep if possible, or request permission
      // To keep it simple, we load a short remote generic ping sound if needed, or rely on Toast
      // Let's use Toast for visual popup, and try to play a beep or vibrate.
      
      // We will add the actual Sound Loading later once we find a good asset, but for now
      // let's just show the Toast. Let's still load Audio context.
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    } catch {}
  };

  useEffect(() => {
    const prevOrders = previousOrdersRef.current;
    
    if (prevOrders.length > 0 && orders.length > 0) {
      const newPendingOrders = orders.filter((currentOrder) => {
        if (currentOrder.orderStatus !== 'SHOP_PENDING') return false;

        const oldOrder = prevOrders.find((o) => o.id === currentOrder.id);
        if (!oldOrder) return true; 
        if (oldOrder.orderStatus !== 'SHOP_PENDING') return true; 

        return false; 
      });

      if (newPendingOrders.length > 0) {
        newPendingOrders.forEach((o) => {
          showToast(`New Order! ${o.productName} (₹${o.totalAmount}) pending.`, 'info');
        });
        playAlertSound();
      }
    }
    
    previousOrdersRef.current = orders;
  }, [orders]);
}
