import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../Button';

/**
 * Shown when there is no connectivity AND nothing was loaded (§22).
 *
 * When data *is* already on screen it must stay there instead of being replaced
 * by this -- `ScreenState` enforces that, and `useApiState` only reports OFFLINE
 * while it holds no data.
 */
export const OfflineState = ({
  onRetry,
  message = 'Some features may be unavailable until you reconnect.',
}: {
  onRetry?: () => void;
  message?: string;
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
        <Text style={styles.icon}>📡</Text>
      </View>
      <Text style={[typography.headingS, { color: colors.textPrimary, marginTop: spacing.md }]}>
        You're offline
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md },
        ]}
      >
        {message}
      </Text>
      {onRetry ? <Button variant="outline" title="Retry" onPress={onRetry} /> : null}
    </View>
  );
};

/**
 * Thin inline banner for a screen that is showing data it could not just
 * revalidate -- a failed refresh, or connectivity lost mid-session.
 *
 * Non-blocking on purpose: the stale content underneath is still useful, so this
 * explains the situation instead of replacing it.
 */
export const StaleDataBanner = ({
  visible,
  message = "Couldn't refresh — showing the last loaded data.",
  onRetry,
}: {
  visible: boolean;
  message?: string;
  onRetry?: () => void;
}) => {
  const { colors, typography } = useTheme();
  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}
    >
      <Text style={styles.bannerIcon}>⚠️</Text>
      <Text style={[typography.caption, { color: colors.textPrimary, flex: 1 }]} numberOfLines={2}>
        {message}
      </Text>
      {onRetry ? (
        <Text
          accessibilityRole="button"
          onPress={onRetry}
          style={[typography.caption, styles.bannerAction, { color: colors.primary }]}
        >
          Retry
        </Text>
      ) : null}
    </View>
  );
};

/** Offline-specific wording, for when connectivity is the known cause. */
export const OfflineBanner = ({ visible, onRetry }: { visible: boolean; onRetry?: () => void }) => (
  <StaleDataBanner
    visible={visible}
    onRetry={onRetry}
    message="You're offline — showing the last loaded data."
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 36,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  bannerIcon: {
    fontSize: 14,
  },
  bannerAction: {
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});
