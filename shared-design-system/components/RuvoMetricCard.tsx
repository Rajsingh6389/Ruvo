/**
 * RuvoMetricCard — Universal Metric/Stats Card Component
 * 
 * Premium metric cards for analytics and dashboards
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
} from '../tokens';

export interface RuvoMetricCardProps {
  /** Metric label */
  label: string;
  /** Metric value */
  value: string | number;
  /** Icon */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon background color */
  iconBg?: string;
  /** Icon color */
  iconColor?: string;
  /** Change percentage */
  change?: number;
  /** Change label */
  changeLabel?: string;
  /** Card press handler */
  onPress?: () => void;
  /** Container style */
  style?: ViewStyle;
}

export const RuvoMetricCard: React.FC<RuvoMetricCardProps> = ({
  label,
  value,
  icon,
  iconBg = RuvoQuickColors.primarySoft,
  iconColor = RuvoQuickColors.primary,
  change,
  changeLabel,
  onPress,
  style,
}) => {
  const isPositiveChange = change !== undefined && change >= 0;
  const showChange = change !== undefined;

  const content = (
    <View style={[styles.card, RuvoSemanticShadows.card, style]}>
      {/* Top Row: Icon & Label */}
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
        )}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {/* Value */}
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>

      {/* Change Indicator */}
      {showChange && (
        <View style={styles.changeContainer}>
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor: isPositiveChange
                  ? RuvoQuickColors.successSoft
                  : RuvoQuickColors.errorSoft,
              },
            ]}
          >
            <Ionicons
              name={isPositiveChange ? 'trending-up' : 'trending-down'}
              size={12}
              color={isPositiveChange ? RuvoQuickColors.success : RuvoQuickColors.error}
            />
            <Text
              style={[
                styles.changeText,
                {
                  color: isPositiveChange ? RuvoQuickColors.success : RuvoQuickColors.error,
                },
              ]}
            >
              {Math.abs(change!)}%
            </Text>
          </View>
          {changeLabel && (
            <Text style={styles.changeLabel}>{changeLabel}</Text>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

/**
 * RuvoCompactMetric — Compact metric display (inline)
 */
export interface RuvoCompactMetricProps {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  style?: ViewStyle;
}

export const RuvoCompactMetric: React.FC<RuvoCompactMetricProps> = ({
  label,
  value,
  icon,
  iconColor = RuvoQuickColors.textSecondary,
  style,
}) => {
  return (
    <View style={[styles.compactMetric, style]}>
      {icon && (
        <Ionicons name={icon} size={16} color={iconColor} style={styles.compactIcon} />
      )}
      <Text style={styles.compactValue}>{value}</Text>
      <Text style={styles.compactLabel}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderRadius: RuvoSemanticRadius.card,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  label: {
    ...RuvoTypography.labelSmall,
    color: RuvoQuickColors.textSecondary,
    flex: 1,
  },
  value: {
    ...RuvoTypography.h2,
    color: RuvoQuickColors.textPrimary,
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  changeText: {
    ...RuvoTypography.overline,
    fontSize: 11,
    fontWeight: '700',
  },
  changeLabel: {
    ...RuvoTypography.captionSmall,
    color: RuvoQuickColors.textTertiary,
  },
  compactMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactIcon: {
    marginRight: 2,
  },
  compactValue: {
    ...RuvoTypography.bodySemiBold,
    color: RuvoQuickColors.textPrimary,
  },
  compactLabel: {
    ...RuvoTypography.captionSmall,
    color: RuvoQuickColors.textSecondary,
  },
});
