/**
 * Gradient presets.
 *
 * Elegance here comes from *narrow* gradients — two stops a short distance apart
 * in hue, so the result reads as a lit surface rather than as a colour blend.
 * Wide rainbow ramps are what make a commerce app look like a discount banner.
 *
 * Typed as `readonly [string, string, ...string[]]` to satisfy `LinearGradient`'s
 * minimum-two-stops signature.
 */
type Gradient = readonly [string, string, ...string[]];

export const GRADIENTS = {
  // ── Brand ────────────────────────────────────────────────────────────────
  /** The primary CTA. Two yellows, top lighter, so the button looks lit. */
  brand: ['#FFC72C', '#F0AC00'] as Gradient,
  /** A soft branded wash behind content — hero backdrops, promo cards. */
  brandSoft: ['#FFF8E4', '#FFEFC6'] as Gradient,
  /** Deep warm ink. For a hero that needs light text over it. */
  ink: ['#332A1B', '#1C1710'] as Gradient,

  // ── Hero / promotional art ───────────────────────────────────────────────
  // Used where a slide has no photograph. Gradient art renders instantly,
  // survives being offline, and cannot show a broken-image box in the most
  // prominent slot on the screen.
  heroWarm: ['#F2A93B', '#E07A2C'] as Gradient,
  heroForest: ['#1F5F4A', '#123A2E'] as Gradient,
  heroPlum: ['#4C3B6E', '#2E2445'] as Gradient,
  heroOcean: ['#2B6C93', '#17415C'] as Gradient,
  heroClay: ['#B4614A', '#7C3A2C'] as Gradient,

  // ── Surface treatments ───────────────────────────────────────────────────
  /** Page canvas wash, light theme. Top slightly brighter than the bottom. */
  canvasLight: ['#FFFCF6', '#FBF8F2'] as Gradient,
  /** Page canvas wash, dark theme. */
  canvasDark: ['#181513', '#131110'] as Gradient,
  /** A card that should read as very slightly three-dimensional. */
  surfaceSheen: ['#FFFFFF', '#FCFAF5'] as Gradient,
  /** Bottom-up scrim over imagery, so overlaid text stays legible. */
  imageScrim: ['transparent', 'rgba(24,20,14,0.06)', 'rgba(24,20,14,0.72)'] as Gradient,
  /** Top-down scrim, for floating controls over a cover image. */
  imageScrimTop: ['rgba(24,20,14,0.5)', 'transparent'] as Gradient,

  // ── Status ───────────────────────────────────────────────────────────────
  success: ['#22C55E', '#15803D'] as Gradient,
  danger: ['#EF4444', '#B91C1C'] as Gradient,
} as const;

export type GradientToken = keyof typeof GRADIENTS;
