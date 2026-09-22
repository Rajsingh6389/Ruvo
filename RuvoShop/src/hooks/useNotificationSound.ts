import { Vibration, Platform, Alert } from 'react-native';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Audio } from 'expo-av';

const VIBRATION_PATTERN_NEW_ORDER = [0, 500, 200, 500, 200, 800];
const VIBRATION_PATTERN_NEW_REQUEST = [0, 400, 150, 400, 150, 600];

const shopSoundSource = require('../../assets/images/sound/new_order.wav');

let shopSoundObj: Audio.Sound | null = null;

async function playShopOrderSound() {
  try {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (modeErr) {}

    if (shopSoundObj) {
      await shopSoundObj.replayAsync().catch(async () => {
        await shopSoundObj?.unloadAsync().catch(() => {});
        shopSoundObj = null;
      });
    }

    if (!shopSoundObj) {
      const { sound } = await Audio.Sound.createAsync(
        shopSoundSource,
        { shouldPlay: true, volume: 1.0 }
      );
      shopSoundObj = sound;
      await sound.playAsync().catch(() => {});
    }
  } catch (err) {
    console.warn('[RuvoShop Sound] Audio play error:', err);
  }
}

/**
 * Hook that detects when new orders arrive and triggers
 * vibration + audio sound + visual alert.
 *
 * @param pendingCount - number of SHOP_PENDING orders
 */
export const useOrderNotificationSound = (pendingCount: number) => {
  const prevCountRef = useRef(pendingCount);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    if (pendingCount > prevCountRef.current) {
      const newOrders = pendingCount - prevCountRef.current;
      triggerNewOrderAlert(newOrders);
    }
    prevCountRef.current = pendingCount;
  }, [pendingCount]);

  const triggerNewOrderAlert = useCallback((count: number) => {
    // 1. Play real audio sound file
    playShopOrderSound();

    // 2. Vibrate with a distinctive pattern
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN_NEW_ORDER, false);
    } else {
      Vibration.vibrate(1000);
    }

    // Show visual popup
    setPopupMessage(
      count === 1
        ? 'New order received!'
        : `${count} new orders received!`
    );
    setShowPopup(true);

    // Auto-dismiss popup after 5 seconds
    setTimeout(() => setShowPopup(false), 5000);
  }, []);

  const dismissPopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  return { showPopup, popupMessage, dismissPopup };
};

/**
 * Hook for delivery partner - detects incoming delivery requests
 *
 * @param hasIncomingRequest - boolean indicating a new request arrived
 */
export const useDeliveryRequestSound = (hasIncomingRequest: boolean) => {
  const prevRef = useRef(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    if (hasIncomingRequest && !prevRef.current) {
      triggerRequestAlert();
    }
    prevRef.current = hasIncomingRequest;
  }, [hasIncomingRequest]);

  const triggerRequestAlert = useCallback(() => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN_NEW_REQUEST, false);
    } else {
      Vibration.vibrate(800);
    }

    setPopupMessage('New delivery request!');
    setShowPopup(true);

    setTimeout(() => setShowPopup(false), 5000);
  }, []);

  const dismissPopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  return { showPopup, popupMessage, dismissPopup };
};

/**
 * Manual trigger - call from anywhere
 */
export const playNotificationAlert = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(VIBRATION_PATTERN_NEW_ORDER, false);
  } else {
    Vibration.vibrate(1000);
  }
};
