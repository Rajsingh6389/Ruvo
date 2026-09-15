import { Platform } from 'react-native';

const getPoppinsFont = (weight: string) => {
  switch (weight) {
    case '400': return 'Poppins_400Regular';
    case '500': return 'Poppins_500Medium';
    case '600': return 'Poppins_600SemiBold';
    case '700': return 'Poppins_700Bold';
    case '800': return 'Poppins_800ExtraBold';
    default: return 'Poppins_400Regular';
  }
};

export const TYPOGRAPHY = {
  headingXL: {
    fontSize: 32,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 40,
  },
  headingL: {
    fontSize: 24,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 32,
  },
  headingM: {
    fontSize: 20,
    fontFamily: getPoppinsFont('600'),
    lineHeight: 28,
  },
  headingS: {
    fontSize: 16,
    fontFamily: getPoppinsFont('600'),
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontFamily: getPoppinsFont('400'),
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontFamily: getPoppinsFont('400'),
    lineHeight: 20,
  },
  bodyStrong: {
    fontSize: 14,
    fontFamily: getPoppinsFont('600'),
    lineHeight: 20,
  },
  overline: {
    fontSize: 10,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: 12,
    fontFamily: getPoppinsFont('400'),
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: getPoppinsFont('500'),
    lineHeight: 16,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: 16,
    fontFamily: getPoppinsFont('600'),
    lineHeight: 20,
  },
};
