/**
 * RuvoBadge — Universal Badge Component
 * 
 * Premium badges and status indicators
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoRadius,
} from '../tokens';

export type RuvoBadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';
export type RuvoBadgeSize = 'small' | 'medium' | 'large';

export interface RuvoBadgeProps {
  /** Badge text */
  children: string;
  /** Badge variant */
  variant?: RuvoBadgeVariant;
  /** Badge size */
  size?: RuvoBadgeSize;
  /** Icon before text */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Outlined style */
  outlined?: boolean;
  /** Rounded pill style */
  pill?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
}

export const RuvoBadge: React.FC<RuvoBadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'medium',
  icon,
  outlined = false,
  pill = false,
  style,
  textStyle,
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
      iconSize: 10,
      borderRadius: RuvoRadius.sm,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 11,
      iconSize: 12,
      borderRadius: RuvoRadius.md,
    },
    large: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 12,
      iconSize: 14,
      borderRadius: RuvoRadius.lg,
    },
  };

  const config = sizeConfig[size];

  // Variant colors
  const variantColors = {
    primary: {
      bg: RuvoQuickColors.primarySoft,
      text: '#B78103',
      border: RuvoQuickColors.primary,
    },
    success: {
      bg: RuvoQuickColors.successSoft,
      text: '#15803D',
      border: RuvoQuickColors.success,
    },
    error: {
      bg: RuvoQuickColors.errorSoft,
      text: '#B91C1C',
      border: RuvoQuickColors.error,
    },
    warning: {
      bg: RuvoQuickColors.warningSoft,
      text: '#B45309',
      border: '#F59E0B',
    },
    info: {
      bg: RuvoQuickColors.infoSoft,
      text: '#1E40AF',
      border: RuvoQuickColors.info,
    },
    neutral: {
      bg: '#F3F4F6',
      text: RuvoQuickColors.textSecondary,
      border: RuvoQuickColors.border,
    },
  };

  const colors = variantColors[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          borderRadius: pill ? 999 : config.borderRadius,
          backgroundColor: outlined ? 'transparent' : colors.bg,
          borderWidth: outlined ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={config.iconSize}
          color={colors.text}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          RuvoTypography.overline,
          {
            fontSize: config.fontSize,
            color: colors.text,
            lineHeight: config.fontSize + 4,
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

/**
 * RuvoDot — Simple colored dot indicator
 */
export interface RuvoDotProps {
  /** Dot color variant */
  variant?: RuvoBadgeVariant;
  /** Custom size */
  size?: number;
  /** Custom style */
  style?: ViewStyle;
}

export const RuvoDot: React.FC<RuvoDotProps> = ({
  variant = 'neutral',
  size = 8,
  style,
}) => {
  const dotColors = {
    primary: RuvoQuickColors.primary,
    success: RuvoQuickColors.success,
    error: RuvoQuickColors.error,
    warning: '#F59E0B',
    info: RuvoQuickColors.info,
    neutral: RuvoQuickColors.textTertiary,
  };

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColors[variant],
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
});
