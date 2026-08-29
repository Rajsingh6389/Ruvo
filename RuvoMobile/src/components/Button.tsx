import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  /**
   * Pending-state text, e.g. `title="Pay Now" loadingLabel="Processing Payment..."`.
   * Without it a pending button shows only a spinner, which reads as "stuck" rather
   * than "working" -- so prefer passing it on every mutation button.
   */
  loadingLabel?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = ({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  loadingLabel,
  fullWidth,
  leftIcon,
  rightIcon,
  style,
  disabled,
  accessibilityLabel,
  ...props
}: ButtonProps) => {
  const { colors, typography, shadows } = useTheme();

  // A pending button must not fire again: this is the §9 duplicate-submission
  // guard, and it is deliberately derived here rather than left to call sites.
  const isBlocked = Boolean(loading) || Boolean(disabled);

  const getBackgroundColor = () => {
    if (isBlocked && variant !== 'ghost' && variant !== 'outline') {
      // A loading primary keeps its brand colour -- greying it out mid-request
      // reads as "disabled/failed" rather than "in progress".
      return loading ? colors.primary : colors.disabled;
    }
    if (variant === 'primary') return colors.primary;
    if (variant === 'secondary') return colors.surface;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled && !loading) return colors.disabledText;
    if (variant === 'primary') return '#FFFFFF';
    if (variant === 'secondary' || variant === 'ghost') return colors.textPrimary;
    return colors.primary; // outline
  };

  const getHeight = () => {
    if (size === 'sm') return 36;
    if (size === 'lg') return 56;
    return 48; // md
  };

  // 36px is under the ~44px comfortable touch target of §16. Rather than resize
  // `sm` (which would shift existing layouts), extend the touchable area beyond
  // the painted bounds so the visual stays put and the tap target grows.
  const hitSlop = size === 'sm' ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined;

  const label = loading && loadingLabel ? loadingLabel : title;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: getBackgroundColor(), height: getHeight() },
        fullWidth && styles.fullWidth,
        variant === 'outline' && { borderWidth: 1.5, borderColor: isBlocked && !loading ? colors.disabled : colors.primary },
        variant === 'primary' && !isBlocked && shadows.sm,
        loading && styles.pending,
        style,
      ]}
      disabled={isBlocked}
      activeOpacity={0.8}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isBlocked, busy: Boolean(loading) }}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} style={styles.spinner} />
        ) : (
          leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>
        )}
        <Text style={[typography.button, { color: getTextColor() }]} numberOfLines={1}>
          {label}
        </Text>
        {!loading && rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 8,
    flexDirection: 'row',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  // Slight dim so a pending button reads as busy while keeping brand colour.
  pending: {
    opacity: 0.85,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Let the label shrink instead of overflowing the button on 320px.
    flexShrink: 1,
  },
  spinner: {
    marginRight: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
