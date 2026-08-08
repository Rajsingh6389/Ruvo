import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { Colors } from './colors';

export const LightTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.textPrimary,
    border: Colors.light.border,
    notification: Colors.secondary,
  },
};

export const DarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: Colors.primary,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.textPrimary,
    border: Colors.dark.border,
    notification: Colors.secondary,
  },
};

