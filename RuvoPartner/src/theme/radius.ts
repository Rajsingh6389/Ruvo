/**
 * Corner-radius scale — shared across the RuVo ecosystem.
 * Using one scale means every surface looks like it belongs to the same product.
 */
export const RADIUS = {
  /** Chips, small badges, inline pills inside a card. */
  xs: 6,
  /** Inputs, tags, thumbnails. */
  sm: 10,
  /** Default card / tile radius. */
  md: 14,
  /** Prominent cards, bottom sheets, hero surfaces. */
  lg: 18,
  /** Hero banners and full-width feature panels. */
  xl: 24,
  /** Large illustration medallions. */
  xxl: 32,
  /** Fully rounded — segmented controls, avatars, floating actions. */
  pill: 999,

  // ─── Semantic aliases ──────────────────────────────────────────────
  /** Card surfaces. */
  card: 14,
  /** Primary action buttons. */
  button: 12,
  /** Text inputs, dropdowns. */
  input: 12,
  /** Bottom navigation bar. */
  nav: 24,
  /** Hero banners. */
  hero: 20,
} as const;

export type RadiusToken = keyof typeof RADIUS;
