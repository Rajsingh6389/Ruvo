import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  /**
   * Already-sanitised, user-facing text. Pass API failures through
   * `toUserMessage` (hooks/useApiState) so a Java stack trace can never land here.
   */
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  /** A way out when retrying will not help — "Go back", "Browse other shops". */
  secondaryActionTitle?: string;
  onSecondaryAction?: () => void;
  /** Set for a connectivity failure, which gets a different glyph and title. */
  variant?: 'error' | 'offline';
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The "we could not load this" state.
 *
 * A retry button is required rather than optional: an error with no way forward
 * is a dead end, and this component is the only error surface in the app.
 */
export const ErrorState = ({
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  secondaryActionTitle,
  onSecondaryAction,
  variant = 'error',
  compact,
  style,
}: ErrorStateProps) => {
  const { colors, typography, spacing, radius } = useTheme();
  const { sf } = useResponsive();

  const isOffline = variant === 'offline';
  const resolvedTitle = title ?? (isOffline ? "You're offline" : 'Something went wrong');
  const medallion = compact ? 64 : 84;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${resolvedTitle}. ${message}`}
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        { padding: spacing.xl, minHeight: compact ? 0 : 240 },
        style,
      ]}
    >
      <View
        style={[
          styles.medallion,
          {
            width: medallion,
            height: medallion,
            borderRadius: radius.pill,
            backgroundColor: isOffline ? colors.warningSoft : colors.errorSoft,
          },
        ]}
      >
        <Ionicons
          name={isOffline ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={compact ? 28 : 36}
          color={isOffline ? colors.warning : colors.error}
        />
      </View>

      <Text
        style={[
          typography.headingS,
          styles.centered,
          { color: colors.textPrimary, fontSize: sf(16), marginTop: spacing.lg },
        ]}
      >
        {resolvedTitle}
      </Text>

      <Text
        style={[
          typography.body,
          styles.centered,
          {
            color: colors.textSecondary,
            fontSize: sf(13.5),
            marginTop: spacing.xs,
            marginBottom: spacing.md,
            maxWidth: 320,
          },
        ]}
      >
        {message}
      </Text>

      <Button
        variant="outline"
        title={retryLabel}
        onPress={onRetry}
        leftIcon={<Ionicons name="refresh" size={16} color={colors.primary} />}
      />

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
  medallion: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});
