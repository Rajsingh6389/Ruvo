/**
 * RuVo Design System — Color Tokens
 * 
 * ONE unified color system for:
 * - RuVo Mobile (Customer App)
 * - RuVo Shop (Merchant App)
 * - RuVo Partner (Delivery App)
 * 
 * All apps share the same color palette.
 */

export const RuvoColors = {
  // ═══════════════════════════════════════════════════════════════
  // BRAND COLORS
  // ═══════════════════════════════════════════════════════════════
  
  /** Primary brand color — RuVo Yellow */
  yellow: {
    50: '#FFFBF0',
    100: '#FFF8E6',
    200: '#FFECB3',
    300: '#FFE080',
    400: '#FFD54F',
    500: '#F5B700', // Primary
    600: '#D99B00',
    700: '#C79200',
    800: '#9A7200',
    900: '#6B5000',
  },

  /** Secondary — Deep Navy for premium contrast */
  navy: {
    50: '#F0F1F5',
    100: '#E1E4EB',
    200: '#C3C9D7',
    300: '#9BA4BA',
    400: '#6B7794',
    500: '#1C1635', // Primary Navy
    600: '#15102A',
    700: '#0F0B1F',
    800: '#0A0715',
    900: '#05040A',
  },

  /** Success / Verification / Active — Soft Green */
  green: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#16A34A', // Primary Green
    600: '#15803D',
    700: '#166534',
    800: '#14532D',
    900: '#052E16',
  },

  // ═══════════════════════════════════════════════════════════════
  // SEMANTIC COLORS
  // ═══════════════════════════════════════════════════════════════
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // ═══════════════════════════════════════════════════════════════
  // NEUTRAL COLORS — Warm Gray Scale
  // ═══════════════════════════════════════════════════════════════
  
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAF9',
    100: '#F5F5F4',
    150: '#F0F0EF',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
    950: '#0C0A09',
  },

  // ═══════════════════════════════════════════════════════════════
  // BACKGROUND SYSTEM — Warm Ivory Palette
  // ═══════════════════════════════════════════════════════════════
  
  background: {
    /** Main app background — warm ivory */
    primary: '#F8F9FB',
    /** Slightly darker ivory for contrast sections */
    secondary: '#F1F3F5',
    /** Lightest ivory for elevated surfaces */
    elevated: '#FDFEFE',
    /** Off-white with warm undertone */
    soft: '#FAFBFC',
  },

  // ═══════════════════════════════════════════════════════════════
  // SURFACE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  
  surface: {
    /** Pure white cards */
    white: '#FFFFFF',
    /** Very subtle warm surface */
    ivory: '#FFFFFE',
    /** Slightly elevated surface */
    elevated: '#FFFFFF',
    /** Sunken/recessed surfaces */
    sunken: '#F8F9FA',
    /** Disabled surfaces */
    disabled: '#F3F4F6',
  },

  // ═══════════════════════════════════════════════════════════════
  // BORDER & DIVIDER SYSTEM
  // ═══════════════════════════════════════════════════════════════
  
  border: {
    /** Light borders */
    light: '#F0F0F0',
    /** Default borders */
    default: '#E5E7EB',
    /** Medium contrast borders */
    medium: '#D1D5DB',
    /** Strong borders */
    strong: '#9CA3AF',
    /** Primary colored border */
    primary: '#F5B700',
    /** Success colored border */
    success: '#16A34A',
    /** Error colored border */
    error: '#EF4444',
  },

  // ═══════════════════════════════════════════════════════════════
  // TEXT SYSTEM
  // ═══════════════════════════════════════════════════════════════
  
  text: {
    /** Primary text — near black */
    primary: '#111827',
    /** Secondary text — gray */
    secondary: '#6B7280',
    /** Tertiary / hint text */
    tertiary: '#9CA3AF',
    /** Placeholder text */
    placeholder: '#C7CACD',
    /** Disabled text */
    disabled: '#D1D5DB',
    /** Text on primary yellow */
    onPrimary: '#1C1917',
    /** Text on dark surfaces */
    onDark: '#FAFAFA',
    /** Text on success */
    onSuccess: '#FFFFFF',
    /** Text on error */
    onError: '#FFFFFF',
  },

  // ═══════════════════════════════════════════════════════════════
  // OVERLAY & SCRIM SYSTEM
  // ═══════════════════════════════════════════════════════════════
  
  overlay: {
    /** Light scrim */
    light: 'rgba(0, 0, 0, 0.3)',
    /** Medium scrim */
    medium: 'rgba(0, 0, 0, 0.5)',
    /** Heavy scrim */
    heavy: 'rgba(0, 0, 0, 0.7)',
    /** White scrim */
    white: 'rgba(255, 255, 255, 0.85)',
  },

  // ═══════════════════════════════════════════════════════════════
  // GLASS & TRANSLUCENCY
  // ═══════════════════════════════════════════════════════════════
  
  glass: {
    /** Light glass surface */
    light: 'rgba(255, 255, 255, 0.7)',
    /** Medium glass surface */
    medium: 'rgba(255, 255, 255, 0.85)',
    /** Heavy glass surface */
    heavy: 'rgba(255, 255, 255, 0.92)',
    /** Glass border */
    border: 'rgba(255, 255, 255, 0.3)',
  },

  // ═══════════════════════════════════════════════════════════════
  // APP-SPECIFIC ACCENT COLORS
  // ═══════════════════════════════════════════════════════════════
  
  /** RuVo Shop accent — commerce purple-blue */
  shop: {
    primary: '#6366F1',
    light: '#A5B4FC',
    soft: '#EEF2FF',
  },

  /** RuVo Partner accent — delivery blue */
  partner: {
    primary: '#0EA5E9',
    light: '#7DD3FC',
    soft: '#E0F2FE',
  },

  // ═══════════════════════════════════════════════════════════════
  // STATUS COLORS — Soft Pastels
  // ═══════════════════════════════════════════════════════════════
  
  status: {
    pending: {
      bg: '#FFF3E0',
      text: '#E65100',
      border: '#FFE0B2',
    },
    confirmed: {
      bg: '#E8F5E9',
      text: '#2E7D32',
      border: '#C8E6C9',
    },
    processing: {
      bg: '#E3F2FD',
      text: '#1565C0',
      border: '#BBDEFB',
    },
    shipped: {
      bg: '#F3E5F5',
      text: '#6A1B9A',
      border: '#E1BEE7',
    },
    delivered: {
      bg: '#E8F5E9',
      text: '#2E7D32',
      border: '#A5D6A7',
    },
    cancelled: {
      bg: '#FFEBEE',
      text: '#C62828',
      border: '#FFCDD2',
    },
  },
} as const;

