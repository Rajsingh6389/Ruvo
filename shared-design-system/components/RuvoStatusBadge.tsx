/**
 * RuvoStatusBadge — Universal Status Badge Component
 * 
 * Premium status indicators for orders, jobs, etc.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoRadius,
} from '../tokens';

export type RuvoStatusVariant =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'completed'
  | 'failed';

export interface RuvoStatusBadgeProps {
  /** Status variant */
  status: RuvoStatusVariant;
  /** Custom label (overrides default) */
  label?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Size */
  size?: 'small' | 'medium' | 'large';
  /** Container style */
  style?: ViewStyle;
}

export const RuvoStatusBadge: React.FC<RuvoStatusBadgeProps> = ({
  status,
  label,
  showIcon = true,
  size = 'medium',
  style,
}) => {
  // Status configurations
  const statusConfig = {
    pending: {
      label: 'Pending',
      icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
      bg: '#FEF3C7',
      color: '#92400E',
    },
    processing: {
      label: 'Processing',
      icon: 'sync' as keyof typeof Ionicons.glyphMap,
      bg: RuvoQuickColors.infoSoft,
      color: '#1E40AF',
    },
    confirmed: {
      label: 'Confirmed',
      icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
      bg: RuvoQuickColors.successSoft,
      color: '#15803D',
    },
    shipped: {
      label: 'Shipped',
      icon: 'airplane' as keyof typeof Ionicons.glyphMap,
      bg: '#DBEAFE',
      color: '#1E40AF',
    },
    delivered: {
      label: 'Delivered',
      icon: 'checkmark-done-circle' as keyof typeof Ionicons.glyphMap,
      bg: RuvoQuickColors.successSoft,
      color: '#15803D',
    },
    cancelled: {
      label: 'Cancelled',
      icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
      bg: RuvoQuickColors.errorSoft,
      color: '#B91C1C',
    },
    active: {
      label: 'Active',
      icon: 'radio-button-on' as keyof typeof Ionicons.glyphMap,
      bg: RuvoQuickColors.successSoft,
      color: '#15803D',
    },
    inactive: {
      label: 'Inactive',
      icon: 'radio-button-off' as keyof typeof Ionicons.glyphMap,
      bg: '#F3F4F6',
      color: RuvoQuickColors.textTertiary,
    },
    completed: {
      label: 'Completed',
      icon: 'checkmark-done' as keyof typeof Ionicons.glyphMap,
      bg: RuvoQuickColors.successSoft,
      color: '#15803D',
    },
    failed: {
      label: 'Failed',
      icon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
      bg: RuvoQuickColors.errorSoft,
      color: '#B91C1C',
    },
  };

  const config = statusConfig[status];

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

  const sizeStyle = sizeConfig[size];

  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
          borderRadius: sizeStyle.borderRadius,
          backgroundColor: config.bg,
        },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={config.icon}
          size={sizeStyle.iconSize}
          color={config.color}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          RuvoTypography.overline,
          {
            fontSize: sizeStyle.fontSize,
            color: config.color,
            lineHeight: sizeStyle.fontSize + 4,
          },
        ]}
      >
        {label || config.label}
      </Text>
    </View>
  );
};

/**
 * RuvoOrderStatusBadge — Specific order status badge
 */
export interface RuvoOrderStatusBadgeProps {
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const RuvoOrderStatusBadge: React.FC<RuvoOrderStatusBadgeProps> = ({
  status,
  size = 'medium',
  style,
}) => {
  const statusMap: Record<string, RuvoStatusVariant> = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'processing',
    READY: 'shipped',
    PICKED_UP: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  };

  return (
    <RuvoStatusBadge
      status={statusMap[status]}
      size={size}
      style={style}
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
