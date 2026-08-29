import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface PageTransitionProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Delay before the entrance begins (ms). Use for staggering. */
  delay?: number;
  /** 'fade' | 'slideUp' | 'fadeSlideUp'. Default: 'fadeSlideUp'. */
  variant?: 'fade' | 'slideUp' | 'fadeSlideUp';
}

/**
 * Wraps content in a subtle entrance animation (§7).
 * Respects Reduce Motion (§23) — falls back to immediate render.
 */
export const PageTransition = ({
  children,
  style,
  delay = 0,
  variant = 'fadeSlideUp',
}: PageTransitionProps) => {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 18)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    const anims: Animated.CompositeAnimation[] = [];
    if (variant === 'fade' || variant === 'fadeSlideUp') {
      anims.push(
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          delay,
          useNativeDriver: true,
        }),
      );
    }
    if (variant === 'slideUp' || variant === 'fadeSlideUp') {
      anims.push(
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          delay,
          useNativeDriver: true,
        }),
      );
    }
    if (variant === 'slideUp') opacity.setValue(1);

    Animated.parallel(anims).start();
  }, [reduceMotion, variant, delay, opacity, translateY]);

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};
