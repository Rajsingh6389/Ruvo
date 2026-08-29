import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { sf, sh, sw } from '../utils/responsive';

// ── Timing configuration constants (no hardcoded inline numbers) ──
export const LOADER_CONFIG = {
  DEBOUNCE_MS: 60,
  MIN_DURATION_MS: 250,
  FADE_DURATION_MS: 200,
  PULSE_PERIOD_MS: 750,
} as const;

interface PageLoaderContextType {
  isLoading: boolean;
  message?: string;
  showLoader: (msg?: string) => void;
  hideLoader: () => void;
  triggerTransition: (msg?: string) => void;
}

const PageLoaderContext = createContext<PageLoaderContextType>({
  isLoading: false,
  message: undefined,
  showLoader: () => {},
  hideLoader: () => {},
  triggerTransition: () => {},
});

export const usePageLoader = () => useContext(PageLoaderContext);

interface PageLoaderProviderProps {
  children: React.ReactNode;
}

export const PageLoaderProvider: React.FC<PageLoaderProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const showTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showLoader = useCallback((msg?: string) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      setMessage(msg);
      setIsLoading(true);
      showTimeRef.current = Date.now();
    }, LOADER_CONFIG.DEBOUNCE_MS);
  }, []);

  const hideLoader = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const elapsed = Date.now() - showTimeRef.current;
    const remaining = Math.max(0, LOADER_CONFIG.MIN_DURATION_MS - elapsed);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    hideTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      setMessage(undefined);
    }, remaining);
  }, []);

  const triggerTransition = useCallback((msg?: string) => {
    showLoader(msg);
    hideLoader();
  }, [showLoader, hideLoader]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <PageLoaderContext.Provider
      value={{
        isLoading,
        message,
        showLoader,
        hideLoader,
        triggerTransition,
      }}
    >
      {children}
    </PageLoaderContext.Provider>
  );
};

export const RuvoPageLoader: React.FC = () => {
  const { isLoading, message } = usePageLoader();
  const { colors } = useTheme();

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (isLoading) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: LOADER_CONFIG.FADE_DURATION_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: LOADER_CONFIG.PULSE_PERIOD_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.85,
            duration: LOADER_CONFIG.PULSE_PERIOD_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();

      return () => pulseLoop.stop();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: LOADER_CONFIG.FADE_DURATION_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, opacity, scale, pulse]);

  // Don't keep mounted when unneeded to optimize performance
  if (!isLoading) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          backgroundColor: colors.overlay || 'rgba(0, 0, 0, 0.25)',
          opacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface || colors.card,
            borderColor: colors.border,
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.primary + '14',
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </Animated.View>

        {message ? (
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {message}
          </Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sw(24),
  },
  container: {
    borderRadius: sw(20),
    borderWidth: 1,
    paddingVertical: sh(24),
    paddingHorizontal: sw(28),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: sh(8) },
    shadowOpacity: 0.12,
    shadowRadius: sw(16),
    elevation: 8,
    minWidth: sw(140),
  },
  iconWrap: {
    width: sw(60),
    height: sw(60),
    borderRadius: sw(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: sh(14),
    fontSize: sf(13),
    fontWeight: '600',
    textAlign: 'center',
  },
});
