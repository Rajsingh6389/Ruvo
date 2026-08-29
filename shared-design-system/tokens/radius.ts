/**
 * RuVo Design System — Border Radius Tokens
 * 
 * Consistent rounded corners across all RuVo apps
 */

/**
 * Border Radius Scale
 */
export const RuvoRadius = {
  /** 0px — no rounding */
  none: 0,
  /** 4px — minimal rounding */
  xs: 4,
  /** 6px — small rounding */
  sm: 6,
  /** 8px — small-medium rounding */
  md: 8,
  /** 10px — medium rounding */
  lg: 10,
  /** 12px — default rounding */
  xl: 12,
  /** 14px — large rounding */
  '2xl': 14,
  /** 16px — extra large rounding */
  '3xl': 16,
  /** 18px — 2x extra large */
  '4xl': 18,
  /** 20px — 3x extra large */
  '5xl': 20,
  /** 24px — 4x extra large */
  '6xl': 24,
  /** 28px — 5x extra large */
  '7xl': 28,
  /** 32px — 6x extra large */
  '8xl': 32,
  /** 999px — full/pill shape */
  full: 999,
} as const;

/**
 * Semantic Radius Tokens
 * 
 * Pre-defined radius values for common UI elements
 */
export const RuvoSemanticRadius = {
  // ═══════════════════════════════════════════════════════════════
  // BUTTONS
  // ═══════════════════════════════════════════════════════════════
  
  /** Default button radius */
  button: RuvoRadius.xl,
  /** Large button radius */
  buttonLarge: RuvoRadius['2xl'],
  /** Small button radius */
  buttonSmall: RuvoRadius.lg,
  /** Pill button radius */
  buttonPill: RuvoRadius.full,
  
  // ═══════════════════════════════════════════════════════════════
  // INPUTS
  // ═══════════════════════════════════════════════════════════════
  
  /** Input field radius */
  input: RuvoRadius.xl,
  /** Search input radius */
  inputSearch: RuvoRadius.full,
  /** Textarea radius */
  textarea: RuvoRadius.xl,
  
  // ═══════════════════════════════════════════════════════════════
  // CARDS & CONTAINERS
  // ═══════════════════════════════════════════════════════════════
  
  /** Small card radius */
  cardSmall: RuvoRadius['2xl'],
  /** Default card radius */
  card: RuvoRadius['3xl'],
  /** Large card radius */
  cardLarge: RuvoRadius['4xl'],
  /** Hero card radius */
  cardHero: RuvoRadius['6xl'],
  
  // ═══════════════════════════════════════════════════════════════
  // IMAGES & AVATARS
  // ═══════════════════════════════════════════════════════════════
  
  /** Image thumbnail radius */
  imageThumbnail: RuvoRadius.lg,
  /** Image default radius */
  image: RuvoRadius.xl,
  /** Image large radius */
  imageLarge: RuvoRadius['3xl'],
  /** Avatar radius */
  avatar: RuvoRadius.full,
  /** Square avatar radius */
  avatarSquare: RuvoRadius.xl,
  
  // ═══════════════════════════════════════════════════════════════
  // BADGES & CHIPS
  // ═══════════════════════════════════════════════════════════════
  
  /** Badge radius */
  badge: RuvoRadius.md,
  /** Chip radius */
  chip: RuvoRadius.full,
  /** Tag radius */
  tag: RuvoRadius.sm,
  
  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════
  
  /** Bottom navigation radius */
  bottomNav: RuvoRadius['6xl'],
  /** Tab radius */
  tab: RuvoRadius.xl,
  /** Tab bar radius */
  tabBar: RuvoRadius['5xl'],
  
  // ═══════════════════════════════════════════════════════════════
  // MODALS & SHEETS
  // ═══════════════════════════════════════════════════════════════
  
  /** Modal radius */
  modal: RuvoRadius['4xl'],
  /** Bottom sheet radius */
  bottomSheet: RuvoRadius['6xl'],
  /** Dialog radius */
  dialog: RuvoRadius['4xl'],
  
  // ═══════════════════════════════════════════════════════════════
  // MISC COMPONENTS
  // ═══════════════════════════════════════════════════════════════
  
  /** Tooltip radius */
  tooltip: RuvoRadius.lg,
  /** Toast notification radius */
  toast: RuvoRadius.xl,
  /** Progress bar radius */
  progress: RuvoRadius.full,
  /** Divider radius */
  divider: RuvoRadius.full,
  /** Skeleton radius */
  skeleton: RuvoRadius.lg,
} as const;

/**
 * Component-specific radius combinations
 */
export const RuvoRadiusCombinations = {
  /** Card with rounded top only */
  cardTop: {
    borderTopLeftRadius: RuvoRadius['3xl'],
    borderTopRightRadius: RuvoRadius['3xl'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  
  /** Card with rounded bottom only */
  cardBottom: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: RuvoRadius['3xl'],
    borderBottomRightRadius: RuvoRadius['3xl'],
  },
  
  /** Bottom sheet top corners */
  bottomSheetTop: {
    borderTopLeftRadius: RuvoRadius['6xl'],
    borderTopRightRadius: RuvoRadius['6xl'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  
  /** Modal with dramatic top radius */
  modalTop: {
    borderTopLeftRadius: RuvoRadius['7xl'],
    borderTopRightRadius: RuvoRadius['7xl'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
} as const;

export type RuvoRadiusToken = keyof typeof RuvoRadius;
export type RuvoSemanticRadiusToken = keyof typeof RuvoSemanticRadius;
