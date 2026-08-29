import React, { useRef } from 'react';
import {
  AccessibilityProps,
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'>, AccessibilityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far in the surface presses. Larger cards want a subtler value. */
  scaleTo?: number;
  disabled?: boolean;
}

/**
 * The one press interaction for every tappable surface in the app.
 *
 * Two near-identical `Tappable` helpers were declared inline in HomeScreen and
 * GroceriesScreen, and everything else used `TouchableOpacity`'s flat fade — so
 * a card felt different depending on which screen you were on. This is that
 * press-in feel, once, on `Pressable` (which reports its state to screen readers
 * and supports `accessibilityRole`, unlike `TouchableWithoutFeedback`).
 *
 * Under Reduce Motion the surface does not travel; it fades instead, so the tap
 * still acknowledges itself without movement (§23).
 */
export const PressableScale = ({
  children,
  style,
  scaleTo = 0.97,
  disabled,
  ...props
}: PressableScaleProps) => {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animate = (pressed: boolean) => {
    if (disabled) return;

    if (reduceMotion) {
      Animated.timing(opacity, {
        toValue: pressed ? 0.7 : 1,
        duration: 90,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.spring(scale, {
      toValue: pressed ? scaleTo : 1,
      useNativeDriver: true,
      speed: pressed ? 40 : 28,
      bounciness: pressed ? 4 : 8,
    }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={() => animate(true)}
      onPressOut={() => animate(false)}
      style={[style, { opacity, transform: [{ scale }] }]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};
