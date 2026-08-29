import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { imageSource } from '../utils/imageUrl';
import { getShopOpenState } from '../utils/shopHours';
import type { Shop } from '../types';
import { PressableScale } from './PressableScale';
import { SmartImage } from './SmartImage';

/**
 * Optional fields that some backends return on a shop and some do not. Read
 * defensively — this mirrors `getShopExtra` in NearbyShopsScreen, which was
 * written for exactly this reason: show it when the API sends it, omit it
 * otherwise. Never substitute a placeholder number.
 */
export type ShopMeta = {
  rating?: number | null;
  reviewCount?: number | null;
  deliveryFee?: number | null;
  etaMinutes?: [number, number] | number[] | null;
  isOpen?: boolean | null;
  /** Pre-formatted by the caller via `formatDistance`. */
  distanceLabel?: string | null;
};

interface ShopCardProps {
  shop: Shop;
  meta?: ShopMeta;
  onPress?: () => void;
  /** `list` = full-width row, `tile` = fixed-width card in a horizontal rail. */
  layout?: 'list' | 'tile';
  /** Renders at the top-right of the banner — e.g. a favourite toggle. */
  overlayAction?: React.ReactNode;
  /** Highlights the closest result. */
  badge?: string;
  style?: StyleProp<ViewStyle>;
}

const Pill = ({
  icon,
  text,
  tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  tone?: string;
}) => {
  const { colors, typography, radius } = useTheme();
  const color = tone ?? colors.textSecondary;

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: colors.surfaceSunken, borderRadius: radius.xs },
      ]}
    >
      <Ionicons name={icon} size={11} color={color} />
      <Text
        numberOfLines={1}
        style={[typography.caption, styles.pillText, { color: colors.textSecondary }]}
      >
        {text}
      </Text>
    </View>
  );
};

/**
 * The shop card, shared by Home, NearbyShops and Groceries.
 *
 * Every metadata row is conditional: rating, distance, ETA, delivery fee and
 * open/closed only render when the data genuinely exists (ETA and fee from the
 * API; open/closed derived from the shop's own `openingTime`/`closingTime`, or
 * from an explicit `isOpen` when the backend sends one). Home previously printed
 * a hardcoded "20–30 mins" on every card, which was not a real estimate.
 */
export const ShopCard = ({
  shop,
  meta,
  onPress,
  layout = 'list',
  overlayAction,
  badge,
  style,
}: ShopCardProps) => {
  const { colors, typography, radius, shadows } = useTheme();
  const { sf, isCompact } = useResponsive();

  const isTile = layout === 'tile';

  // The banner is the wide hero image; the logo is the small round mark. Fall
  // back through whichever the shop actually has rather than showing nothing.
  const bannerUrl = shop.bannerUrl || (shop as { imageUrl?: string }).imageUrl || shop.logoUrl;
  const logoUrl = shop.logoUrl;

  const derivedHours = getShopOpenState(
    (shop as { openingTime?: string }).openingTime,
    (shop as { closingTime?: string }).closingTime,
  );
  // An explicit backend flag always wins over our derivation.
  const isOpen = meta?.isOpen ?? derivedHours?.isOpen ?? null;
  const hoursDetail = derivedHours?.detail ?? null;

  const eta =
    Array.isArray(meta?.etaMinutes) && meta!.etaMinutes!.length >= 2
      ? `${meta!.etaMinutes![0]}–${meta!.etaMinutes![1]} mins`
      : typeof meta?.etaMinutes === 'number'
        ? `${meta.etaMinutes} mins`
        : null;

  const deliveryFeeLabel =
    meta?.deliveryFee == null
      ? null
      : meta.deliveryFee === 0
        ? 'Free delivery'
        : `₹${Math.round(meta.deliveryFee)} delivery`;

  const bannerHeight = isTile ? 88 : isCompact ? 104 : 118;

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.98}
      accessibilityLabel={shop.name}
      accessibilityHint="View shop and its products"
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.md,
        },
        shadows.md,
        style,
      ]}
    >
      <View>
        <SmartImage
          source={imageSource(bannerUrl)}
          width="100%"
          height={bannerHeight}
          fallbackIcon="storefront-outline"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />

        {/* Bottom scrim so the logo and any status text stay legible over a
            bright photo without hiding the photo itself. */}
        <View style={[styles.bannerScrim, { backgroundColor: colors.scrim }]} pointerEvents="none" />

        <View
          style={[
            styles.badge,
            { backgroundColor: colors.gold || '#D4AF37', borderRadius: radius.pill },
          ]}
        >
          <Text style={[typography.overline, { color: '#173F35', fontWeight: '800' }]}>
            {badge ?? '0% COMMISSION'}
          </Text>
        </View>

        {overlayAction ? <View style={styles.overlayAction}>{overlayAction}</View> : null}

        {isOpen === false ? (
          <View style={[styles.closedVeil, { backgroundColor: colors.scrimStrong }]}>
            <Text style={[typography.overline, styles.closedText]}>Currently closed</Text>
            {hoursDetail ? (
              <Text style={[typography.caption, styles.closedDetail]}>{hoursDetail}</Text>
            ) : null}
          </View>
        ) : null}

        {logoUrl ? (
          <View
            style={[
              styles.logoRing,
              { borderColor: colors.surface, backgroundColor: colors.surface, borderRadius: radius.sm },
            ]}
          >
            <SmartImage
              source={imageSource(logoUrl)}
              width={38}
              height={38}
              borderRadius={radius.xs}
              fallbackIcon="storefront-outline"
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[typography.headingS, styles.name, { color: colors.textPrimary, fontSize: sf(15) }]}
          >
            {shop.name}
          </Text>

          {meta?.rating != null ? (
            <View
              style={[
                styles.rating,
                { backgroundColor: colors.accentSoft, borderRadius: radius.xs },
              ]}
            >
              <Ionicons name="star" size={11} color={colors.accent} />
              <Text style={[typography.caption, styles.ratingText, { color: colors.textPrimary }]}>
                {meta.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {shop.category ? (
          <Text
            numberOfLines={1}
            style={[typography.caption, { color: colors.textSecondary, fontSize: sf(12) }]}
          >
            {shop.category}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {isOpen === true ? (
            <Pill icon="ellipse" text={hoursDetail ?? 'Open now'} tone={colors.success} />
          ) : null}
          {meta?.distanceLabel ? <Pill icon="navigate-outline" text={meta.distanceLabel} /> : null}
          {eta ? <Pill icon="time-outline" text={eta} /> : null}
          {deliveryFeeLabel ? <Pill icon="bicycle-outline" text={deliveryFeeLabel} /> : null}
          {shop.deliveryAvailable && !deliveryFeeLabel ? (
            <Pill icon="bicycle-outline" text="Delivery available" />
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  bannerScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    opacity: 0.55,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overlayAction: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  closedVeil: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  closedText: {
    color: '#FFFFFF',
  },
  closedDetail: {
    color: 'rgba(255,255,255,0.85)',
  },
  logoRing: {
    position: 'absolute',
    bottom: -10,
    left: 12,
    padding: 3,
    borderWidth: 2,
  },
  body: {
    padding: 12,
    paddingTop: 16,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontWeight: '700',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  ratingText: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  pillText: {
    fontWeight: '600',
    fontSize: 11,
    flexShrink: 1,
  },
});
