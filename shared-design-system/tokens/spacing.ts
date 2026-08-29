/**
 * RuVo Design System — Spacing Tokens
 * 
 * Consistent spacing scale for all RuVo apps
 * Based on 4px base unit
 */

/**
 * Base spacing unit (4px)
 */
export const SPACING_UNIT = 4;

/**
 * Spacing Scale
 */
export const RuvoSpacing = {
  /** 0px */
  none: 0,
  /** 2px — hairline spacing */
  xxs: SPACING_UNIT * 0.5,
  /** 4px — extra small */
  xs: SPACING_UNIT * 1,
  /** 8px — small */
  sm: SPACING_UNIT * 2,
  /** 12px — medium */
  md: SPACING_UNIT * 3,
  /** 16px — default */
  lg: SPACING_UNIT * 4,
  /** 20px — large */
  xl: SPACING_UNIT * 5,
  /** 24px — extra large */
  '2xl': SPACING_UNIT * 6,
  /** 32px — 2x extra large */
  '3xl': SPACING_UNIT * 8,
  /** 40px — 3x extra large */
  '4xl': SPACING_UNIT * 10,
  /** 48px — 4x extra large */
  '5xl': SPACING_UNIT * 12,
  /** 56px — 5x extra large */
  '6xl': SPACING_UNIT * 14,
  /** 64px — 6x extra large */
  '7xl': SPACING_UNIT * 16,
  /** 72px — 7x extra large */
  '8xl': SPACING_UNIT * 18,
  /** 80px — 8x extra large */
  '9xl': SPACING_UNIT * 20,
} as const;

/**
 * Semantic Spacing Tokens
 */
export const RuvoSemanticSpacing = {
  // ═══════════════════════════════════════════════════════════════
  // COMPONENT SPACING
  // ═══════════════════════════════════════════════════════════════
  
  /** Button horizontal padding */
  buttonPaddingX: RuvoSpacing.xl,
  /** Button vertical padding */
  buttonPaddingY: RuvoSpacing.md,
  /** Button large horizontal padding */
  buttonLargePaddingX: RuvoSpacing['2xl'],
  /** Button large vertical padding */
  buttonLargePaddingY: RuvoSpacing.lg,
  /** Button small horizontal padding */
  buttonSmallPaddingX: RuvoSpacing.md,
  /** Button small vertical padding */
  buttonSmallPaddingY: RuvoSpacing.sm,
  
  /** Input horizontal padding */
  inputPaddingX: RuvoSpacing.lg,
  /** Input vertical padding */
  inputPaddingY: RuvoSpacing.md,
  
  /** Card padding */
  cardPadding: RuvoSpacing.lg,
  /** Card large padding */
  cardPaddingLarge: RuvoSpacing['2xl'],
  /** Card small padding */
  cardPaddingSmall: RuvoSpacing.md,
  
  /** Modal padding */
  modalPadding: RuvoSpacing['2xl'],
  /** Bottom sheet padding */
  bottomSheetPadding: RuvoSpacing.lg,
  
  // ═══════════════════════════════════════════════════════════════
  // LAYOUT SPACING
  // ═══════════════════════════════════════════════════════════════
  
  /** Screen horizontal padding */
  screenPaddingX: RuvoSpacing.lg,
  /** Screen vertical padding */
  screenPaddingY: RuvoSpacing.lg,
  
  /** Section spacing */
  sectionSpacing: RuvoSpacing['2xl'],
  /** Section small spacing */
  sectionSpacingSmall: RuvoSpacing.lg,
  
  /** Content gap between elements */
  contentGap: RuvoSpacing.md,
  /** Content small gap */
  contentGapSmall: RuvoSpacing.sm,
  /** Content large gap */
  contentGapLarge: RuvoSpacing.lg,
  
  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION SPACING
  // ═══════════════════════════════════════════════════════════════
  
  /** Header height */
  headerHeight: 56,
  /** Bottom navigation height */
  bottomNavHeight: 68,
  /** Tab bar height */
  tabBarHeight: 48,
  
  // ═══════════════════════════════════════════════════════════════
  // GRID & LAYOUT
  // ═══════════════════════════════════════════════════════════════
  
  /** Grid gap */
  gridGap: RuvoSpacing.md,
  /** Grid small gap */
  gridGapSmall: RuvoSpacing.sm,
  /** Grid large gap */
  gridGapLarge: RuvoSpacing.lg,
  
  /** List item spacing */
  listItemSpacing: RuvoSpacing.md,
  /** List section spacing */
  listSectionSpacing: RuvoSpacing['2xl'],
} as const;

/**
 * Inset Spacing (for safe areas and notches)
 */
export const RuvoInsets = {
  /** Top safe area */
  top: 0, // Will be overridden by useSafeAreaInsets()
  /** Bottom safe area */
  bottom: 0, // Will be overridden by useSafeAreaInsets()
  /** Left safe area */
  left: 0,
  /** Right safe area */
  right: 0,
  
  /** Additional bottom padding for floating navigation */
  bottomWithNav: 84, // bottomNavHeight + spacing
} as const;

export type RuvoSpacingToken = keyof typeof RuvoSpacing;
export type RuvoSemanticSpacingToken = keyof typeof RuvoSemanticSpacing;
