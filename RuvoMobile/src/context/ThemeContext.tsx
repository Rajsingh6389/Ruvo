import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme } from '../theme/theme';
import { Colors, type BlurTint } from '../theme/colors';
import { SPACING } from '../theme/spacing';
import { TYPOGRAPHY } from '../theme/typography';
import { SHADOWS } from '../theme/shadows';
import { RADIUS } from '../theme/radius';
import { GRADIENTS } from '../theme/gradients';
import { MOTION } from '../theme/motion';

/** The resolved appearance actually being painted. */
type Theme = 'light' | 'dark';

/**
 * The user's *preference*. `system` (the default) follows the OS appearance —
 * which is what a user who has set their phone to dark expects an app to do.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = '@ruvo_theme_mode';

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'system' || value === 'light' || value === 'dark';

type ThemeContextProps = {
  /** The resolved theme. Unchanged in meaning from before. */
  theme: Theme;
  /** Flips between light and dark. Unchanged: still a plain toggle. */
  toggleTheme: () => void;
  /** The stored preference, including `system`. */
  mode: ThemeMode;
  /** Set the preference explicitly. Persisted across launches. */
  setMode: (next: ThemeMode) => void;
  /** True until the stored preference has been read, to avoid a flash of light. */
  isThemeLoading: boolean;
  // React Nav colors
  navColors: typeof LightTheme.colors;
  // Full Design System Tokens
  colors: typeof Colors.light & {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    primaryDeep: string;
    primarySoft: string;
    secondary: string;
    accent: string;
    accentLight: string;
    gold: string;
    goldLight: string;
    goldDark: string;
    goldSoft: string;
    goldBorder: string;
    onPrimary: string;
    onAccent: string;
    ai: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    /** `expo-blur` tint matching the resolved theme. */
    blurTint: BlurTint;
  };
  spacing: typeof SPACING;
  typography: typeof TYPOGRAPHY;
  shadows: typeof SHADOWS;
  radius: typeof RADIUS;
  /** Gradient presets. See `theme/gradients.ts`. */
  gradients: typeof GRADIENTS;
  /** Durations, easings, spring presets and the list-stagger helper. */
  motion: typeof MOTION;
  /** The page-canvas gradient for the resolved theme. */
  canvasGradient: typeof GRADIENTS.canvasLight;
};

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Read the stored preference once. A failure here is not worth surfacing —
  // falling back to `system` is the same as a first launch.
  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (cancelled) return;
        if (isThemeMode(stored)) setModeState(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsThemeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const theme: Theme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  // Toggling from `system` picks the opposite of what is currently *shown*,
  // which is what the user means when they flip the switch they are looking at.
  const toggleTheme = useCallback(() => {
    setMode(theme === 'light' ? 'dark' : 'light');
  }, [setMode, theme]);

  const value = useMemo<ThemeContextProps>(() => {
    const navColors = theme === 'light' ? LightTheme.colors : DarkTheme.colors;
    const sysColors = theme === 'light' ? Colors.light : Colors.dark;

    return {
      theme,
      toggleTheme,
      mode,
      setMode,
      isThemeLoading,
      navColors,
      colors: {
        ...sysColors,
        primary: Colors.primary,
        primaryLight: Colors.primaryLight,
        primaryDark: Colors.primaryDark,
        primaryDeep: Colors.primaryDeep,
        primarySoft: Colors.primarySoft,
        secondary: Colors.secondary,
        accent: Colors.gold,
        accentLight: Colors.accentLight,
        gold: Colors.gold,
        goldLight: Colors.goldLight,
        goldDark: Colors.goldDark,
        goldSoft: Colors.goldSoft,
        goldBorder: Colors.goldBorder,
        onPrimary: Colors.onPrimary,
        onAccent: Colors.onAccent,
        ai: Colors.ai,
        error: Colors.error,
        warning: Colors.warning,
        success: Colors.success,
        info: Colors.info,
        blurTint: (theme === 'dark' ? 'dark' : 'light') as BlurTint,
      },
      spacing: SPACING,
      typography: TYPOGRAPHY,
      shadows: SHADOWS,
      radius: RADIUS,
      gradients: GRADIENTS,
      motion: MOTION,
      canvasGradient: theme === 'dark' ? GRADIENTS.canvasDark : GRADIENTS.canvasLight,
    };
  }, [theme, toggleTheme, mode, setMode, isThemeLoading]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
