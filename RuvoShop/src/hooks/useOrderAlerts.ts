import { useEffect, useRef } from 'react';
import { Vibration, Platform } from 'react-native';
import { useToast } from '../context/ToastContext';
import { Order } from '../types/order';

export function useOrderAlerts(orders: any[]) {
  const previousOrdersRef = useRef<Order[]>([]);
  const { showToast } = useToast();

  const playAlertSound = async () => {
    console.log('[useOrderAlerts] 🔔 Triggering alert feedback (vibration & audio)...');
    
    // 1. Trigger strong vibration pattern
    try {
      if (Platform.OS === 'android') {
        console.log('[useOrderAlerts] 📳 Android Vibration pattern executing...');
        Vibration.vibrate([0, 600, 200, 600, 200, 600], false);
      } else {
        console.log('[useOrderAlerts] 📳 iOS Vibration executing...');
        Vibration.vibrate(600);
      }
    } catch (err) {
      console.warn('[useOrderAlerts] ⚠️ Vibration error:', err);
    }

    // 2. Play audio alert (Expo AV if native module linked, or Web Audio API fallback)
    try {
      let playedAudio = false;
      
      try {
        const expoAvStatus = await import('expo-av').catch(() => null);
        if (expoAvStatus && expoAvStatus.Audio) {
          console.log('[useOrderAlerts] 🎵 Playing local sound file via expo-av...');
          const soundObject = new expoAvStatus.Audio.Sound();
          await soundObject.loadAsync(require('../../assets/images/sound/New Order Received A.wav'));
          await soundObject.playAsync();
          playedAudio = true;
          soundObject.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded && status.didJustFinish) {
              soundObject.unloadAsync().catch(() => {});
            }
          });
        }
      } catch (e) {
        console.log('[useOrderAlerts] ℹ️ expo-av not available, falling back...');
      }
      
      // Fallback for Web / Expo Go environments using HTML5 Audio synthesis
      if (!playedAudio && typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        console.log('[useOrderAlerts] 🔊 Playing synthesized order alert chime via Web Audio API...');
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
        playedAudio = true;
      }

      if (!playedAudio) {
        console.log('[useOrderAlerts] ℹ️ Native ExponentAV not present in this Expo Go session. Relying on Android Vibration + Visual Toast.');
      }
    } catch (soundErr) {
      console.log('[useOrderAlerts] ℹ️ Audio playback skipped:', soundErr);
    }
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
