import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, ScrollViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type RefreshHandler = () => void | Promise<unknown>;

/**
 * Brand-coloured `RefreshControl` with the §11 guarantees baked in.
 *
 * Use `refreshControl={usePullToRefresh(onRefresh)}` on an existing FlatList or
 * ScrollView; use the `<PullToRefresh>` wrapper only for plain scrolling content.
 */
export const usePullToRefresh = (onRefresh: RefreshHandler, externalRefreshing?: boolean) => {
  const { colors } = useTheme();
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const inFlight = useRef(false);

  const handleRefresh = useCallback(async () => {
    // A second pull while one is still running must not fire another request.
    if (inFlight.current) return;
    inFlight.current = true;
    setInternalRefreshing(true);

    try {
      await onRefresh();
    } finally {
      inFlight.current = false;
      setInternalRefreshing(false);
    }
  }, [onRefresh]);

  // When the caller already tracks its own refreshing flag (e.g. useApiState's
  // `isRefreshing`), that wins -- otherwise the spinner could hide while the
  // request is still running.
  const refreshing = externalRefreshing ?? internalRefreshing;

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      // Android spinner
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
      // iOS spinner
      tintColor={colors.primary}
      title="Refreshing..."
      titleColor={colors.textSecondary}
    />
  );
};

type Props = ScrollViewProps & {
  onRefresh: RefreshHandler;
  /** Pass `isRefreshing` from `useApiState` so the spinner tracks the real request. */
  refreshing?: boolean;
  children: React.ReactNode;
};

/**
 * Scrollable container with pull-to-refresh.
 *
 * Content is never unmounted while refreshing -- the existing children stay
 * mounted and visible, which is the whole point of §11.
 */
export const PullToRefresh = ({ onRefresh, refreshing, children, contentContainerStyle, ...props }: Props) => {
  const refreshControl = usePullToRefresh(onRefresh, refreshing);

  return (
    <ScrollView
      refreshControl={refreshControl}
      // Lets a short page still be pulled down on iOS.
      alwaysBounceVertical
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
