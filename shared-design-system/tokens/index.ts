/**
 * RuVo Design System — Token Exports
 * 
 * Central export file for all design tokens
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './radius';
export * from './shadows';
export * from './motion';

/**
 * Complete design token bundle
 */
import { RuvoColors, RuvoQuickColors } from './colors';
import { RuvoTypography, RuvoFontSize, RuvoFontWeight, RuvoLineHeight } from './typography';
import { RuvoSpacing, RuvoSemanticSpacing } from './spacing';
import { RuvoRadius, RuvoSemanticRadius } from './radius';
import { RuvoShadows, RuvoSemanticShadows } from './shadows';
import { RuvoDuration, RuvoEasing, RuvoAnimations } from './motion';

export const RuvoDesignSystem = {
  colors: RuvoColors,
  quickColors: RuvoQuickColors,
  typography: RuvoTypography,
  fontSize: RuvoFontSize,
  fontWeight: RuvoFontWeight,
  lineHeight: RuvoLineHeight,
  spacing: RuvoSpacing,
  semanticSpacing: RuvoSemanticSpacing,
  radius: RuvoRadius,
  semanticRadius: RuvoSemanticRadius,
  shadows: RuvoShadows,
  semanticShadows: RuvoSemanticShadows,
  duration: RuvoDuration,
  easing: RuvoEasing,
  animations: RuvoAnimations,
} as const;
