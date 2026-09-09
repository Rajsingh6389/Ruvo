/**
 * RuVo Unified Design System Colors
 * Modern, vibrant palette for delivery partners and shop owners
 * No dark green — replaced with dynamic blues and purples
 */

export const Colors = {
  // ─── Brand Colors ─────────────────────────────────────────────────────────
  ai: '#B8A4FF',
  primary: '#F4B400',
  primaryLight: '#FFC72C',
  primaryDark: '#D99B00',
  primarySoft: '#FFF2C2',
  secondary: '#171A1F',
  deep: '#202A3A',
  accent: '#18A957',
  gold: '#F4B400',

  onPrimary: '#171A1F',
  onAccent: '#FFFFFF',

  // ─── Semantic Colors ──────────────────────────────────────────────────────
  error: '#D94A4A',
  warning: '#E99A16',
  success: '#18A957',
  info: '#3478C8',

  // ─── Light Theme — RuVo Cream & White Surface ─────────────────────────────
  light: {
    onPrimary: '#171A1F',
    background: '#FAF7F0',
    surface: '#FFFFFF',
    card: '#FFFFFF',

    border: '#E7E0D5',
    divider: '#F0EAE0',

    placeholder: '#77736B',
    disabled: '#EFEAE0',
    disabledText: '#A39D93',

    textPrimary: '#171717',
    textSecondary: '#77736B',
    textHint: '#A39D93',

    overlay: 'rgba(23,26,31,0.42)',

    surfaceElevated: '#FFFFFF',
    surfaceSunken: '#F5F1E8',
    hairline: '#E7E0D5',

    scrim: 'rgba(23,26,31,0.38)',
    scrimStrong: 'rgba(23,26,31,0.68)',
    translucent: 'rgba(255,255,255,0.86)',
    translucentBorder: 'rgba(255,255,255,0.72)',

    primarySoftBg: '#FFF2C2',
    accentSoft: '#E8F8EE',
    successSoft: '#E8F8EE',
    warningSoft: '#FEF5E7',
    errorSoft: '#FDECEC',
    infoSoft: '#EBF2FA',
  },

  // ─── Dark Theme — Deep, Sophisticated ─────────────────────────────────────
  dark: {
    onPrimary: '#FFFFFF',
    background: '#131110',
    surface: '#1D1A18',
    card: '#1D1A18',

    border: '#332E29',
    divider: '#282320',

    placeholder: '#7C736A',
    disabled: '#2C2724',
    disabledText: '#7C736A',

    textPrimary: '#F7F3EC',
    textSecondary: '#A9A199',
    textHint: '#7C736A',

    overlay: 'rgba(8,7,6,0.78)',

    surfaceElevated: '#242120',
    surfaceSunken: '#0D0C0B',
    hairline: '#332E29',

    scrim: 'rgba(8,7,6,0.5)',
    scrimStrong: 'rgba(8,7,6,0.76)',
    translucent: 'rgba(29,26,24,0.88)',
    translucentBorder: 'rgba(247,243,236,0.12)',

    primarySoftBg: '#332708',
    accentSoft: '#0F2E1C',
    successSoft: '#0F2E1C',
    warningSoft: '#3A2408',
    errorSoft: '#3A1414',
    infoSoft: '#152548',
  },
};
