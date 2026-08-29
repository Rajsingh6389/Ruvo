/**
 * RuvoButton — Universal Button Component
 * 
 * Premium button for all RuVo apps
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
  RuvoDuration,
} from '../tokens';

export type RuvoButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type RuvoButtonSize = 'small' | 'medium' | 'large';

export interface RuvoButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /** Button text */
  children: string;
  /** Button variant */
  variant?: RuvoButtonVariant;
  /** Button size */
  size?: RuvoButtonSize;
  /** Show loading spinner */
  loading?: boolean;
  /** Disable button */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon before text */
  iconLeft?: keyof typeof Ionicons.glyphMap;
  /** Icon after text */
  iconRight?: keyof typeof Ionicons.glyphMap;
  /** Custom button style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Icon size override */
  iconSize?: number;
}

export const RuvoButton: React.FC<RuvoButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  style,
  textStyle,
  iconSize,
  onPress,
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Size styles
  const sizeStyles = {
    small: {
      paddingVertical: RuvoSemanticSpacing.buttonSmallPaddingY,
      paddingHorizontal: RuvoSemanticSpacing.buttonSmallPaddingX,
      borderRadius: RuvoSemanticRadius.buttonSmall,
    },
    medium: {
      paddingVertical: RuvoSemanticSpacing.buttonPaddingY,
      paddingHorizontal: RuvoSemanticSpacing.buttonPaddingX,
      borderRadius: RuvoSemanticRadius.button,
    },
    large: {
      paddingVertical: RuvoSemanticSpacing.buttonLargePaddingY,
      paddingHorizontal: RuvoSemanticSpacing.buttonLargePaddingX,
      borderRadius: RuvoSemanticRadius.buttonLarge,
    },
  };

  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: RuvoQuickColors.primary,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: RuvoQuickColors.surfaceWhite,
      borderWidth: 1,
      borderColor: RuvoQuickColors.border,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: RuvoQuickColors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    danger: {
      backgroundColor: RuvoQuickColors.error,
      borderWidth: 0,
    },
  };

  // Text color by variant
  const textColors = {
    primary: RuvoQuickColors.textPrimary,
    secondary: RuvoQuickColors.textPrimary,
    outline: RuvoQuickColors.primary,
    ghost: RuvoQuickColors.textPrimary,
    danger: '#FFFFFF',
  };

  // Text size by button size
  const textSizes = {
    small: RuvoTypography.buttonSmall,
    medium: RuvoTypography.button,
    large: RuvoTypography.buttonLarge,
  };

  // Icon sizes
  const iconSizes = {
    small: iconSize || 14,
    medium: iconSize || 16,
    large: iconSize || 18,
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        {...rest}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          styles.button,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && styles.fullWidth,
          variant === 'primary' && !disabled && RuvoSemanticShadows.button,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : RuvoQuickColors.primary}
          />
        ) : (
          <>
            {iconLeft && (
              <Ionicons
                name={iconLeft}
                size={iconSizes[size]}
                color={textColors[variant]}
                style={styles.iconLeft}
              />
            )}
            <Text
              style={[
                textSizes[size],
                { color: textColors[variant] },
                isDisabled && styles.disabledText,
                textStyle,
              ]}
            >
              {children}
            </Text>
            {iconRight && (
              <Ionicons
                name={iconRight}
                size={iconSizes[size]}
                color={textColors[variant]}
                style={styles.iconRight}
              />
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.6,
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
});
