import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTabBarTotalHeight } from '../constants/layout';

type ToastType = 'success' | 'info' | 'error' | 'warning';

type ToastContextData = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextData>({
  showToast: () => {},
});

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const insets = useSafeAreaInsets();
  const bottomPosition = getTabBarTotalHeight(insets.bottom) + 16;
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (nextMessage: string, nextType: ToastType = 'success') => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }

      setMessage(nextMessage);
      setType(nextType);
      setVisible(true);
      opacity.setValue(0);
      translateY.setValue(24);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 16,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) setVisible(false);
        });
      }, 2500);
    },
    [opacity, translateY],
  );

  const iconName =
    type === 'error'
      ? 'close-circle'
      : type === 'warning'
      ? 'warning'
      : type === 'info'
      ? 'information-circle'
      : 'checkmark-circle';

  const backgroundColor =
    type === 'error'
      ? '#D32F2F'
      : type === 'warning'
      ? '#ED6C02'
      : type === 'info'
      ? '#0288D1'
      : '#2E7D32';

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { bottom: bottomPosition, backgroundColor, opacity, transform: [{ translateY }] },
          ]}
        >
          <Ionicons name={iconName} size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 88,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
});
