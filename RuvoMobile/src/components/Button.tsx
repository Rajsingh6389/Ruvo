import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = ({ title, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, style, disabled, ...props }: ButtonProps) => {
  const { colors, typography, shadows } = useTheme();

  const getBackgroundColor = () => {
    if (disabled && variant !== 'ghost') return colors.disabled;
    if (variant === 'primary') return colors.primary;
    if (variant === 'secondary') return colors.surface;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return colors.disabledText;
    if (variant === 'primary') return '#FFFFFF';
    if (variant === 'secondary' || variant === 'ghost') return colors.textPrimary;
    return colors.primary; // outline
  };

  const getHeight = () => {
    if (size === 'sm') return 36;
    if (size === 'lg') return 56;
    return 48; // md
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: getBackgroundColor(), height: getHeight() },
        variant === 'outline' && { borderWidth: 1.5, borderColor: disabled ? colors.disabled : colors.primary },
        variant === 'primary' && !disabled && shadows.sm,
        style,
      ]}
      disabled={loading || disabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[typography.button, { color: getTextColor() }]}>{title}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

