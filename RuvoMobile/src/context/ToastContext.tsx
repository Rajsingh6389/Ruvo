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
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'info' | 'error';

type ToastContextData = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextData>({
  showToast: () => {},
});

export const ToastProvider = ({ children }: { children: ReactNode }) => {
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
      }, 1800);
    },
    [opacity, translateY],
  );

  const iconName =
    type === 'error' ? 'close-circle' : type === 'info' ? 'information-circle' : 'checkmark-circle';
  const backgroundColor =
    type === 'error' ? '#C62828' : type === 'info' ? '#1B5E20' : '#2E7D32';

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { backgroundColor, opacity, transform: [{ translateY }] },
          ]}
        >
          <Ionicons name={iconName} size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      ) : (
        <View />
      )}
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
