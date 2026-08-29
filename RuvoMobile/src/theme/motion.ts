import { Easing } from 'react-native';

/**
 * The app's motion vocabulary.
 *
 * Every animation in RuVo pulls its timing from here, which is the only way a
 * press, a screen transition and a bottom sheet end up feeling like the same
 * hand. Two rules are baked into the numbers:
 *
 * - **Nothing exceeds 420ms.** Beyond that an interface stops feeling responsive
 *   and starts feeling slow, however pretty the curve is.
 * - **Entrances decelerate, exits accelerate.** Content arriving should settle;
 *   content leaving should get out of the way. `Easing.out` in, `Easing.in` out.
 *
 * Springs are expressed in `Animated.spring`'s `speed`/`bounciness` form rather
 * than tension/friction, since that is what the existing components use.
 */

export const DURATIONS = {
  /** Press feedback, ripples, icon swaps. Must feel instantaneous. */
  instant: 110,
  /** The default: fades, colour changes, small position shifts. */
  fast: 180,
  /** Card entrances, list staggers, tab pill travel. */
  base: 260,
  /** Screen transitions, bottom-sheet entry, hero crossfades. */
  slow: 340,
  /** Reserved for a single celebratory beat (order placed). */
  celebrate: 420,
} as const;

export const EASINGS = {
  /** Entrances — decelerate into place. */
  entrance: Easing.out(Easing.cubic),
  /** Exits — accelerate away. */
  exit: Easing.in(Easing.cubic),
  /** Two-way transitions that both start and end at rest. */
  standard: Easing.inOut(Easing.cubic),
  /** A touch of overshoot for something that should feel physical. */
  overshoot: Easing.bezier(0.34, 1.32, 0.64, 1),
  /** Perfectly linear — only for continuous loops (shimmer, spinners). */
  linear: Easing.linear,
} as const;

export const SPRINGS = {
  /** A surface pressing in under a finger. Fast, almost no bounce. */
  press: { speed: 40, bounciness: 4 },
  /** That surface returning. Slightly slower, slightly softer. */
  release: { speed: 26, bounciness: 8 },
  /** A bottom sheet or drawer settling. */
  sheet: { speed: 14, bounciness: 3 },
  /** A count or badge popping to acknowledge a change. */
  pop: { speed: 50, bounciness: 14 },
  /** The active navigation pill travelling between tabs. */
  pill: { speed: 20, bounciness: 6 },
} as const;

/**
 * Delay for the nth item in a staggered list entrance.
 *
 * Capped deliberately: an uncapped stagger means the twentieth card animates in
 * a second and a half after the first, which reads as a slow screen rather than
 * a choreographed one.
 */
export const stagger = (index: number, step = 45, max = 8): number =>
  Math.min(index, max) * step;

export const MOTION = { DURATIONS, EASINGS, SPRINGS, stagger };
