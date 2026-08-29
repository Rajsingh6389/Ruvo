import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PressableScale } from './PressableScale';

interface FavoriteButtonProps {
  value: boolean;
  onChange: (next: boolean) => void;
  size?: number;
  /** Renders as a frosted control, for use over hero imagery. */
  floating?: boolean;
  /** Names the thing being favourited, for screen readers. */
  itemLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Favourite toggle with the heart pop.
 *
 * Deliberately stateless: it renders whatever `value` the caller owns. RuVo has
 * no favourites endpoint, so this is only wired where local state already
 * existed (ProductDetails) — it does not imply persistence that the backend
 * cannot deliver.
 */
export const FavoriteButton = ({
  value,
  onChange,
  size = 22,
  floating = false,
  itemLabel,
  style,
}: FavoriteButtonProps) => {
  const { colors, radius } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Only the "on" direction celebrates; un-favouriting should feel quiet.
    if (reduceMotion || !value) return;

    Animated.sequence([
      Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 16 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 26, bounciness: 10 }),
    ]).start();
  }, [value, scale, reduceMotion]);

  const suffix = itemLabel ? ` ${itemLabel}` : '';

  return (
    <PressableScale
      onPress={() => onChange(!value)}
      scaleTo={0.9}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityState={{ selected: value }}
      accessibilityLabel={value ? `Remove${suffix} from favourites` : `Add${suffix} to favourites`}
      style={[
        styles.button,
        {
          borderRadius: radius.pill,
          backgroundColor: floating ? colors.translucent : colors.surfaceSunken,
          borderColor: floating ? colors.translucentBorder : 'transparent',
          borderWidth: floating ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={value ? 'heart' : 'heart-outline'}
          size={size}
          color={value ? colors.error : colors.textSecondary}
        />
      </Animated.View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
