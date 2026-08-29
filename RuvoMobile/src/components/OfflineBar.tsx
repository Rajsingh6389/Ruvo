import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Slides down when offline, auto-hides on reconnect (§22).
 * Renders null when connected so it costs nothing in the layout tree.
 */
export const OfflineBar = () => {
  const { isOffline } = useNetworkStatus();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (isOffline) {
      wasOffline.current = true;
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: reduceMotion ? 0 : 300,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline.current) {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: reduceMotion ? 0 : 250,
        useNativeDriver: true,
      }).start();
      // Reset after hide animation
      const t = setTimeout(() => { wasOffline.current = false; }, 300);
      return () => clearTimeout(t);
    }
  }, [isOffline, reduceMotion, slideAnim]);

  // Don't render at all if we've never gone offline
  if (!isOffline && !wasOffline.current) return null;

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: colors.error, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.content}>
        <Text style={styles.text}>You're offline. Reconnecting...</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingTop: 44, // safe area top
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  retry: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
