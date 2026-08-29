/**
 * RuVo Design System — Typography Tokens
 * 
 * Unified typography system for all RuVo apps
 */

import { TextStyle } from 'react-native';

/**
 * Font Family System
 */
export const RuvoFontFamily = {
  // System fonts — safe fallback
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
  
  // If custom fonts are loaded, replace above with:
  // regular: 'Inter-Regular',
  // medium: 'Inter-Medium',
  // semiBold: 'Inter-SemiBold',
  // bold: 'Inter-Bold',
} as const;

/**
 * Font Weight System
 */
export const RuvoFontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semiBold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extraBold: '800' as TextStyle['fontWeight'],
} as const;

/**
 * Font Size System
 * Mobile-optimized scale
 */
export const RuvoFontSize = {
  /** 10px — micro labels, tags */
  xs: 10,
  /** 11px — small captions, hints */
  sm: 11,
  /** 12px — body small, metadata */
  base: 12,
  /** 13px — body text, descriptions */
  md: 13,
  /** 14px — default body, labels */
  lg: 14,
  /** 15px — emphasized body */
  xl: 15,
  /** 16px — large body, small headings */
  '2xl': 16,
  /** 18px — section headings */
  '3xl': 18,
  /** 20px — card headings */
  '4xl': 20,
  /** 22px — page headings */
  '5xl': 22,
  /** 24px — screen titles */
  '6xl': 24,
  /** 28px — prominent headings */
  '7xl': 28,
  /** 32px — hero headings */
  '8xl': 32,
  /** 36px — large hero headings */
  '9xl': 36,
} as const;

/**
 * Line Height System
 */
export const RuvoLineHeight = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.6,
} as const;

/**
 * Letter Spacing System
 */
export const RuvoLetterSpacing = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.25,
  wider: 0.5,
  widest: 1,
} as const;

/**
 * Typography Presets
 * 
 * Ready-to-use text styles for common use cases
 */
