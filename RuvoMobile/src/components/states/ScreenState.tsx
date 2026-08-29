import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ApiState, ApiStatus } from '../../hooks/useApiState';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { OfflineState, StaleDataBanner } from './OfflineState';
import { PageLoader } from '../loading/Loaders';

type EmptyConfig = {
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
};

type Props<T> = {
  /** The state object returned by `useApiState`. */
  state: Pick<ApiState<T>, 'status' | 'data' | 'error' | 'retry'>;
  /**
   * Placeholder for the first load. Pass the skeleton that matches this screen's
   * real layout (`<OrderListSkeleton />`, `<DashboardSkeleton />`, …) so content
   * does not jump when data lands. Falls back to a spinner if omitted.
   */
  skeleton?: React.ReactNode;
  empty: EmptyConfig;
  errorTitle?: string;
  /** Renders the loaded data. Only called with non-null data. */
  children: (data: T) => React.ReactNode;
};

/**
 * Renders the correct view for each of the seven §10 states, so no screen has to
 * hand-roll the branching (and none can forget a state).
 *
 * The invariant it protects: **once data exists it stays on screen.** A failed
 * refresh or a dropped connection shows a banner above the still-useful stale
 * data rather than replacing it with an error or offline panel (§11, §22).
 */
export function ScreenState<T>({ state, skeleton, empty, errorTitle, children }: Props<T>) {
  const { status, data, error, retry } = state;

  const hasData = data !== null && data !== undefined;

  // Stale data outranks every non-success state: showing it beats blanking the
  // screen. The banner tells the user it may be out of date.
  if (hasData && (status === 'SUCCESS' || status === 'REFRESHING' || status === 'EMPTY')) {
    const isEmptyResult = status === 'EMPTY';
    return (
      <>
        {/* An error alongside existing data means the revalidation failed, not
            that the data is gone -- so it is reported without hiding anything. */}
        <StaleDataBanner visible={Boolean(error)} message={error ?? undefined} onRetry={retry} />
        {isEmptyResult ? <EmptyState {...empty} /> : children(data as T)}
      </>
    );
  }

  switch (status as ApiStatus) {
    case 'INITIAL':
    case 'LOADING':
      return <View style={styles.fill}>{skeleton ?? <PageLoader />}</View>;

    case 'OFFLINE':
      return <OfflineState onRetry={retry} />;

    case 'ERROR':
      return (
        <ErrorState
          title={errorTitle}
          message={error ?? 'Something went wrong. Please try again.'}
          onRetry={retry}
        />
      );

    case 'EMPTY':
      return <EmptyState {...empty} />;

    default:
      // REFRESHING/SUCCESS with no data at all -- treat as still loading.
      return <View style={styles.fill}>{skeleton ?? <PageLoader />}</View>;
  }
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
