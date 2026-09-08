/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.js',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ruvo: {
          // Yellow Accent
          yellow: '#F5B700',
          'yellow-light': '#FFC72C',
          'yellow-dark': '#D99B00',
          'yellow-deep': '#8A6400',
          'yellow-soft': '#FFF7E3',
          
          // Warm Ivory Background
          'bg': '#FBF8F2',
          'surface': '#FFFFFF',
          
          // Warm Ink
          'ink': '#231C10',
          
          // Accent Green
          'accent': '#16A34A',
          'accent-light': '#22C55E',
          'accent-soft': '#E6F6EC',
          
          // Gold
          'gold': '#E9A900',
          'gold-light': '#FFD874',
          'gold-dark': '#B07C00',
          'gold-soft': '#FFFAEC',
          'gold-border': '#F6E0A3',
          
          // Feedback
          'error': '#DC2626',
          'warning': '#D97706',
          'success': '#16A34A',
          'info': '#2563EB',
        },
        // Extended neutrals with warm tone
        warm: {
          50: '#FFFBF7',
          100: '#FFF7E3',
          200: '#FBF8F2',
          300: '#EDE6D9',
          400: '#E8DEC8',
          500: '#D4C8B8',
          600: '#B8AAA0',
          700: '#A79E92',
          800: '#8B8378',
          900: '#6F675F',
          950: '#4A4540',
        },
      },
      spacing: {
        '2xs': '2px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '40px',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['System', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        display: ['System', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0em',
        wide: '0.01em',
        wider: '0.02em',
        widest: '0.05em',
      },
      fontSize: {
        xs: ['11px', { lineHeight: '16px', letterSpacing: '-0.01em' }],
        sm: ['13px', { lineHeight: '18px', letterSpacing: '-0.01em' }],
        base: ['15px', { lineHeight: '22px', letterSpacing: '-0.01em' }],
        lg: ['17px', { lineHeight: '24px', letterSpacing: '-0.02em' }],
        xl: ['19px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
        '2xl': ['22px', { lineHeight: '32px', letterSpacing: '-0.03em' }],
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.03em' }],
        '4xl': ['34px', { lineHeight: '42px', letterSpacing: '-0.03em' }],
      },
      shadows: {
        xs: '0 1px 2px rgba(15, 23, 42, 0.05)',
        sm: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
        md: '0 4px 6px rgba(15, 23, 42, 0.08)',
        lg: '0 10px 15px rgba(15, 23, 42, 0.1)',
        xl: '0 20px 25px rgba(15, 23, 42, 0.12)',
        '2xl': '0 25px 50px rgba(15, 23, 42, 0.15)',
      },
    },
  },
  plugins: [],
};
