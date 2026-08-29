import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PriceTagProps {
  /** What the customer pays. */
  sellingPrice?: number | null;
  /** The shop's listed price. Only rendered when it is genuinely higher. */
  actualPrice?: number | null;
  /** Backend-supplied percentage. Derived from the two prices when absent. */
  discount?: number | null;
  size?: 'sm' | 'md' | 'lg';
  /** Lays price and MRP on separate lines — for narrow cards on 320px screens. */
  stacked?: boolean;
  showDiscountBadge?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** ₹1,299 — Indian digit grouping, no decimals for whole rupees. */
export const formatRupees = (amount: number): string =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

/**
 * Resolves the discount percentage the same way every screen already did
 * individually: trust the backend's `discount` when it sends one, otherwise
 * derive it from MRP vs selling price. Returns null when there is no real
 * saving, so nothing invents a "0% OFF" badge.
 */
export const resolveDiscount = (
  sellingPrice?: number | null,
  actualPrice?: number | null,
  discount?: number | null,
): number | null => {
  if (discount != null && discount > 0) return Math.round(discount);

  if (
    actualPrice != null &&
    sellingPrice != null &&
    actualPrice > sellingPrice &&
    actualPrice > 0
  ) {
    return Math.round(((actualPrice - sellingPrice) / actualPrice) * 100);
  }

  return null;
};

/**
 * Price, MRP and discount as one unit.
 *
 * This trio was rebuilt by hand in five screens, each deriving the percentage
 * slightly differently — one of them rounded to two decimals and printed
 * "23.53% OFF". Centralising it also centralises the rule that matters: an MRP
 * strike-through and a discount badge only appear when there is a real saving.
 */
export const PriceTag = ({
  sellingPrice,
  actualPrice,
  discount,
  size = 'md',
  stacked = false,
  showDiscountBadge = true,
  style,
}: PriceTagProps) => {
  const { colors, typography, radius } = useTheme();

  if (sellingPrice == null) return null;

  const percentage = resolveDiscount(sellingPrice, actualPrice, discount);
  const showMrp = actualPrice != null && actualPrice > sellingPrice;

  const priceStyle =
    size === 'lg' ? typography.priceLarge : size === 'sm' ? typography.numeric : typography.price;

  return (
    <View style={[stacked ? styles.stacked : styles.row, style]}>
      <Text style={[priceStyle, { color: colors.textPrimary }]} numberOfLines={1}>
        {formatRupees(sellingPrice)}
      </Text>

      {showMrp ? (
        <View style={styles.row}>
          <Text
            style={[typography.priceStrike, { color: colors.textHint }]}
            numberOfLines={1}
            // Read as "was ₹200" rather than as a second current price.
            accessibilityLabel={`Was ${formatRupees(actualPrice!)}`}
          >
            {formatRupees(actualPrice!)}
          </Text>

          {showDiscountBadge && percentage != null ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.successSoft, borderRadius: radius.xs },
              ]}
            >
              <Text style={[typography.overline, { color: colors.success }]}>
                {percentage}% OFF
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  stacked: {
    gap: 2,
    flexShrink: 1,
    minWidth: 0,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
