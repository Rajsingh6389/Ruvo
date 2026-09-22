import { Vibration, Platform } from 'react-native';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Audio } from 'expo-av';

const VIBRATION_PATTERN_NEW_REQUEST = [0, 400, 150, 400, 150, 600];
const VIBRATION_PATTERN_NEW_ORDER = [0, 500, 200, 500, 200, 800];

const soundSource = require('../../assets/sound/delivery_request.wav');

let partnerSoundObj: Audio.Sound | null = null;

async function playDeliverySound() {
  try {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (modeErr) {}

    if (partnerSoundObj) {
      await partnerSoundObj.replayAsync().catch(async () => {
        await partnerSoundObj?.unloadAsync().catch(() => {});
        partnerSoundObj = null;
      });
    }

    if (!partnerSoundObj) {
      const { sound } = await Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: true, volume: 1.0 }
      );
      partnerSoundObj = sound;
      await sound.playAsync().catch(() => {});
    }
  } catch (err) {
    console.warn('[RuvoPartner Sound] Audio play error:', err);
  }
}

/**
 * Hook for delivery partner - detects incoming delivery requests
 * and triggers vibration + audio sound + visual popup alert.
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
    // 1. Play real audio sound file
    playDeliverySound();

    // 2. Vibrate with a distinctive pattern
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN_NEW_REQUEST, false);
    } else {
      Vibration.vibrate(800);
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

  const triggerAlert = useCallback((count: number) => {
    // 1. Play real audio sound file
    playDeliverySound();

    // 2. Vibrate
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN_NEW_ORDER, false);
    } else {
      Vibration.vibrate(1000);
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
export const playNotificationAlert = () => {
  playDeliverySound();
  if (Platform.OS === 'android') {
    Vibration.vibrate(VIBRATION_PATTERN_NEW_REQUEST, false);
  } else {
    Vibration.vibrate(800);
  }
};
