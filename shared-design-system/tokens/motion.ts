/**
 * RuVo Design System — Motion & Animation Tokens
 * 
 * Consistent animation timings and easings across all RuVo apps
 */

/**
 * Animation Duration Tokens (in milliseconds)
 */
export const RuvoDuration = {
  /** 100ms — instant */
  instant: 100,
  /** 150ms — faster */
  faster: 150,
  /** 200ms — fast */
  fast: 200,
  /** 250ms — normal */
  normal: 250,
  /** 300ms — moderate */
  moderate: 300,
  /** 400ms — slow */
  slow: 400,
  /** 500ms — slower */
  slower: 500,
  /** 700ms — slowest */
  slowest: 700,
} as const;

/**
 * Easing Functions
 * Standard cubic-bezier curves
 */
export const RuvoEasing = {
  /** Linear — no easing */
  linear: 'linear',
  
  /** Ease — default easing */
  ease: 'ease',
  /** Ease In — starts slow */
  easeIn: 'ease-in',
  /** Ease Out — ends slow */
  easeOut: 'ease-out',
  /** Ease In Out — starts and ends slow */
  easeInOut: 'ease-in-out',
  
  /** Standard — Material Design standard */
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  /** Decelerate — Material Design decelerate */
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  /** Accelerate — Material Design accelerate */
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  
  /** Spring — bouncy spring effect */
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  /** Sharp — sharp curve */
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  /** Emphasized — emphasized motion */
  emphasized: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
} as const;

/**
 * Spring Animation Configs
 * For React Native Animated.spring()
 */
export const RuvoSpringConfig = {
  /** Gentle spring */
  gentle: {
    tension: 120,
    friction: 14,
    useNativeDriver: true,
  },
  
  /** Default spring */
  default: {
    tension: 180,
    friction: 12,
    useNativeDriver: true,
  },
  
  /** Snappy spring */
  snappy: {
    tension: 250,
    friction: 10,
    useNativeDriver: true,
  },
  
  /** Bouncy spring */
  bouncy: {
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  },
  
  /** Stiff spring */
  stiff: {
    tension: 300,
    friction: 15,
    useNativeDriver: true,
  },
} as const;

/**
 * Timing Animation Configs
 * For React Native Animated.timing()
 */
export const RuvoTimingConfig = {
  /** Fast fade */
  fastFade: {
    duration: RuvoDuration.fast,
    useNativeDriver: true,
  },
  
  /** Default timing */
  default: {
    duration: RuvoDuration.normal,
    useNativeDriver: true,
  },
  
  /** Slow timing */
  slow: {
    duration: RuvoDuration.slow,
    useNativeDriver: true,
  },
  
  /** Layout animation (no native driver) */
  layout: {
    duration: RuvoDuration.normal,
    useNativeDriver: false,
  },
} as const;

/**
 * Semantic Animation Presets
 */
