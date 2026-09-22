import { Vibration, Platform } from 'react-native';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Audio } from 'expo-av';

const VIBRATION_PATTERN_NEW_REQUEST = [0, 400, 150, 400, 150, 600];
const VIBRATION_PATTERN_NEW_ORDER = [0, 500, 200, 500, 200, 800];

/**
 * Hook for delivery partner - detects incoming delivery requests
 * and triggers vibration + visual popup alert.
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

  const triggerRequestAlert = useCallback(async () => {
    // Vibrate with a distinctive pattern
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN_NEW_REQUEST, false);
    } else {
      Vibration.vibrate(800);
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sound/new delivery request (1).wav')
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (e) {
      console.log('Failed to play sound', e);
    }

    setPopupMessage('New delivery request!');
    setShowPopup(true);

    // Auto-dismiss after 5 seconds
    setTimeout(() => setShowPopup(false), 5000);
  }, []);

  const dismissPopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  return { showPopup, popupMessage, dismissPopup };
};

/**
 * Hook for general order notifications (available deliveries list changes)
 *
 * @param deliveryCount - number of available deliveries
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

    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sound/new delivery request (1).wav')
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (e) {
      console.log('Failed to play sound', e);
    }

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

  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sound/new delivery request (1).wav')
    );
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (e) {
    console.log('Failed to play sound', e);
  }
};
