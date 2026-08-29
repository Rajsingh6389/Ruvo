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
const fontFamily = Platform.OS === 'ios' ? 'System' : 'Roboto';

export const TYPOGRAPHY = {
  /** The largest text in the app — splash, order-success, a single hero number. */
  display: {
    fontFamily,
    fontSize: 34,
    fontWeight: '800' as const,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  headingXL: {
    fontFamily,
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  headingL: {
    fontFamily,
    fontSize: 23,
    fontWeight: '700' as const,
    lineHeight: 29,
    letterSpacing: -0.4,
  },
  headingM: {
    fontFamily,
    fontSize: 19,
    fontWeight: '700' as const,
    lineHeight: 25,
    letterSpacing: -0.25,
  },
  headingS: {
    fontFamily,
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  /** Body copy carrying emphasis — a row's primary label, a selected option. */
  bodyStrong: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 17,
  },
  /** Secondary metadata that still needs to be findable — distance, ETA, counts. */
  captionStrong: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
  label: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontFamily,
    fontSize: 15.5,
    fontWeight: '700' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  /** Small eyebrow above a section title, or a status word. */
  overline: {
    fontFamily,
    fontSize: 10.5,
    fontWeight: '800' as const,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
  },
  /** Section titles ("Nearby Shops", "Price Details"). */
  sectionTitle: {
    fontFamily,
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  /** The headline price on a product detail or cart total. */
  priceLarge: {
    fontFamily,
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 29,
    letterSpacing: -0.6,
  },
  /** The selling price inside a card. */
  price: {
    fontFamily,
    fontSize: 16,
    fontWeight: '800' as const,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  /** The struck-through MRP shown beside a discounted price. */
  priceStrike: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    textDecorationLine: 'line-through' as const,
  },
  /**
   * Tabular figures for anything that changes in place — quantity steppers,
   * running totals — so the row does not shift width as digits change.
   */
  numeric: {
    fontFamily,
    fontSize: 14,
    fontWeight: '700' as const,
    lineHeight: 18,
    // Not `as const` on the array: RN types `fontVariant` as a mutable
    // `FontVariant[]`, and a readonly tuple is not assignable to it.
    fontVariant: ['tabular-nums' as const],
  },
  /** Tabular figures at display size — an order total, an earnings figure. */
  numericLarge: {
    fontFamily,
    fontSize: 20,
    fontWeight: '800' as const,
    lineHeight: 25,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums' as const],
  },
  /** The label under a bottom-navigation icon. */
  navLabel: {
    fontFamily,
    fontSize: 10.5,
    fontWeight: '700' as const,
    lineHeight: 13,
    letterSpacing: 0.1,
  },
};
