/**
 * RuVo colour system.
 *
 * The canvas is a warm ivory rather than white, and every neutral is mixed
 * toward the same warm axis — borders, sunken fills, text greys and shadows all
 * carry a trace of the brand's warmth. A cool `#F8F9FB` grey next to RuVo yellow
 * reads as two unrelated palettes stacked on top of each other; warming the
 * neutrals is what makes the yellow look chosen rather than applied.
 *
 * Yellow is an *accent*, not a surface: it appears on the primary action, the
 * active navigation pill, ratings, and small emphasis marks. Large yellow fills
 * are deliberately absent — they are what makes a commerce app look like a
 * discount flyer.
 *
 * Both `light` and `dark` expose exactly the same keys. `ThemeContext` types the
 * resolved palette as `typeof Colors.light`, so a key added to one and not the
 * other is a type error rather than a runtime `undefined`.
 */
/**
 * `expo-blur`'s tint is a function of the theme name, not of a palette entry, so
 * it is resolved in `ThemeContext` rather than duplicated in both palettes —
 * TypeScript narrows a `const` of union type to its literal at each use site,
 * which would make the light palette's field type `'light'` and reject the dark
 * palette outright.
 */
export type BlurTint = 'light' | 'dark';

export const Colors = {
  ai: '#B8A4FF',

  // ─── Brand ───────────────────────────────────────────────────────────────
  /** RuVo Gold & Orange Warmth matching icon palette */
  primary: '#FF8A00',
  primaryLight: '#FFA033',
  primaryDark: '#E07600',
  /** Deepest warm tone — for contrast on light fills */
  primaryDeep: '#A35200',
  /** The faintest gold-warm wash */
  primarySoft: '#FFF3E0',
  /** Dark RuVo Ink */
  secondary: '#171A1F',
  deep: '#202A3A',

  // ─── Accent & verification ───────────────────────────────────────────────
  accent: '#18A957',
  accentLight: '#22C55E',
  accentSoft: '#E8F8EE',

  // ─── Gold & Warm highlights ─────────────────────────────────────────────
  gold: '#FF8A00',
  goldLight: '#FFB359',
  goldDark: '#E07600',
  goldSoft: '#FFF3E0',
  goldBorder: '#EEDDC8',

  /** Text/icon colour that sits on a `primary` fill. Dark ink. */
  onPrimary: '#171A1F',
  onAccent: '#FFFFFF',

  // ─── Feedback ────────────────────────────────────────────────────────────
  error: '#D94A4A',
  warning: '#E99A16',
  success: '#18A957',
  info: '#3478C8',

  // ─── Light — RuVo Cream ──────────────────────────────────────────────────
  light: {
    /** Page canvas. RuVo Cream. */
    background: '#FAF7F0',
    /** Default surface for cards and sheets. */
    surface: '#FFFFFF',
    /** Cards that need elevation. */
    card: '#FFFFFF',

    border: '#EDEAD4',
    divider: '#F5F2EA',

    placeholder: '#77736B',
    disabled: '#EFEAE0',
    disabledText: '#A39D93',

    /** Primary text: Deep charcoal #171717 */
    textPrimary: '#171717',
    textSecondary: '#77736B',
    textHint: '#A39D93',

    overlay: 'rgba(35,28,16,0.42)',

    // ── Layering ──────────────────────────────────────────────────────────
    /** A surface that sits above `surface` — nested cards, selected rows. */
    surfaceElevated: '#FFFFFF',
    /** A recessed fill — input backgrounds, inactive chips, thumbnails. */
    surfaceSunken: '#F5F1E8',
    /** One step warmer/deeper than sunken, for a third layer. */
    surfaceMuted: '#EFEADF',
    hairline: '#F0EBE1',

    // ── Translucency & glass ──────────────────────────────────────────────
    scrim: 'rgba(30,26,21,0.38)',
    scrimStrong: 'rgba(30,26,21,0.68)',
    translucent: 'rgba(255,255,255,0.86)',
    translucentBorder: 'rgba(255,255,255,0.72)',
    /** Fill painted over a blur view. Kept light so text on top stays readable. */
    glass: 'rgba(255,253,248,0.74)',
    glassBorder: 'rgba(255,255,255,0.66)',

    // ── Ambient decoration ────────────────────────────────────────────────
    // The soft out-of-focus shapes behind content. Low enough opacity that they
    // never compete with text; see `AmbientBackground`.
    ambientWarm: 'rgba(245,183,0,0.13)',
    ambientCool: 'rgba(118,152,205,0.09)',
    ambientMint: 'rgba(22,163,74,0.07)',
    /** Top stop of the page's vertical wash; `background` is the bottom stop. */
    canvasTop: '#FFFCF6',

    // ── Soft status fills ─────────────────────────────────────────────────
    primarySoftBg: '#FFF2C2',
    accentSoft: '#E8F8EE',
    successSoft: '#E8F8EE',
    warningSoft: '#FEF5E7',
    errorSoft: '#FDECEC',
    infoSoft: '#EBF2FA',

    // ── Pastel supporting tints ───────────────────────────────────────────
    // Category tiles, illustration medallions, status groupings. Muted on
    // purpose: these carry variety without turning the UI colourful.
    tintSand: '#FBF1DC',
    tintMint: '#E8F4EC',
    tintSky: '#E9F0FA',
    tintBlush: '#FBECEA',
    tintLilac: '#F0EDF9',
    tintClay: '#F6EDE6',
  },

  // ─── Dark — warm layered charcoal ────────────────────────────────────────
  // Not an inversion of the light theme. Surfaces step up in lightness rather
  // than down, borders are barely-there rather than bright, and the yellow is
  // held back to accents so it does not glare on an unlit surface.
  dark: {
    background: '#131110',
    surface: '#1D1A18',
    card: '#1D1A18',

    border: '#2C2822',
    divider: '#231F1C',

    placeholder: '#7C736A',
    disabled: '#2C2724',
    disabledText: '#7C736A',

    textPrimary: '#F7F3EC',
    textSecondary: '#A9A199',
    textHint: '#7C736A',

    overlay: 'rgba(8,7,6,0.78)',

    surfaceElevated: '#242120',
    surfaceSunken: '#0D0C0B',
    surfaceMuted: '#2B2724',
    hairline: '#252220',

    scrim: 'rgba(8,7,6,0.5)',
    scrimStrong: 'rgba(8,7,6,0.76)',
    translucent: 'rgba(29,26,24,0.88)',
    translucentBorder: 'rgba(247,243,236,0.12)',
    glass: 'rgba(29,26,24,0.78)',
    glassBorder: 'rgba(247,243,236,0.1)',

    ambientWarm: 'rgba(245,183,0,0.09)',
    ambientCool: 'rgba(118,152,205,0.06)',
    ambientMint: 'rgba(22,163,74,0.05)',
    canvasTop: '#181513',

    primarySoftBg: '#332708',
    accentSoft: '#0F2E1C',
    successSoft: '#0F2E1C',
    warningSoft: '#3A2408',
    errorSoft: '#3A1414',
    infoSoft: '#152548',

    tintSand: '#332A18',
    tintMint: '#14291D',
    tintSky: '#17223A',
    tintBlush: '#331D1C',
    tintLilac: '#231F33',
    tintClay: '#2C2521',
  },
};
