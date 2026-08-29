import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { PressableScale } from './PressableScale';

interface SectionHeaderProps {
  title: string;
  /** Small eyebrow above the title. */
  overline?: string;
  /** Supporting line under the title — a count, a qualifier. */
  subtitle?: string;
  /** Optional small grocery icon badge beside the title. */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Title … View All" row.
 *
 * Repeated in Home, Groceries and NearbyShops with three different title sizes
 * and two different link colours. The action is a real button with a 44px-high
 * touch area, which the previous bare `<Text>` links were not.
 */
export const SectionHeader = ({
  title,
  overline,
  subtitle,
  icon,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) => {
  const { colors, typography } = useTheme();
  const { sf, isCompact } = useResponsive();

  return (
    <View style={[styles.container, { paddingHorizontal: isCompact ? 12 : 16 }, style]}>
      <View style={styles.textBlock}>
        {overline ? (
          <Text style={[typography.overline, { color: colors.primaryLight }]} numberOfLines={1}>
            {overline}
          </Text>
        ) : null}

        <View style={styles.titleRow}>
          {icon ? (
            <View style={[styles.iconBadge, { backgroundColor: colors.surfaceSunken || '#E7F0E9' }]}>
              <Ionicons name={icon} size={15} color={colors.primary || '#173F35'} />
            </View>
          ) : null}

          <Text
            style={[typography.sectionTitle, { color: colors.textPrimary, fontSize: sf(17) }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
        </View>

        {subtitle ? (
          <Text
            style={[typography.caption, { color: colors.textSecondary, fontSize: sf(12) }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          accessibilityLabel={`${actionLabel}, ${title}`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.action}
        >
          <Text
            style={[typography.caption, styles.actionText, { color: colors.primary, fontSize: sf(13) }]}
          >
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </PressableScale>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
    marginTop: 6,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    minHeight: 32,
  },
  actionText: {
    fontWeight: '700',
  },
});
