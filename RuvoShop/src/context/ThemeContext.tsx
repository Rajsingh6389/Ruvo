import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LightTheme, DarkTheme } from '../theme/theme';
import { Colors } from '../theme/colors';
import { SPACING } from '../theme/spacing';
import { TYPOGRAPHY } from '../theme/typography';
import { SHADOWS } from '../theme/shadows';
import { RADIUS } from '../theme/radius';

type Theme = 'light' | 'dark';

type ThemeContextProps = {
  theme: Theme;
  toggleTheme: () => void;
  // React Nav colors
  navColors: typeof LightTheme.colors;
  // Full Design System Tokens
  colors: typeof Colors.light & { primary: string; primaryLight: string; primarySoft: string; secondary: string; accent: string; ai: string; onPrimary: string; onAccent: string; error: string; warning: string; success: string; info: string };
  spacing: typeof SPACING;
  typography: typeof TYPOGRAPHY;
  shadows: typeof SHADOWS;
  radius: typeof RADIUS;
};

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  
  const navColors = theme === 'light' ? LightTheme.colors : DarkTheme.colors;
  const sysColors = theme === 'light' ? Colors.light : Colors.dark;
  
  const colors = {
    ...sysColors,
    primary: Colors.primary,
    primaryLight: Colors.primaryLight,
    primarySoft: Colors.primarySoft,
    secondary: Colors.secondary,
    accent: Colors.accent,
    ai: Colors.ai,
    onPrimary: Colors.onPrimary,
    onAccent: Colors.onAccent,
    error: Colors.error,
    warning: Colors.warning,
    success: Colors.success,
    info: Colors.info,
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, navColors, colors, spacing: SPACING, typography: TYPOGRAPHY, shadows: SHADOWS, radius: RADIUS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

