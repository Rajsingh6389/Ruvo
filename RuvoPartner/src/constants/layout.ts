/**
 * Centralized layout and safe-area calculation system for Ruvo Partner.
 * Provides a single source of truth for responsive tab bar heights,
 * navigation spacing, and content clearances across Android and iOS devices.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BASE_TAB_BAR_HEIGHT = 64;

/**
 * Calculates the responsive height of the bottom tab bar.
 * Insets.bottom accounts for Android 3-button navigation (e.g. 48px)
 * or gesture pill navigation (e.g. 16-34px).
 */
export const getTabBarHeight = (bottomInset: number): number => {
  return BASE_TAB_BAR_HEIGHT + Math.max(bottomInset, 6);
};

/**
 * Calculates the total vertical space occupied by the bottom tab bar.
 */
export const getTabBarTotalHeight = (bottomInset: number): number => {
  return getTabBarHeight(bottomInset);
};

/**
 * Returns content bottom padding to ensure scrollable content
 * (lists, cards, buttons) is never covered by the bottom tab bar.
 */
export const getBottomNavPadding = (
  bottomInset: number,
  hasFloatingCTA: boolean = false,
  extraSpace: number = 20
): number => {
  const tabHeight = getTabBarTotalHeight(bottomInset);
  const ctaSpace = hasFloatingCTA ? 72 : 0;
  return tabHeight + ctaSpace + extraSpace;
};

/**
 * Convenient React hook to get bottom navigation dimensions and clearance.
 */
export const useBottomNavSpacing = (hasFloatingCTA: boolean = false, extraSpace: number = 20) => {
  const insets = useSafeAreaInsets();
  const tabHeight = getTabBarTotalHeight(insets.bottom);
  const navClearance = getBottomNavPadding(insets.bottom, hasFloatingCTA, extraSpace);

  return {
    insets,
    tabHeight,
    bottomInset: insets.bottom,
    navClearance,
  };
};
