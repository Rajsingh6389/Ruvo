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
        // RuVo Brand Colors
        ruvo: {
          // Primary Gold Accent
          yellow: '#F4B400',
          'yellow-light': '#FFC72C',
          'yellow-dark': '#D99B00',
          'yellow-deep': '#8A6400',
          'yellow-soft': '#FFF2C2',
          
          // RuVo Cream Canvas Background & White Surface
          'bg': '#FAF7F0',
          'surface': '#FFFFFF',
          
          // RuVo Ink & Deep
          'ink': '#171A1F',
          'deep': '#202A3A',
          
          // Accent Green
          'accent': '#18A957',
          'accent-light': '#22C55E',
          'accent-soft': '#E8F8EE',
          
          // Gold
          'gold': '#F4B400',
          'gold-light': '#FFD874',
          'gold-dark': '#D99B00',
          'gold-soft': '#FFF2C2',
          // Border
          'border': '#EDEAD4',
          'gold-border': '#EDEAD4',
          
          // Feedback
          'error': '#D94A4A',
          'warning': '#E99A16',
          'success': '#18A957',
          'info': '#3478C8',
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
        '2xs': 2,
        'xs': 4,
        'sm': 8,
        'md': 12,
        'lg': 16,
        'xl': 24,
        '2xl': 32,
        '3xl': 40,
      },
      borderWidth: {
        DEFAULT: 0.5,
        0: '0px',
        1: '1px',
        2: '2px',
        4: '4px',
        8: '8px',
      },
      borderRadius: {
        'xs': 4,
        'sm': 8,
        'md': 12,
        'lg': 16,
        'xl': 20,
        '2xl': 24,
        '3xl': 32,
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
        'xs': ['11px', { lineHeight: '16px', letterSpacing: '-0.01em' }],
        'sm': ['13px', { lineHeight: '18px', letterSpacing: '-0.01em' }],
        'base': ['15px', { lineHeight: '22px', letterSpacing: '-0.01em' }],
        'lg': ['17px', { lineHeight: '24px', letterSpacing: '-0.02em' }],
        'xl': ['19px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
        '2xl': ['22px', { lineHeight: '32px', letterSpacing: '-0.03em' }],
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.03em' }],
        '4xl': ['34px', { lineHeight: '42px', letterSpacing: '-0.03em' }],
      },
      shadows: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.08)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.12)',
        '2xl': '0 25px 50px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
