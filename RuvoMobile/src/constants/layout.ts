import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Base height of the floating bottom tab bar (excluding insets and margins).
 */
export const BASE_TAB_BAR_HEIGHT = 66;

/**
 * Minimum margin bottom between the floating tab bar and screen edge / system navigation.
 */
export const MIN_TAB_BAR_MARGIN_BOTTOM = 8;

/**
 * Calculates the internal height of the floating tab bar for given bottom safe-area inset.
 */
export function getTabBarHeight(bottomInset: number = 0): number {
  return BASE_TAB_BAR_HEIGHT + Math.max(bottomInset, MIN_TAB_BAR_MARGIN_BOTTOM);
}

/**
 * Calculates the bottom margin of the floating tab bar from the screen edge.
 */
export function getTabBarMarginBottom(bottomInset: number = 0): number {
  return Math.max(bottomInset, MIN_TAB_BAR_MARGIN_BOTTOM);
}

/**
 * Calculates the total vertical space occupied by the floating tab bar from the
 * screen's absolute bottom edge to the top edge of the tab bar:
 * tabHeight + tabMarginBottom = 66 + 2 * max(bottomInset, 8).
 */
export function getTabBarTotalHeight(bottomInset: number = 0): number {
  return getTabBarHeight(bottomInset) + getTabBarMarginBottom(bottomInset);
}

/**
 * Calculates the recommended content container bottom padding for scroll views
 * on screens that have the floating bottom tab bar.
 */
export function getBottomNavPadding(bottomInset: number = 0, extraPadding: number = 16): number {
  return getTabBarTotalHeight(bottomInset) + extraPadding;
}

/**
 * Calculates responsive bottom spacing for scrollable screens or fixed bottom bars,
 * dynamically adapting depending on whether the screen lives inside the tab bar or is a stack screen.
 */
export function getScreenBottomPadding(
  bottomInset: number = 0,
  options?: { isTabScreen?: boolean; extraPadding?: number }
): number {
  const extra = options?.extraPadding ?? 16;
  if (options?.isTabScreen) {
    return getTabBarTotalHeight(bottomInset) + extra;
  }
  return Math.max(bottomInset, 16) + extra;
}

/**
 * React hook providing dynamic tab bar heights and safe-area bottom clearances
 * for use in screens and components.
 */
export function useBottomNavSpacing(options?: { isTabScreen?: boolean; extraPadding?: number }) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  const tabHeight = getTabBarHeight(bottomInset);
  const tabMarginBottom = getTabBarMarginBottom(bottomInset);
  const totalTabBarHeight = getTabBarTotalHeight(bottomInset);
  const scrollBottomPadding = getScreenBottomPadding(bottomInset, options);
  const fixedBottomOffset = options?.isTabScreen ? totalTabBarHeight : Math.max(bottomInset, 12);

  return {
    insets,
    bottomInset,
    tabHeight,
    tabMarginBottom,
    totalTabBarHeight,
    scrollBottomPadding,
    fixedBottomOffset,
  };
}
