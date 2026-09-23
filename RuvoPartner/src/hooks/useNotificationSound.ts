import { Vibration, Platform } from 'react-native';
import { useEffect, useRef, useCallback, useState } from 'react';

const VIBRATION_PATTERN_NEW_REQUEST = [0, 400, 150, 400, 150, 600];
const VIBRATION_PATTERN_NEW_ORDER = [0, 500, 200, 500, 200, 800];

// Lazily load expo-av to avoid crash when native module is not available
// (e.g., in Expo Go). Sound playback is non-critical — if it fails, we
// silently fall back to vibration only.
async function playSound(assetPath: any) {
  try {
    const { Audio } = await import('expo-av');
    const { sound } = await Audio.Sound.createAsync(assetPath);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (e) {
    // Native module unavailable (Expo Go) or asset missing — vibration already handled
    console.log('[RuVo] Audio unavailable, vibration only:', e);
  }
}

/**
 * Hook for delivery partner - detects incoming delivery requests
 * and triggers vibration + visual popup alert.
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

  const triggerRequestAlert = useCallback(async () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN_NEW_REQUEST, false);
    } else {
      Vibration.vibrate(800);
    }

    await playSound(require('../../assets/sound/new delivery request (1).wav'));

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
 * Hook for general order notifications (available deliveries list changes)
 */
export const useNewDeliverySound = (deliveryCount: number) => {
  const prevCountRef = useRef(deliveryCount);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    if (deliveryCount > prevCountRef.current) {
      const newCount = deliveryCount - prevCountRef.current;
      triggerAlert(newCount);
    }
    prevCountRef.current = deliveryCount;
  }, [deliveryCount]);

  const triggerAlert = useCallback(async (count: number) => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN_NEW_ORDER, false);
    } else {
      Vibration.vibrate(1000);
    }

    await playSound(require('../../assets/sound/new delivery request (1).wav'));

    setPopupMessage(
      count === 1
        ? 'New delivery available!'
        : `${count} new deliveries available!`
    );
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
export const playNotificationAlert = async () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(VIBRATION_PATTERN_NEW_REQUEST, false);
  } else {
    Vibration.vibrate(800);
  }

  await playSound(require('../../assets/sound/new delivery request (1).wav'));
};
