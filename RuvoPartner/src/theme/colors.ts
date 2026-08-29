/**
 * RuVo Unified Design System Colors
 * Modern, vibrant palette for delivery partners and shop owners
 * No dark green — replaced with dynamic blues and purples
 */

export const Colors = {
  // ─── Brand Colors (Vibrant & Modern) ──────────────────────────────────────
  ai: '#7C3AED',           // Purple accent
  primary: '#3B82F6',      // Vibrant Blue (was dark green)
  primaryLight: '#60A5FA',
  primarySoft: '#EFF6FF',
  secondary: '#8B5CF6',    // Purple
  accent: '#EC4899',       // Pink

  onPrimary: '#FFFFFF',
  onAccent: '#FFFFFF',

  // ─── Semantic Colors ──────────────────────────────────────────────────────
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#0EA5E9',

  // ─── Light Theme — Clean, Modern ──────────────────────────────────────────
  light: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    card: '#FFFFFF',

    border: '#E5E7EB',
    divider: '#F3F4F6',

    placeholder: '#9CA3AF',
    disabled: '#D1D5DB',
    disabledText: '#9CA3AF',

    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textHint: '#9CA3AF',

    overlay: 'rgba(17,24,39,0.5)',

    surfaceElevated: '#FFFFFF',
    surfaceSunken: '#F3F4F6',
    hairline: '#E5E7EB',

    scrim: 'rgba(17,24,39,0.42)',
    scrimStrong: 'rgba(17,24,39,0.68)',
    translucent: 'rgba(255,255,255,0.84)',
    translucentBorder: 'rgba(255,255,255,0.48)',

    primarySoftBg: '#EFF6FF',
    accentSoft: '#FCE7F3',
    successSoft: '#D1FAE5',
    warningSoft: '#FEF3C7',
    errorSoft: '#FEE2E2',
    infoSoft: '#CFFAFE',
  },

  // ─── Dark Theme — Deep, Sophisticated ─────────────────────────────────────
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',

    border: '#334155',
    divider: '#0F172A',

    placeholder: '#64748B',
    disabled: '#475569',
    disabledText: '#64748B',

    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textHint: '#94A3B8',

    overlay: 'rgba(0,0,0,0.85)',

    surfaceElevated: '#334155',
    surfaceSunken: '#0F172A',
    hairline: '#1E293B',

    scrim: 'rgba(0,0,0,0.55)',
    scrimStrong: 'rgba(0,0,0,0.78)',
    translucent: 'rgba(30,41,59,0.86)',
    translucentBorder: 'rgba(248,250,252,0.14)',

    primarySoftBg: '#1E3A8A',
    accentSoft: '#500724',
    successSoft: '#064E3B',
    warningSoft: '#33280B',
    errorSoft: '#7F1D1D',
    infoSoft: '#082F49',
  },
};
