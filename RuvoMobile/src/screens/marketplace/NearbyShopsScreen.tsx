import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ROUTES } from '../../constants/routes';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/Card';
import { Layout } from '../../components/Layout';
import { getShops } from '../../services/shopService';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { formatDistance, getDistanceInKm } from '../../utils/distanceUtils';
import type { Shop } from '../../types';
import type { RootStackParamList } from '../../types/navigation';
import { sw, sh, sf } from '../../utils/responsive';

// Dynamic category list from backend shops
const buildCategoryList = (shops: Shop[]): string[] => {
  const seen = new Set<string>();
  shops.forEach(shop => {
    if (shop.category) seen.add(shop.category);
  });
  return ['All Shops', ...Array.from(seen).sort()];
};

// Fields like rating/deliveryFee/minOrder/eta aren't on the current Shop type.
// Read them defensively so this compiles today and picks up real data
// automatically once the backend/type includes them.
const getShopExtra = (shop: Shop) => {
  const anyShop = shop as any;
  return {
    rating: typeof anyShop.rating === 'number' ? anyShop.rating : null,
    reviewCount: typeof anyShop.reviewCount === 'number' ? anyShop.reviewCount : null,
    deliveryFee: typeof anyShop.deliveryFee === 'number' ? anyShop.deliveryFee : 0,
    minOrder: typeof anyShop.minOrder === 'number' ? anyShop.minOrder : null,
    etaMinutes: Array.isArray(anyShop.etaMinutes) ? anyShop.etaMinutes : null,
    isOpen: typeof anyShop.isOpen === 'boolean' ? anyShop.isOpen : true,
  };
};

const FREE_DELIVERY_THRESHOLD = 299;

const NearbyShopsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    location: userLocation,
    isLoading: isFetchingLocation,
    refreshFromGps,
  } = useDeliveryLocation();

  const [activeCategory, setActiveCategory] = useState('All Shops');

  const loadShops = useCallback(async (isRefresh = false) => {
    isRefresh ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const data = await getShops();
      setShops(data || []);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load shops', error);
      setLoadError('Could not load nearby shops. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShops();
    }, [loadShops]),
  );

  const categories = useMemo(() => buildCategoryList(shops), [shops]);

  const sortedByDistance = useMemo(() => {
    const filtered =
      activeCategory === 'All Shops'
        ? shops
        : shops.filter(shop => shop.category === activeCategory);

    if (!userLocation) return filtered;

    return [...filtered].sort((a, b) => {
      const da = getDistanceInKm(userLocation, a) ?? Number.POSITIVE_INFINITY;
      const db = getDistanceInKm(userLocation, b) ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [activeCategory, shops, userLocation]);

  const visibleShops = sortedByDistance;

  const renderShop = (shop: Shop, index: number) => {
    const distance = userLocation ? getDistanceInKm(userLocation, shop) : null;
    const distanceLabel = formatDistance(distance);
    const extra = getShopExtra(shop);
    const isNearest = index === 0 && !!userLocation && !!distance;

    return (
      <Card
        key={String(shop.id)}
        style={[
          styles.shopCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() =>
          navigation.navigate(ROUTES.SHOP_DETAILS, { shopId: Number(shop.id) })
        }
      >
        <View style={styles.shopBannerWrap}>
          {shop.logoUrl || (shop as any).bannerUrl ? (
            <Image
              source={{ uri: shop.logoUrl || (shop as any).bannerUrl }}
              style={styles.shopBanner}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.shopBanner, styles.shopBannerPlaceholder]}>
              <Ionicons name="storefront-outline" size={30} color={colors.primary} />
            </View>
          )}

          {extra.isOpen && (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>Open</Text>
            </View>
          )}

          {isNearest && (
            <View style={styles.nearestBadge}>
              <Text style={[styles.nearestBadgeText, { color: colors.primary }]}>Nearest</Text>
            </View>
          )}
        </View>

        <View style={styles.shopInfo}>
          <Text style={[styles.shopName, { color: colors.textPrimary }]} numberOfLines={1}>
            {shop.name}
          </Text>

          <View style={styles.metaRow}>
            {extra.rating != null && (
              <>
                <Ionicons name="star" size={13} color={colors.primary} />
                <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
                  {extra.rating.toFixed(1)}
                </Text>
                {extra.reviewCount != null && (
                  <Text style={[styles.reviewText, { color: colors.textSecondary }]}>
                    ({extra.reviewCount})
                  </Text>
                )}
                <Text style={[styles.dotSep, { color: colors.border }]}>•</Text>
              </>
            )}
            {shop.category ? (
              <Text
                style={[styles.tagsText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {shop.category}
              </Text>
            ) : null}
          </View>

          {distanceLabel ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
                {distanceLabel}
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View
              style={[
                styles.deliveryPill,
                { backgroundColor: extra.deliveryFee === 0 ? colors.primary + '1a' : '#FFF3E0' },
              ]}
            >
              <Text
                style={[
                  styles.deliveryPillText,
                  { color: extra.deliveryFee === 0 ? colors.primary : '#E65100' },
                ]}
              >
                {extra.deliveryFee === 0 ? 'Free delivery' : `₹${extra.deliveryFee} delivery`}
              </Text>
            </View>
            {extra.minOrder != null && (
              <>
                <Text style={[styles.dotSep, { color: colors.border }]}>•</Text>
                <Text style={[styles.minOrderText, { color: colors.textSecondary }]}>
                  Min. order ₹{extra.minOrder}
                </Text>
              </>
            )}
          </View>

          <View style={styles.footerRow}>
            {extra.etaMinutes ? (
              <View style={styles.etaRow}>
                <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.etaText, { color: colors.textSecondary }]}>
                  {extra.etaMinutes[0]}-{extra.etaMinutes[1]} mins
                </Text>
              </View>
            ) : (
              <View />
            )}

            <TouchableOpacity
              style={[styles.viewItemsBtn, { borderColor: colors.primary }]}
              onPress={() =>
                navigation.navigate(ROUTES.SHOP_DETAILS, { shopId: Number(shop.id) })
              }
            >
              <Text style={[styles.viewItemsBtnText, { color: colors.primary }]}>
                View Items
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Layout style={styles.layout}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Nearest Shops</Text>
          <Text style={[styles.subTitle, { color: colors.textSecondary }]} numberOfLines={1}>
            Shops near your location
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity hitSlop={8} style={styles.headerIconBtn}>
            <Ionicons name="search" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8} style={styles.headerIconBtn}>
            <Ionicons name="options-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Deliver-to row */}
      <View style={[styles.deliverRow, { borderBottomColor: colors.border }]}>
        <Ionicons name="location" size={20} color={colors.primary} />
        <View style={styles.deliverTextWrap}>
          <Text style={[styles.deliverLabel, { color: colors.textPrimary }]}>
            Deliver to{' '}
            <Text style={[styles.deliverHome, { color: colors.primary }]}>Home</Text>
          </Text>
          <Text
            style={[styles.deliverAddress, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {userLocation?.shortLabel ?? 'Set your delivery location'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.locationBtn, { borderColor: colors.primary }]}
          onPress={refreshFromGps}
        >
          {isFetchingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={14} color={colors.primary} />
          )}
          <Text style={[styles.locationBtnText, { color: colors.primary }]}>
            Use My Location
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Category Chips */}
      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map(category => {
            const active = category === activeCategory;
            return (
              <TouchableOpacity
                key={category}
                activeOpacity={0.72}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.textSecondary + '55' },
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadShops(true)}
            tintColor={colors.primary}
          />
        }
      >
        {!userLocation && !isFetchingLocation && (
          <View style={[styles.warnBanner, { backgroundColor: '#f59e0b1a', borderColor: '#f59e0b4d' }]}>
            <Ionicons name="location-outline" size={18} color="#f59e0b" />
            <Text style={styles.warnText}>Set your location to view exact distances.</Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
        ) : loadError ? (
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.textSecondary} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>{loadError}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => loadShops()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : visibleShops.length === 0 ? (
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="storefront-outline" size={44} color={colors.textSecondary} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              No shops found{activeCategory !== 'All Shops' ? ` in ${activeCategory}` : ''}.
            </Text>
          </View>
        ) : (
          visibleShops.map(renderShop)
        )}
      </ScrollView>

      {/* Free delivery progress banner (static threshold — wire to real cart total when available) */}
      <View style={[styles.freeDeliveryBanner, { backgroundColor: colors.primary + '14' }]}>
        <View style={styles.bannerLeft}>
          <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
            Free delivery on orders above ₹{FREE_DELIVERY_THRESHOLD}
          </Text>
          <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
            Shop more, save more!
          </Text>
        </View>
        <TouchableOpacity style={[styles.bannerArrowBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  layout: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: sw(16),
    paddingVertical: sh(12),
    borderBottomWidth: 1,
    gap: sw(12),
  },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: sf(20), fontWeight: '800' },
  subTitle: { fontSize: sf(13), marginTop: sh(2) },
  headerIcons: { flexDirection: 'row', gap: sw(16), flexShrink: 0 },
  headerIconBtn: { padding: 2 },

  deliverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(8),
    paddingHorizontal: sw(16),
    paddingVertical: sh(14),
    borderBottomWidth: 1,
  },
  deliverTextWrap: { flex: 1, minWidth: 0 },
  deliverLabel: { fontSize: sf(14) },
  deliverHome: { fontWeight: '700' },
  deliverAddress: { fontSize: sf(13), marginTop: sh(1) },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(6),
    borderWidth: 1,
    borderRadius: sw(8),
    paddingHorizontal: sw(10),
    paddingVertical: sh(8),
    flexShrink: 0,
  },
  locationBtnText: { fontSize: sf(12), fontWeight: '600' },

  chipRow: { paddingHorizontal: sw(16), paddingVertical: sh(12), gap: sw(10) },
  chip: {
    borderWidth: 1.5,
    borderRadius: sw(20),
    paddingHorizontal: sw(16),
    paddingVertical: sh(8),
    marginRight: sw(10),
    minWidth: sw(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: sf(13), fontWeight: '600' },

  container: { padding: sw(16), paddingBottom: sh(120) },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(8),
    padding: sw(10),
    borderRadius: sw(10),
    borderWidth: 1,
    marginBottom: sh(12),
  },
  warnText: { flex: 1, color: '#f59e0b', fontSize: sf(12) },

  loading: { marginVertical: sh(32) },
  statusCard: {
    minHeight: sh(140),
    borderRadius: sw(14),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sw(20),
    gap: sh(10),
  },
  statusText: { textAlign: 'center', fontSize: sf(14), lineHeight: sf(20) },
  retryBtn: { paddingHorizontal: sw(22), paddingVertical: sh(9), borderRadius: sw(20) },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: sf(13) },

  shopCard: {
    marginBottom: sh(16),
    borderRadius: sw(14),
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  shopBannerWrap: { width: '100%', height: sh(140), position: 'relative' },
  shopBanner: { width: '100%', height: '100%' },
  shopBannerPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F2' },
  openBadge: {
    position: 'absolute',
    bottom: sh(10),
    left: sw(10),
    backgroundColor: '#2E7D32',
    borderRadius: sw(6),
    paddingHorizontal: sw(10),
    paddingVertical: sh(4),
  },
  openBadgeText: { color: '#FFF', fontSize: sf(12), fontWeight: '700' },
  nearestBadge: {
    position: 'absolute',
    top: sh(10),
    right: sw(10),
    borderRadius: sw(6),
    paddingHorizontal: sw(10),
    paddingVertical: sh(4),
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  nearestBadgeText: { fontSize: sf(12), fontWeight: '700' },

  shopInfo: { padding: sw(14) },
  shopName: { fontSize: sf(17), fontWeight: '800', marginBottom: sh(6) },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: sw(4), marginBottom: sh(6) },
  ratingText: { fontSize: sf(13), fontWeight: '700' },
  reviewText: { fontSize: sf(13) },
  dotSep: { fontSize: sf(13), marginHorizontal: sw(2) },
  tagsText: { fontSize: sf(13), flexShrink: 1 },
  distanceText: { fontSize: sf(13) },

  deliveryPill: { borderRadius: sw(6), paddingHorizontal: sw(8), paddingVertical: sh(3) },
  deliveryPillText: { fontSize: sf(12), fontWeight: '600' },
  minOrderText: { fontSize: sf(13) },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: sh(8) },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: sw(4) },
  etaText: { fontSize: sf(13) },
  viewItemsBtn: {
    borderWidth: 1.5,
    borderRadius: sw(8),
    paddingHorizontal: sw(16),
    paddingVertical: sh(8),
  },
  viewItemsBtnText: { fontSize: sf(13), fontWeight: '700' },

  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(12),
    paddingHorizontal: sw(16),
    paddingVertical: sh(14),
  },
  bannerLeft: { flex: 1 },
  bannerTitle: { fontSize: sf(13), fontWeight: '700' },
  bannerSub: { fontSize: sf(12), marginTop: sh(2) },
  bannerArrowBtn: {
    width: sw(32),
    height: sw(32),
    borderRadius: sw(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { NearbyShopsScreen };
export default NearbyShopsScreen;