import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface StickyActionBarProps {
  children: React.ReactNode;
  /**
   * Adds the bottom safe-area inset. Leave `true` on stack screens. Pass `false`
   * inside a bottom-tab screen (Cart): the tab bar already sits below the
   * content area and handles that inset itself, so adding it again leaves a gap.
   */
  withSafeArea?: boolean;
  /**
   * Fades the scrolling content out behind the bar instead of cutting it off at
   * a hard border — the premium version of a sticky footer.
   */
  fade?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pinned bottom action bar for Cart, Checkout and ProductDetails.
 *
 * Each of those screens had its own footer with a hand-picked
 * `Platform.OS === 'ios' ? 30 : 16` bottom padding, which under-padded on
 * gesture-navigation Android and over-padded elsewhere. This reads the real
 * inset, and keeps the bar above the keyboard-independent content flow so it
 * never covers the list it belongs to (callers pad their list by the bar height).
 */
export const StickyActionBar = ({
  children,
  withSafeArea = true,
  fade = true,
  style,
}: StickyActionBarProps) => {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {fade ? (
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', colors.background]}
          style={styles.fade}
        />
      ) : null}

      <View
        style={[
          styles.bar,
          shadows.lg,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: (withSafeArea ? insets.bottom : 0) + 12,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // The caller positions this at the end of a flex column, or absolutely.
    width: '100%',
  },
  fade: {
    height: 20,
    width: '100%',
  },
  bar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
