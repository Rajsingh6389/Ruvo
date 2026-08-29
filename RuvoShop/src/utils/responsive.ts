import { useMemo } from 'react';
import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/** Widths below this are the 320–359px devices that need the tightest layout. */
export const COMPACT_MAX_WIDTH = 360;
/** Tablets, and foldables opened flat. */
export const TABLET_MIN_WIDTH = 768;

const scaleWidth = (size: number, width: number) => Math.round((width / BASE_WIDTH) * size);

const scaleHeight = (size: number, height: number) => Math.round((height / BASE_HEIGHT) * size);

const scaleFont = (size: number, width: number) => {
  const scale = width / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size + (scale - 1) * size * 0.45));
};

const percentOf = (percentage: number, total: number) => Math.round((percentage * total) / 100);

// ── Module-scope helpers ──────────────────────────────────────────────────────
// For use inside StyleSheet.create, where no hook can run. Each reads the window
// at call time, so a value baked into a StyleSheet stays frozen at whatever the
// window was on first render. Anything that must survive an orientation change
// or a foldable unfolding belongs in useResponsive() instead.

/** Scale a horizontal dimension against a 375px design baseline. */
export const sw = (size: number): number => scaleWidth(size, Dimensions.get('window').width);

/** Scale a vertical dimension against an 812px design baseline. */
export const sh = (size: number): number => scaleHeight(size, Dimensions.get('window').height);

/** Scale a font size, blended at 45% so text stays legible on small screens. */
export const sf = (size: number): number => scaleFont(size, Dimensions.get('window').width);

/** Percentage of window width. */
export const wp = (percentage: number): number => percentOf(percentage, Dimensions.get('window').width);

/** Percentage of window height. */
export const hp = (percentage: number): number => percentOf(percentage, Dimensions.get('window').height);

export type Responsive = {
  width: number;
  height: number;
  /** True on 320–359px devices. Drop to single-column, trim padding, shorten labels. */
  isCompact: boolean;
  /** True at 768px and above. Allow multi-column and wider max-widths. */
  isTablet: boolean;
  isLandscape: boolean;
  sw: (size: number) => number;
  sh: (size: number) => number;
  sf: (size: number) => number;
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
};

/**
 * Rotation- and foldable-aware scaling, plus the breakpoint flags used for
 * layout decisions. Prefer this inside component bodies; it re-renders on every
 * window change, which the bare sw/sh/sf exports cannot do.
 */
export const useResponsive = (): Responsive => {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      height,
      isCompact: width < COMPACT_MAX_WIDTH,
      isTablet: width >= TABLET_MIN_WIDTH,
      isLandscape: width > height,
      sw: (size: number) => scaleWidth(size, width),
      sh: (size: number) => scaleHeight(size, height),
      sf: (size: number) => scaleFont(size, width),
      wp: (percentage: number) => percentOf(percentage, width),
      hp: (percentage: number) => percentOf(percentage, height),
    }),
    [width, height],
  );
};

export default {
  sw,
  sh,
  sf,
  wp,
  hp,
};
