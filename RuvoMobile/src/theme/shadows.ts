/**
 * Elevation scale.
 *
 * Premium depth is very low opacity spread over a large blur, so a card reads as
 * *lifted* rather than *outlined*. The opposite trade — high opacity, tight blur
 * — paints a hard grey ring around every surface, which is the visual signature
 * of a default Android elevation rather than a designed one.
 *
 * `shadowColor` is a warm brown-black drawn from the ivory canvas. A pure black
 * shadow over a warm off-white background reads as dirt; matching the shadow to
 * the surface family is most of what makes the depth look intentional.
 *
 * The `sm | md | lg | xl | none` keys are unchanged, so existing call sites pick
 * this up with no edit. `card`, `raised`, `float` and `nav` are semantic aliases
 * for the four roles that actually recur.
 */
const SHADOW_TINT = '#2E2313';

export const SHADOWS = {
  /** Resting list rows and flat panels. Just enough to separate from the canvas. */
  sm: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  /** Default card elevation — product cards, shop cards, info panels. */
  md: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  /** Raised cards, hero surfaces, sticky bars. */
  lg: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 7,
  },
  /** Floating layers — bottom sheets, toasts, floating navigation. */
  xl: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    elevation: 14,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // ── Semantic aliases ─────────────────────────────────────────────────────
  /** The one shadow every card should use. */
  card: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  /** A card in its pressed/lifted state, or one that outranks its neighbours. */
  raised: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.11,
    shadowRadius: 24,
    elevation: 8,
  },
  /** Floating controls — FABs, the cart pill, the tracking sheet. */
  float: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.13,
    shadowRadius: 28,
    elevation: 12,
  },
  /** The floating bottom navigation. Casts upward as well as down. */
  nav: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 16,
  },
  /**
   * A yellow-tinted glow for the primary CTA. Gives the button a sense of
   * emitting light rather than casting a grey shade — the cheapest way to make
   * one action read as dominant without enlarging it.
   */
  brand: {
    shadowColor: '#C08A00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
};

export type ShadowToken = keyof typeof SHADOWS;
