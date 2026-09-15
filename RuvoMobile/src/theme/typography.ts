import { Platform } from 'react-native';

/**
 * Type scale.
 *
 * Two things separate this from the previous scale, and both are what make text
 * read as "designed" rather than "default":
 *
 * - **Optical tracking.** Large text gets negative letter-spacing and small
 *   uppercase text gets positive. At 28px the default tracking looks loose; at
 *   11px uppercase it looks cramped. Correcting per size is most of the premium
 *   feel in typography.
 * - **Tighter leading on headings.** 1.2–1.25× on display sizes rather than the
 *   1.4× that suits body copy, so a two-line headline reads as one block.
 *
 * Every previous key is preserved so existing call sites keep working.
 */
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
  /** The largest text in the app — splash, order-success, a single hero number. */
  display: {
    fontSize: 34,
    fontFamily: getPoppinsFont('800'),
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  headingXL: {
    fontSize: 28,
    fontFamily: getPoppinsFont('800'),
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  headingL: {
    fontSize: 23,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 29,
    letterSpacing: -0.4,
  },
  headingM: {
    fontSize: 19,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 25,
    letterSpacing: -0.25,
  },
  headingS: {
    fontSize: 16,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  bodyLarge: {
    fontSize: 16,
    fontFamily: getPoppinsFont('400'),
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontFamily: getPoppinsFont('400'),
    lineHeight: 21,
  },
  /** Body copy carrying emphasis — a row's primary label, a selected option. */
  bodyStrong: {
    fontSize: 14,
    fontFamily: getPoppinsFont('600'),
    lineHeight: 21,
  },
  caption: {
    fontSize: 12,
    fontFamily: getPoppinsFont('400'),
    lineHeight: 17,
  },
  /** Secondary metadata that still needs to be findable — distance, ETA, counts. */
  captionStrong: {
    fontSize: 12,
    fontFamily: getPoppinsFont('600'),
    lineHeight: 17,
  },
  label: {
    fontSize: 12,
    fontFamily: getPoppinsFont('600'),
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: 15.5,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  /** Small eyebrow above a section title, or a status word. */
  overline: {
    fontSize: 10.5,
    fontFamily: getPoppinsFont('800'),
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
  },
  /** Section titles ("Nearby Shops", "Price Details"). */
  sectionTitle: {
    fontSize: 18,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  /** The headline price on a product detail or cart total. */
  priceLarge: {
    fontSize: 24,
    fontFamily: getPoppinsFont('800'),
    lineHeight: 29,
    letterSpacing: -0.6,
  },
  /** The selling price inside a card. */
  price: {
    fontSize: 16,
    fontFamily: getPoppinsFont('800'),
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  /** The struck-through MRP shown beside a discounted price. */
  priceStrike: {
    fontSize: 12,
    fontFamily: getPoppinsFont('500'),
    lineHeight: 16,
    textDecorationLine: 'line-through' as const,
  },
  /**
   * Tabular figures for anything that changes in place — quantity steppers,
   * running totals — so the row does not shift width as digits change.
   */
  numeric: {
    fontSize: 14,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 18,
    // Not `as const` on the array: RN types `fontVariant` as a mutable
    // `FontVariant[]`, and a readonly tuple is not assignable to it.
    fontVariant: ['tabular-nums' as const],
  },
  /** Tabular figures at display size — an order total, an earnings figure. */
  numericLarge: {
    fontSize: 20,
    fontFamily: getPoppinsFont('800'),
    lineHeight: 25,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums' as const],
  },
  /** The label under a bottom-navigation icon. */
  navLabel: {
    fontSize: 10.5,
    fontFamily: getPoppinsFont('700'),
    lineHeight: 13,
    letterSpacing: 0.1,
  },
};
