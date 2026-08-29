import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { imageSource } from '../utils/imageUrl';
import type { Product } from '../services/productService';
import { PressableScale } from './PressableScale';
import { PriceTag } from './PriceTag';
import { QuantityStepper } from './QuantityStepper';
import { SmartImage } from './SmartImage';

interface ProductCardProps {
  product: Product;
  /** Current quantity in the cart. 0 shows the ADD button instead of a stepper. */
  quantity?: number;
  onPress?: () => void;
  onAdd?: () => void;
  onIncrease?: () => void;
  onDecrease?: () => void;
  /**
   * Overrides the availability check. Callers pass this when they already have
   * their own rule (ShopDetails treats `isAvailable ?? true` as the whole test,
   * ProductDetails also requires stock) so this card cannot change either.
   */
  available?: boolean;
  /** `grid` for a tile in a 2/3-column grid, `row` for a full-width list row. */
  layout?: 'grid' | 'row';
  offerTag?: string;
  distanceLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The product card, shared by ShopDetails, Home and Groceries.
 *
 * Handles every §"PRODUCT STATES" case in one place: available, out of stock,
 * unavailable, discounted, undiscounted, missing image, failed image (both via
 * `SmartImage`), quantity 0 and quantity > 0. Out-of-stock is communicated by a
 * label as well as by dimming, so it does not depend on colour alone.
 */
export const ProductCard = ({
  product,
  quantity = 0,
  onPress,
  onAdd,
  onIncrease,
  onDecrease,
  available,
  layout = 'grid',
  offerTag,
  distanceLabel,
  style,
}: ProductCardProps) => {
  const { colors, typography, radius, shadows } = useTheme();
  const { sf, isCompact } = useResponsive();

  const isAvailable = available ?? product.isAvailable !== false;
  const isRow = layout === 'row';

  // `stockQuantity` caps the stepper only when the backend actually reports a
  // finite stock figure; a missing/zero-but-available product is not capped
  // here, matching how the existing screens behaved.
  const stockCap =
    typeof product.stockQuantity === 'number' && product.stockQuantity > 0
      ? product.stockQuantity
      : undefined;

  const imageSize = isRow ? (isCompact ? 76 : 84) : undefined;

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={product.name}
      accessibilityHint={isAvailable ? 'View product details' : 'Out of stock'}
      style={[
        isRow ? styles.rowCard : styles.gridCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.md,
        },
        shadows.sm,
        !isAvailable && styles.dimmed,
        style,
      ]}
    >
      <View style={isRow ? styles.rowImageWrap : undefined}>
        <SmartImage
          source={imageSource(product.imageUrl)}
          width={imageSize ?? '100%'}
          height={imageSize ?? 112}
          borderRadius={radius.sm}
          fallbackIcon="fast-food-outline"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />

        {offerTag && isAvailable ? (
          <View
            style={[
              styles.offerBadge,
              { backgroundColor: colors.gold || '#D4AF37', borderRadius: radius.xs },
            ]}
          >
            <Text style={[typography.overline, styles.offerBadgeText]}>{offerTag}</Text>
          </View>
        ) : null}

        {!isAvailable ? (
          <View
            style={[
              styles.stockOverlay,
              { backgroundColor: colors.scrim, borderRadius: radius.sm },
            ]}
          >
            <Text style={[typography.overline, { color: '#FFFFFF' }]}>Out of stock</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.body, isRow && styles.rowBody]}>
        <Text
          numberOfLines={2}
          style={[typography.body, styles.name, { color: colors.textPrimary, fontSize: sf(13.5) }]}
        >
          {product.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {product.unit ? (
            <Text
              numberOfLines={1}
              style={[typography.caption, { color: colors.textHint, fontSize: sf(11.5) }]}
            >
              {product.unit}
            </Text>
          ) : null}
          {distanceLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="navigate-outline" size={10} color={colors.primary || '#173F35'} />
              <Text
                numberOfLines={1}
                style={[typography.caption, { color: colors.primary || '#173F35', fontSize: sf(10.5), fontWeight: '700' }]}
              >
                {distanceLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <PriceTag
            sellingPrice={product.sellingPrice}
            actualPrice={product.actualPrice}
            discount={product.discount}
            size="sm"
            stacked={isCompact && !isRow}
            style={styles.price}
          />

          {isAvailable ? (
            quantity > 0 && onIncrease && onDecrease ? (
              <QuantityStepper
                value={quantity}
                size="sm"
                itemLabel={product.name}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
                canIncrease={stockCap == null || quantity < stockCap}
              />
            ) : onAdd ? (
              <PressableScale
                onPress={onAdd}
                scaleTo={0.92}
                accessibilityLabel={`Add ${product.name} to cart`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.addButton,
                  {
                    backgroundColor: colors.primary || '#F5B700',
                    borderRadius: radius.pill || 999,
                  },
                ]}
              >
                <Ionicons name="cart-outline" size={14} color="#111827" />
                <Text style={[typography.overline, { color: '#111827', fontWeight: '800' }]}>ADD</Text>
              </PressableScale>
            ) : null
          ) : (
            <View
              style={[
                styles.unavailablePill,
                { backgroundColor: colors.errorSoft, borderRadius: radius.xs },
              ]}
            >
              <Text style={[typography.overline, { color: colors.error }]}>Unavailable</Text>
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
    gap: 8,
    flex: 1,
  },
  rowCard: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  rowImageWrap: {
    flexShrink: 0,
  },
  dimmed: {
    opacity: 0.62,
  },
  offerBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 2,
  },
  offerBadgeText: {
    color: '#173F35',
    fontWeight: '800',
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
  stockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 3,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
    // Wrap rather than overflow when a long price and a stepper cannot share a
    // 320px row.
    flexWrap: 'wrap',
  },
  price: {
    flexShrink: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    height: 32,
    borderWidth: 1,
    flexShrink: 0,
  },
  unavailablePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