export const RuvoTypography = {
  // ═══════════════════════════════════════════════════════════════
  // HEADINGS
  // ═══════════════════════════════════════════════════════════════
  
  /** Hero heading — 32px bold */
  hero: {
    fontSize: RuvoFontSize['8xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['8xl'] * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.tight,
  } as TextStyle,

  /** H1 — 28px bold */
  h1: {
    fontSize: RuvoFontSize['7xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['7xl'] * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.tight,
  } as TextStyle,

  /** H2 — 24px bold */
  h2: {
    fontSize: RuvoFontSize['6xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['6xl'] * RuvoLineHeight.snug,
    letterSpacing: RuvoLetterSpacing.tight,
  } as TextStyle,

  /** H3 — 20px bold */
  h3: {
    fontSize: RuvoFontSize['4xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['4xl'] * RuvoLineHeight.snug,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** H4 — 18px semibold */
  h4: {
    fontSize: RuvoFontSize['3xl'],
    fontWeight: RuvoFontWeight.semiBold,
    lineHeight: RuvoFontSize['3xl'] * RuvoLineHeight.snug,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** H5 — 16px semibold */
  h5: {
    fontSize: RuvoFontSize['2xl'],
    fontWeight: RuvoFontWeight.semiBold,
    lineHeight: RuvoFontSize['2xl'] * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** H6 — 14px semibold */
  h6: {
    fontSize: RuvoFontSize.lg,
    fontWeight: RuvoFontWeight.semiBold,
    lineHeight: RuvoFontSize.lg * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  // ═══════════════════════════════════════════════════════════════
  // BODY TEXT
  // ═══════════════════════════════════════════════════════════════
  
  /** Body large — 15px regular */
  bodyLarge: {
    fontSize: RuvoFontSize.xl,
    fontWeight: RuvoFontWeight.regular,
    lineHeight: RuvoFontSize.xl * RuvoLineHeight.relaxed,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Body default — 14px regular */
  body: {
    fontSize: RuvoFontSize.lg,
    fontWeight: RuvoFontWeight.regular,
    lineHeight: RuvoFontSize.lg * RuvoLineHeight.relaxed,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Body small — 13px regular */
  bodySmall: {
    fontSize: RuvoFontSize.md,
    fontWeight: RuvoFontWeight.regular,
    lineHeight: RuvoFontSize.md * RuvoLineHeight.relaxed,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Body medium — 14px medium weight */
  bodyMedium: {
    fontSize: RuvoFontSize.lg,
    fontWeight: RuvoFontWeight.medium,
    lineHeight: RuvoFontSize.lg * RuvoLineHeight.relaxed,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Body semibold — 14px semibold */
  bodySemiBold: {
    fontSize: RuvoFontSize.lg,
    fontWeight: RuvoFontWeight.semiBold,
    lineHeight: RuvoFontSize.lg * RuvoLineHeight.relaxed,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  // ═══════════════════════════════════════════════════════════════
  // LABELS & UI TEXT
  // ═══════════════════════════════════════════════════════════════
  
  /** Label large — 14px medium */
  labelLarge: {
    fontSize: RuvoFontSize.lg,
    fontWeight: RuvoFontWeight.medium,
    lineHeight: RuvoFontSize.lg * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Label default — 13px medium */
  label: {
    fontSize: RuvoFontSize.md,
    fontWeight: RuvoFontWeight.medium,
    lineHeight: RuvoFontSize.md * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Label small — 12px medium */
  labelSmall: {
    fontSize: RuvoFontSize.base,
    fontWeight: RuvoFontWeight.medium,
    lineHeight: RuvoFontSize.base * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  // ═══════════════════════════════════════════════════════════════
  // CAPTIONS & METADATA
  // ═══════════════════════════════════════════════════════════════
  
  /** Caption — 12px regular */
  caption: {
    fontSize: RuvoFontSize.base,
    fontWeight: RuvoFontWeight.regular,
    lineHeight: RuvoFontSize.base * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Caption medium — 12px medium */
  captionMedium: {
    fontSize: RuvoFontSize.base,
    fontWeight: RuvoFontWeight.medium,
    lineHeight: RuvoFontSize.base * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Caption small — 11px regular */
  captionSmall: {
    fontSize: RuvoFontSize.sm,
    fontWeight: RuvoFontWeight.regular,
    lineHeight: RuvoFontSize.sm * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Overline — 11px medium uppercase */
  overline: {
    fontSize: RuvoFontSize.sm,
    fontWeight: RuvoFontWeight.medium,
    lineHeight: RuvoFontSize.sm * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.widest,
    textTransform: 'uppercase',
  } as TextStyle,

  // ═══════════════════════════════════════════════════════════════
  // BUTTONS
  // ═══════════════════════════════════════════════════════════════
  
  /** Button large — 16px semibold */
  buttonLarge: {
    fontSize: RuvoFontSize['2xl'],
    fontWeight: RuvoFontWeight.semiBold,
    lineHeight: RuvoFontSize['2xl'] * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Button default — 14px semibold */
  button: {
    fontSize: RuvoFontSize.lg,
    fontWeight: RuvoFontWeight.semiBold,
    lineHeight: RuvoFontSize.lg * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Button small — 13px semibold */
  buttonSmall: {
    fontSize: RuvoFontSize.md,
    fontWeight: RuvoFontWeight.semiBold,
    lineHeight: RuvoFontSize.md * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  // ═══════════════════════════════════════════════════════════════
  // NUMBERS & METRICS
  // ═══════════════════════════════════════════════════════════════
  
  /** Large number — 32px bold */
  numberLarge: {
    fontSize: RuvoFontSize['8xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['8xl'] * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.tight,
  } as TextStyle,

  /** Medium number — 24px bold */
  numberMedium: {
    fontSize: RuvoFontSize['6xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['6xl'] * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.tight,
  } as TextStyle,

  /** Small number — 18px bold */
  numberSmall: {
    fontSize: RuvoFontSize['3xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['3xl'] * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  // ═══════════════════════════════════════════════════════════════
  // SPECIAL
  // ═══════════════════════════════════════════════════════════════
  
  /** Price large — 20px bold */
  priceLarge: {
    fontSize: RuvoFontSize['4xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['4xl'] * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Price default — 16px bold */
  price: {
    fontSize: RuvoFontSize['2xl'],
    fontWeight: RuvoFontWeight.bold,
    lineHeight: RuvoFontSize['2xl'] * RuvoLineHeight.tight,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,

  /** Link — 14px medium */
  link: {
    fontSize: RuvoFontSize.lg,
    fontWeight: RuvoFontWeight.medium,
    lineHeight: RuvoFontSize.lg * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
    textDecorationLine: 'underline',
  } as TextStyle,

  /** Input — 15px regular */
  input: {
    fontSize: RuvoFontSize.xl,
    fontWeight: RuvoFontWeight.regular,
    lineHeight: RuvoFontSize.xl * RuvoLineHeight.normal,
    letterSpacing: RuvoLetterSpacing.normal,
  } as TextStyle,
} as const;

export type RuvoTypographyPreset = keyof typeof RuvoTypography;
