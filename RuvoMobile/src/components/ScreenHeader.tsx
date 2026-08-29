import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { PressableScale } from './PressableScale';

interface ScreenHeaderProps {
  title: string;
  /** Second line under the title — "3 items", a shop name, an order number. */
  subtitle?: string;
  /** Shows a back chevron. Omit on a tab root, which has nowhere to go back to. */
  onBack?: () => void;
  /** Rendered at the trailing edge — action buttons, a Clear link. */
  right?: React.ReactNode;
  /**
   * Draws the header over content (hero imagery) instead of above it. The
   * caller supplies the background; the header only contributes safe-area
   * padding and floating controls.
   */
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The minimum comfortable touch target (§16). */
const TOUCH_TARGET = 44;

/**
 * The standard screen header.
 *
 * Roughly ten screens hand-rolled this, each with its own status-bar maths —
 * `Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 16` and variants
 * of it — which is why headers sat at slightly different heights across the
 * app and why a few clipped into the notch on some devices. This uses the real
 * safe-area inset instead of guessing at it.
 */
export const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  right,
  transparent,
  style,
}: ScreenHeaderProps) => {
  const { colors, typography, radius } = useTheme();
  const { sf, isCompact } = useResponsive();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          paddingHorizontal: isCompact ? 12 : 16,
          backgroundColor: transparent ? 'transparent' : colors.surface,
          borderBottomWidth: transparent ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      {onBack ? (
        <PressableScale
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={[
            styles.iconButton,
            {
              borderRadius: radius.pill,
              backgroundColor: transparent ? colors.translucent : colors.surfaceSunken,
              borderWidth: transparent ? StyleSheet.hairlineWidth : 0,
              borderColor: colors.translucentBorder,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </PressableScale>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titleBlock}>
        <Text
          numberOfLines={1}
          style={[typography.headingS, { color: colors.textPrimary, fontSize: sf(17) }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[typography.caption, { color: colors.textSecondary, fontSize: sf(12) }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>{right ?? <View style={styles.spacer} />}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 10,
  },
  iconButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Keeps the title optically centred when there is no back button or no action.
  spacer: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexShrink: 0,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
});