export const RuvoAnimations = {
  // ═══════════════════════════════════════════════════════════════
  // SCREEN TRANSITIONS
  // ═══════════════════════════════════════════════════════════════
  
  /** Screen enter transition */
  screenEnter: {
    duration: RuvoDuration.moderate,
    easing: RuvoEasing.decelerate,
  },
  
  /** Screen exit transition */
  screenExit: {
    duration: RuvoDuration.fast,
    easing: RuvoEasing.accelerate,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // COMPONENT ANIMATIONS
  // ═══════════════════════════════════════════════════════════════
  
  /** Fade in */
  fadeIn: {
    duration: RuvoDuration.normal,
    easing: RuvoEasing.easeOut,
  },
  
  /** Fade out */
  fadeOut: {
    duration: RuvoDuration.fast,
    easing: RuvoEasing.easeIn,
  },
  
  /** Slide up */
  slideUp: {
    duration: RuvoDuration.moderate,
    easing: RuvoEasing.emphasized,
  },
  
  /** Slide down */
  slideDown: {
    duration: RuvoDuration.normal,
    easing: RuvoEasing.decelerate,
  },
  
  /** Scale in */
  scaleIn: {
    duration: RuvoDuration.normal,
    easing: RuvoEasing.spring,
  },
  
  /** Scale out */
  scaleOut: {
    duration: RuvoDuration.fast,
    easing: RuvoEasing.easeIn,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // INTERACTIVE ANIMATIONS
  // ═══════════════════════════════════════════════════════════════
  
  /** Button press */
  buttonPress: {
    duration: RuvoDuration.instant,
    scale: 0.97,
  },
  
  /** Button release */
  buttonRelease: {
    duration: RuvoDuration.faster,
    scale: 1,
  },
  
  /** Card press */
  cardPress: {
    duration: RuvoDuration.fast,
    scale: 0.98,
  },
  
  /** Ripple duration */
  ripple: {
    duration: RuvoDuration.moderate,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // MODAL & OVERLAY ANIMATIONS
  // ═══════════════════════════════════════════════════════════════
  
  /** Modal appear */
  modalAppear: {
    duration: RuvoDuration.moderate,
    easing: RuvoEasing.decelerate,
  },
  
  /** Modal dismiss */
  modalDismiss: {
    duration: RuvoDuration.normal,
    easing: RuvoEasing.accelerate,
  },
  
  /** Bottom sheet appear */
  bottomSheetAppear: {
    duration: RuvoDuration.moderate,
    springConfig: RuvoSpringConfig.default,
  },
  
  /** Bottom sheet dismiss */
  bottomSheetDismiss: {
    duration: RuvoDuration.fast,
    easing: RuvoEasing.accelerate,
  },
  
  /** Overlay fade in */
  overlayFadeIn: {
    duration: RuvoDuration.normal,
    easing: RuvoEasing.easeOut,
  },
  
  /** Overlay fade out */
  overlayFadeOut: {
    duration: RuvoDuration.fast,
    easing: RuvoEasing.easeIn,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION ANIMATIONS
  // ═══════════════════════════════════════════════════════════════
  
  /** Tab switch */
  tabSwitch: {
    duration: RuvoDuration.fast,
    easing: RuvoEasing.easeInOut,
  },
  
  /** Bottom nav icon active */
  bottomNavActive: {
    duration: RuvoDuration.normal,
    springConfig: RuvoSpringConfig.snappy,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // FEEDBACK ANIMATIONS
  // ═══════════════════════════════════════════════════════════════
  
  /** Toast appear */
  toastAppear: {
    duration: RuvoDuration.moderate,
    springConfig: RuvoSpringConfig.gentle,
  },
  
  /** Toast dismiss */
  toastDismiss: {
    duration: RuvoDuration.fast,
    easing: RuvoEasing.easeIn,
  },
  
  /** Success checkmark */
  successCheck: {
    duration: RuvoDuration.moderate,
    easing: RuvoEasing.spring,
  },
  
  /** Error shake */
  errorShake: {
    duration: RuvoDuration.moderate,
    iterations: 3,
  },
  
  /** Loading pulse */
  loadingPulse: {
    duration: RuvoDuration.slower,
    iterations: -1, // infinite
    easing: RuvoEasing.easeInOut,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // SKELETON & SHIMMER
  // ═══════════════════════════════════════════════════════════════
  
  /** Skeleton shimmer */
  skeletonShimmer: {
    duration: 1500,
    iterations: -1, // infinite
    easing: RuvoEasing.linear,
  },
  
  /** Content appear after loading */
  contentAppear: {
    duration: RuvoDuration.moderate,
    easing: RuvoEasing.decelerate,
  },
} as const;

/**
 * Gesture Response Configs
 */
export const RuvoGestureConfig = {
  /** Swipe threshold in pixels */
  swipeThreshold: 50,
  /** Swipe velocity threshold */
  swipeVelocityThreshold: 0.3,
  /** Pan response distance */
  panResponseDistance: 20,
  /** Long press duration */
  longPressDuration: 500,
} as const;

/**
 * Layout Animation Presets
 * For LayoutAnimation API
 */
export const RuvoLayoutAnimations = {
  /** Spring layout change */
  spring: {
    duration: RuvoDuration.moderate,
    create: {
      type: 'spring' as const,
      property: 'opacity' as const,
      springDamping: 0.7,
    },
    update: {
      type: 'spring' as const,
      springDamping: 0.7,
    },
    delete: {
      type: 'spring' as const,
      property: 'opacity' as const,
      springDamping: 0.7,
    },
  },
  
  /** Linear layout change */
  linear: {
    duration: RuvoDuration.normal,
    create: {
      type: 'linear' as const,
      property: 'opacity' as const,
    },
    update: {
      type: 'linear' as const,
    },
    delete: {
      type: 'linear' as const,
      property: 'opacity' as const,
    },
  },
  
  /** Ease in out layout change */
  easeInOut: {
    duration: RuvoDuration.normal,
    create: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
    update: {
      type: 'easeInEaseOut' as const,
    },
    delete: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
  },
} as const;

export type RuvoDurationToken = keyof typeof RuvoDuration;
export type RuvoEasingToken = keyof typeof RuvoEasing;
export type RuvoAnimationToken = keyof typeof RuvoAnimations;
