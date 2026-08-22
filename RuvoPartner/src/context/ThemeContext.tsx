import React, { createContext, useContext } from 'react';

export const theme = {
  colors: {
    primary: '#173F35', // Shared RuVo forest; lavender is reserved for AI assistance.
    primaryLight: '#6FA58C',
    accent: '#C7F36B',
    ai: '#B8A4FF',
    background: '#F7F8F3',
    card: '#FFFFFF',
    textPrimary: '#17201D',
    textSecondary: '#58645E',
    border: '#E6EBE6',
    error: '#E76F51',
    warning: '#F4B942',
    success: '#5BAE7A',
  }
};

const ThemeContext = createContext(theme);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
