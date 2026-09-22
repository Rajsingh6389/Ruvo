import { useEffect, useRef } from 'react';
import { Vibration, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useToast } from '../context/ToastContext';
import { Order } from '../types/order';

const shopOrderSound = require('../../assets/images/sound/new_order.wav');

let loadedSoundObj: Audio.Sound | null = null;

async function playShopAlert() {
  try {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (modeErr) {}

    if (loadedSoundObj) {
      await loadedSoundObj.replayAsync().catch(async () => {
        await loadedSoundObj?.unloadAsync().catch(() => {});
        loadedSoundObj = null;
      });
    }

    if (!loadedSoundObj) {
      const { sound } = await Audio.Sound.createAsync(
        shopOrderSound,
        { shouldPlay: true, volume: 1.0 }
      );
      loadedSoundObj = sound;
      await sound.playAsync().catch(() => {});
    }
  } catch (soundErr) {
    console.warn('[useOrderAlerts] Sound play error:', soundErr);
  }
}

export function useOrderAlerts(orders: any[]) {
  const previousOrdersRef = useRef<Order[]>([]);
  const { showToast } = useToast();

  const playAlertSound = async () => {
    console.log('[useOrderAlerts] 🔔 Triggering alert feedback (vibration & audio)...');
    
    // 1. Trigger strong vibration pattern
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 600, 200, 600, 200, 600], false);
      } else {
        Vibration.vibrate(600);
      }
    } catch (err) {
      console.warn('[useOrderAlerts] Vibration error:', err);
    }

    // 2. Play audio alert via Expo AV
    playShopAlert();
  };

  useEffect(() => {
    const prevOrders = previousOrdersRef.current;
    
    console.log(`[useOrderAlerts] 📦 Orders updated. Count: ${orders?.length || 0}`);

    if (orders && orders.length > 0) {
      // Find all current SHOP_PENDING orders
      const currentPendingOrders = orders.filter((o) => o.orderStatus === 'SHOP_PENDING');
      console.log(`[useOrderAlerts] ⏳ Current SHOP_PENDING orders count: ${currentPendingOrders.length}`);

      // Check which pending orders were NOT previously notified
      const unnotifiedPendingOrders = currentPendingOrders.filter((currentOrder) => {
        const oldOrder = prevOrders.find((o) => o.id === currentOrder.id);
        if (!oldOrder) {
          console.log(`[useOrderAlerts] ✨ Found NEW pending order: #${currentOrder.id}`);
          return true; // Newly received order
        }
        if (oldOrder.orderStatus !== 'SHOP_PENDING') {
          console.log(`[useOrderAlerts] 🔄 Order #${currentOrder.id} status changed to SHOP_PENDING`);
          return true; // Status changed back to pending
        }
        return false;
      });

      if (unnotifiedPendingOrders.length > 0) {
        console.log(`[useOrderAlerts] 🚨 Triggering alert for ${unnotifiedPendingOrders.length} unnotified order(s)`);
        unnotifiedPendingOrders.forEach((o) => {
          const itemName = o.productName || (o.items && o.items.length > 0 ? o.items[0].productName : 'Item');
          const extraItems = o.items && o.items.length > 1 ? ` +${o.items.length - 1} more` : '';
          const customerName = o.customerName || o.userName || 'Customer';
          const notificationMsg = `🔔 NEW ORDER #${o.id}: ${itemName}${extraItems} (₹${o.totalAmount}) from ${customerName}`;
          
          console.log(`[useOrderAlerts] 📢 Notification Message: "${notificationMsg}"`);
          showToast(notificationMsg, 'info');
        });
        playAlertSound();
      } else {
        console.log('[useOrderAlerts] ℹ️ No new unnotified pending orders.');
      }
    }
    
    previousOrdersRef.current = orders;
  }, [orders]);
}
