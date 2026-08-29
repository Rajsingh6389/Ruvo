/**
 * Elevation scale — warm-tinted, soft shadows.
 *
 * Pure-black shadows over a warm cream surface read as grime rather than depth.
 * The tint pulls from the RuVo forest (#0B1F1A) so shadows sit in the same
 * colour family as the surfaces casting them.
 */
const SHADOW_TINT = '#0B1F1A';

export const SHADOWS = {
  /** Resting cards / list rows. */
  sm: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  /** Default card elevation. */
  md: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  /** Raised cards, hero surfaces, sticky bars. */
  lg: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 6,
  },
  /** Floating layers — modals, toasts, FABs. */
  xl: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 12,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export type ShadowToken = keyof typeof SHADOWS;
