/**
 * Corner-radius scale.
 *
 * Radius is the loudest signal that two screens belong to the same product, so
 * this is a single scale with no per-screen exceptions. The values follow the
 * design brief's bands: small controls 12–14, inputs 14–18, buttons 16–20,
 * cards 20–26, hero surfaces 26–32, bottom navigation 24–30.
 *
 * Two ways in: the abstract `xs…xxl` steps (for anything sizing itself relative
 * to its neighbours) and the semantic aliases (`card`, `input`, `button`, `hero`,
 * `nav`, `sheet`). Prefer the semantic name when the element has an obvious role
 * — it reads better and it stays correct if the scale is retuned.
 */
export const RADIUS = {
  /** Tiny badges and inline marks that sit *inside* another rounded surface. */
  xs: 10,
  /** Small controls, chips, thumbnails, icon buttons. */
  sm: 14,
  /** Default card / tile radius. */
  md: 22,
  /** Prominent cards, bottom sheets, grouped panels. */
  lg: 26,
  /** Hero banners and full-width feature panels. */
  xl: 30,
  /** Large illustration medallions. */
  xxl: 36,
  /** Fully rounded — segmented controls, avatars, floating actions. */
  pill: 999,

  // ── Semantic aliases ─────────────────────────────────────────────────────
  /** Small controls: steppers, tiny toggles, count pills. */
  control: 13,
  /** Text inputs and search fields. */
  input: 16,
  /** Buttons and primary CTAs. */
  button: 18,
  /** Standard card. */
  card: 22,
  /** Large / feature card. */
  cardLarge: 26,
  /** Hero banner, cover image, promotional surface. */
  hero: 30,
  /** Bottom-sheet top corners. */
  sheet: 28,
  /** Floating bottom navigation container. */
  nav: 28,
  /** Image containers nested inside a card. */
  image: 18,
  /** Small square thumbnails (cart rows, order lines). */
  thumb: 16,
} as const;

export type RadiusToken = keyof typeof RADIUS;