/**
 * Quick access to most commonly used colors
 */
export const RuvoQuickColors = {
  // Brand
  primary: RuvoColors.yellow[500],
  primaryLight: RuvoColors.yellow[100],
  primarySoft: RuvoColors.yellow[50],
  
  secondary: RuvoColors.navy[500],
  
  success: RuvoColors.green[500],
  successLight: RuvoColors.green[100],
  successSoft: RuvoColors.green[50],
  
  error: RuvoColors.error[500],
  errorLight: RuvoColors.error[100],
  errorSoft: RuvoColors.error[50],
  
  warning: RuvoColors.warning[500],
  warningLight: RuvoColors.warning[100],
  warningSoft: RuvoColors.warning[50],
  
  info: RuvoColors.info[500],
  infoLight: RuvoColors.info[100],
  infoSoft: RuvoColors.info[50],
  
  // Backgrounds
  bgPrimary: RuvoColors.background.primary,
  bgSecondary: RuvoColors.background.secondary,
  bgElevated: RuvoColors.background.elevated,
  
  // Surfaces
  surfaceWhite: RuvoColors.surface.white,
  surfaceElevated: RuvoColors.surface.elevated,
  
  // Text
  textPrimary: RuvoColors.text.primary,
  textSecondary: RuvoColors.text.secondary,
  textTertiary: RuvoColors.text.tertiary,
  textPlaceholder: RuvoColors.text.placeholder,
  
  // Borders
  border: RuvoColors.border.default,
  borderLight: RuvoColors.border.light,
  borderStrong: RuvoColors.border.strong,
} as const;

export type RuvoColorToken = keyof typeof RuvoQuickColors;
