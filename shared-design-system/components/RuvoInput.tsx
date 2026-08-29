/**
 * RuvoInput — Universal Input Component
 * 
 * Premium text input for all RuVo apps
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoFontSize,
} from '../tokens';

export interface RuvoInputProps extends TextInputProps {
  /** Input label */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Icon on the left */
  iconLeft?: keyof typeof Ionicons.glyphMap;
  /** Icon on the right */
  iconRight?: keyof typeof Ionicons.glyphMap;
  /** Right icon press handler */
  onRightIconPress?: () => void;
  /** Input size */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Container style */
  containerStyle?: ViewStyle;
  /** Input style */
  inputStyle?: TextStyle;
  /** Show character counter */
  showCounter?: boolean;
  /** Maximum length for counter */
  maxLength?: number;
  /** Multiline with min height */
  multiline?: boolean;
  /** Min height for multiline */
  minHeight?: number;
}

export const RuvoInput: React.FC<RuvoInputProps> = ({
  label,
  helperText,
  error,
  success,
  iconLeft,
  iconRight,
  onRightIconPress,
  size = 'medium',
  disabled = false,
  containerStyle,
  inputStyle,
  showCounter = false,
  maxLength,
  multiline = false,
  minHeight,
  value,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;
  const hasSuccess = success && !hasError;

  // Size configurations
  const sizeConfig = {
    small: {
      height: 40,
      paddingHorizontal: 12,
      fontSize: RuvoFontSize.md,
      iconSize: 16,
    },
    medium: {
      height: 48,
      paddingHorizontal: RuvoSemanticSpacing.inputPaddingX,
      fontSize: RuvoFontSize.xl,
      iconSize: 18,
    },
    large: {
      height: 56,
      paddingHorizontal: 20,
      fontSize: RuvoFontSize['2xl'],
      iconSize: 20,
    },
  };

  const config = sizeConfig[size];

  // Border color based on state
  const getBorderColor = () => {
    if (hasError) return RuvoQuickColors.error;
    if (hasSuccess) return RuvoQuickColors.success;
    if (isFocused) return RuvoQuickColors.primary;
    return RuvoQuickColors.border;
  };

  // Background color based on state
  const getBackgroundColor = () => {
    if (disabled) return RuvoQuickColors.bgSecondary;
    return RuvoQuickColors.surfaceWhite;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, hasError && styles.labelError]}>
          {label}
        </Text>
      )}

      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          {
            height: multiline ? undefined : config.height,
            minHeight: multiline ? minHeight || 100 : config.height,
            paddingHorizontal: config.paddingHorizontal,
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderRadius: RuvoSemanticRadius.input,
          },
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
          hasSuccess && styles.inputSuccess,
          disabled && styles.inputDisabled,
        ]}
      >
        {/* Left Icon */}
        {iconLeft && (
          <Ionicons
            name={iconLeft}
            size={config.iconSize}
            color={hasError ? RuvoQuickColors.error : RuvoQuickColors.textSecondary}
            style={styles.iconLeft}
          />
        )}

        {/* Text Input */}
        <TextInput
          {...rest}
          value={value}
          editable={!disabled}
          maxLength={maxLength}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={RuvoQuickColors.textPlaceholder}
          style={[
            styles.input,
            {
              fontSize: config.fontSize,
              paddingTop: multiline ? 12 : 0,
              paddingBottom: multiline ? 12 : 0,
            },
            RuvoTypography.input,
            disabled && styles.inputTextDisabled,
            inputStyle,
          ]}
        />

        {/* Right Icon */}
        {iconRight && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={iconRight}
              size={config.iconSize}
              color={hasError ? RuvoQuickColors.error : RuvoQuickColors.textSecondary}
              style={styles.iconRight}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Helper Text / Error / Counter */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          {!error && helperText && (
            <Text style={styles.helperText}>{helperText}</Text>
          )}
        </View>

        {showCounter && maxLength && (
          <Text style={styles.counterText}>
            {value?.length || 0}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: RuvoSemanticSpacing.contentGap,
  },
  label: {
    ...RuvoTypography.labelSmall,
    color: RuvoQuickColors.textPrimary,
    marginBottom: 8,
    fontWeight: '600',
  },
  labelError: {
    color: RuvoQuickColors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingVertical: RuvoSemanticSpacing.inputPaddingY,
  },
  inputFocused: {
    borderWidth: 2,
  },
  inputError: {
    backgroundColor: '#FEF2F2',
  },
  inputSuccess: {
    backgroundColor: '#F0FDF4',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    color: RuvoQuickColors.textPrimary,
    padding: 0,
    margin: 0,
  },
  inputTextDisabled: {
    color: RuvoQuickColors.textSecondary,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 6,
    minHeight: 18,
  },
  footerLeft: {
    flex: 1,
  },
  helperText: {
    ...RuvoTypography.captionSmall,
    color: RuvoQuickColors.textSecondary,
  },
  errorText: {
    ...RuvoTypography.captionSmall,
    color: RuvoQuickColors.error,
    fontWeight: '500',
  },
  counterText: {
    ...RuvoTypography.captionSmall,
    color: RuvoQuickColors.textTertiary,
    marginLeft: 8,
  },
});
