import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PressableScale } from './PressableScale';

interface QuantityStepperProps {
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
  /** Blocks the increase button — e.g. at `stockQuantity`. */
  canIncrease?: boolean;
  /** Shows a trash glyph instead of a minus when the next step removes the item. */
  removeAtOne?: boolean;
  size?: 'sm' | 'md';
  /** Announced by screen readers, e.g. "Tomatoes". */
  itemLabel?: string;
}

/**
 * Quantity control for cart rows, product cards and the product detail screen —
 * all three of which had their own hand-rolled version with different sizes,
 * different disabled behaviour and (in two of them) 30px tap targets.
 *
 * The count pops when it changes, so a tap on a small `-`/`+` is visibly
 * acknowledged even when the number itself only moves by one.
 */
export const QuantityStepper = ({
  value,
  onIncrease,
  onDecrease,
  canIncrease = true,
  removeAtOne = false,
  size = 'md',
  itemLabel,
}: QuantityStepperProps) => {
  const { colors, typography, radius } = useTheme();
  const reduceMotion = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;

  // Skip the pop on first render — mounting a stepper at qty 3 should not animate.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (reduceMotion) return;

    Animated.sequence([
      Animated.spring(pop, { toValue: 1.22, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  }, [value, pop, reduceMotion]);

  const button = size === 'sm' ? 30 : 34;
  const decreaseIsRemove = removeAtOne && value <= 1;

  const suffix = itemLabel ? ` ${itemLabel}` : '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primarySoftBg,
          borderRadius: radius.sm,
          borderColor: colors.primary + '22',
        },
      ]}
      accessibilityRole="adjustable"
      accessibilityLabel={`Quantity${suffix}`}
      accessibilityValue={{ now: value, text: String(value) }}
    >
      <PressableScale
        onPress={onDecrease}
        // The painted button is under 44px so the row can stay compact; the tap
        // target is extended past the paint rather than the layout being grown.
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        accessibilityLabel={decreaseIsRemove ? `Remove${suffix}` : `Decrease quantity${suffix}`}
        style={[styles.button, { width: button, height: button }]}
      >
        <Ionicons
          name={decreaseIsRemove ? 'trash-outline' : 'remove'}
          size={size === 'sm' ? 15 : 17}
          color={decreaseIsRemove ? colors.error : colors.primary}
        />
      </PressableScale>

      <Animated.Text
        style={[
          typography.numeric,
          styles.value,
          { color: colors.textPrimary, transform: [{ scale: pop }] },
        ]}
      >
        {value}
      </Animated.Text>

      <PressableScale
        onPress={onIncrease}
        disabled={!canIncrease}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        accessibilityLabel={`Increase quantity${suffix}`}
        accessibilityState={{ disabled: !canIncrease }}
        style={[styles.button, { width: button, height: button }]}
      >
        <Ionicons
          name="add"
          size={size === 'sm' ? 15 : 17}
          color={canIncrease ? colors.primary : colors.disabledText}
        />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 24,
    textAlign: 'center',
  },
});
