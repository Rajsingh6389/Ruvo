import { Vibration, Platform, Alert } from 'react-native';
import { useEffect, useRef, useCallback, useState } from 'react';

const VIBRATION_PATTERN_NEW_ORDER = [0, 500, 200, 500, 200, 800];
const VIBRATION_PATTERN_NEW_REQUEST = [0, 400, 150, 400, 150, 600];

/**
 * Hook that detects when new orders arrive and triggers
 * vibration + visual alert.
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
    // Vibrate with a distinctive pattern
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN_NEW_ORDER, false);
    } else {
      // iOS only supports fixed-length vibrate
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
