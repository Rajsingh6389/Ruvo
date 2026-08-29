/**
 * RuVo Design System — Shadow Tokens
 * 
 * Soft, premium shadows for depth and elevation
 * Optimized for both iOS and Android
 */

import { ViewStyle } from 'react-native';
import { Platform } from 'react-native';

/**
 * Shadow elevation levels
 */
export const RuvoShadows = {
  /** No shadow */
  none: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    android: {
      elevation: 0,
    },
  }) as ViewStyle,

  /** xs — 1px soft shadow */
  xs: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
  }) as ViewStyle,

  /** sm — 2px soft shadow */
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
  }) as ViewStyle,

  /** md — 4px default shadow */
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,

  /** lg — 8px elevated shadow */
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }) as ViewStyle,

  /** xl — 12px strong shadow */
  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 12,
    },
  }) as ViewStyle,

  /** 2xl — 16px dramatic shadow */
  '2xl': Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
    },
    android: {
      elevation: 16,
    },
  }) as ViewStyle,

  /** 3xl — 24px maximum shadow */
  '3xl': Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
    },
    android: {
      elevation: 24,
    },
  }) as ViewStyle,
} as const;

/**
 * Colored Shadows
 * Special shadows with color tints
 */
export const RuvoColoredShadows = {
  /** Yellow shadow for primary elements */
  yellow: Platform.select({
    ios: {
      shadowColor: '#F5B700',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,

  /** Green shadow for success elements */
  green: Platform.select({
    ios: {
      shadowColor: '#16A34A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,

  /** Red shadow for error/danger elements */
  red: Platform.select({
    ios: {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,

  /** Blue shadow for info elements */
  blue: Platform.select({
    ios: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,
} as const;

/**
 * Semantic Shadow Tokens
 * Pre-defined shadows for specific UI elements
 */
export const RuvoSemanticShadows = {
  /** Button shadow */
  button: RuvoShadows.sm,
  /** Button pressed shadow */
  buttonPressed: RuvoShadows.xs,
  /** Button floating shadow */
  buttonFloating: RuvoShadows.lg,
  
  /** Card shadow */
  card: RuvoShadows.md,
  /** Card elevated shadow */
  cardElevated: RuvoShadows.lg,
  /** Card hero shadow */
  cardHero: RuvoShadows.xl,
  
  /** Modal shadow */
  modal: RuvoShadows['2xl'],
  /** Bottom sheet shadow */
  bottomSheet: RuvoShadows.xl,
  /** Dialog shadow */
  dialog: RuvoShadows.xl,
  
  /** Floating navigation shadow */
  floatingNav: RuvoShadows.lg,
  /** Floating action button shadow */
  fab: RuvoShadows.xl,
  
  /** Dropdown shadow */
  dropdown: RuvoShadows.lg,
  /** Tooltip shadow */
  tooltip: RuvoShadows.md,
  /** Toast shadow */
  toast: RuvoShadows.lg,
  
  /** Image shadow */
  image: RuvoShadows.sm,
  /** Avatar shadow */
  avatar: RuvoShadows.sm,
  
  /** Header shadow */
  header: RuvoShadows.xs,
  /** Tab bar shadow */
  tabBar: RuvoShadows.sm,
} as const;

/**
 * Inner Shadow (glow effect)
 * Simulated inner shadows using border
 */
export const RuvoInnerShadows = {
  /** Light inner glow */
  light: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  } as ViewStyle,
  
  /** Medium inner glow */
  medium: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  } as ViewStyle,
  
  /** Strong inner glow */
  strong: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  } as ViewStyle,
} as const;

export type RuvoShadowToken = keyof typeof RuvoShadows;
export type RuvoSemanticShadowToken = keyof typeof RuvoSemanticShadows;
