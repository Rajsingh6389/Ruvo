import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  /** Fully custom illustration. Wins over `iconName`. */
  icon?: React.ReactNode;
  /** Preferred: an Ionicon rendered inside the gradient medallion. */
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  /** A quieter second option — "Clear filters" beside "Browse all shops". */
  secondaryActionTitle?: string;
  onSecondaryAction?: () => void;
  /** Drops the min-height and shrinks the medallion, for use inside a card. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The "there is genuinely nothing here" state.
 *
 * An empty screen has to answer two questions — *why* is this empty, and *what
 * now* — so `description` and at least one action are the point of the
 * component, not decoration. It announces itself politely to screen readers, as
 * the content it replaced may have been what the user was waiting on.
 */
export const EmptyState = ({
  title,
  description,
  actionTitle,
  onAction,
  icon,
  iconName = 'file-tray-outline',
  secondaryActionTitle,
  onSecondaryAction,
  compact,
  style,
}: EmptyStateProps) => {
  const { colors, typography, spacing, radius } = useTheme();
  const { sf } = useResponsive();

  const medallion = compact ? 68 : 96;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        { padding: spacing.xl, minHeight: compact ? 0 : 280 },
        style,
      ]}
    >
      <View style={[styles.medallionWrap, { marginBottom: spacing.lg }]}>
        <LinearGradient
          colors={[colors.primarySoftBg, colors.surface]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[
            styles.medallion,
            {
              width: medallion,
              height: medallion,
              borderRadius: radius.pill,
              borderColor: colors.border,
            },
          ]}
        >
          {icon ?? (
            <Ionicons name={iconName} size={compact ? 28 : 38} color={colors.primaryLight} />
          )}
        </LinearGradient>
      </View>

      <Text
        style={[
          typography.headingS,
          styles.centered,
          { color: colors.textPrimary, fontSize: sf(16), marginBottom: spacing.xs },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          typography.body,
          styles.centered,
          { color: colors.textSecondary, fontSize: sf(13.5), maxWidth: 320 },
        ]}
      >
        {description}
      </Text>

      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} style={styles.action} />
      ) : null}

      {secondaryActionTitle && onSecondaryAction ? (
        <Button
          variant="ghost"
          size="sm"
          title={secondaryActionTitle}
          onPress={onSecondaryAction}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionWrap: {
    // Keeps the gradient's own edge crisp when it sits on a tinted background.
    overflow: 'hidden',
    borderRadius: 999,
  },
  medallion: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    minWidth: 180,
    marginTop: 8,
  },
});
