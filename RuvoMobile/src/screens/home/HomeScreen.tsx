import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';
import { getMyOrders } from '../../services/orderService';
import { Order } from '../../types/order';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { getNearbyShops, getShops } from '../../services/shopService';
import type { Shop } from '../../types';
import { sw, sh, sf } from '../../utils/responsive';

// ── Design tokens ──────────────────────────────────────────
const PRIMARY = '#2E7D32';
const PRIMARY_LIGHT = '#4CAF50';
const LIGHT_GREEN = '#E8F5E9';
const BG = '#F5F6FA';
const TEXT_DARK = '#1A1A1A';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

// ── Quick category links ───────────────────────────────────
const QUICK_LINKS = [
  { id: 'stores', label: 'Top Stores', icon: '🏪', bg: '#FFF3E0' },
  { id: 'groceries', label: 'Categories', icon: '🛒', bg: '#E8F5E9' },
  { id: 'pass', label: 'RuVo Pass', icon: '👑', bg: '#EDE7F6' },
  { id: 'delivery', label: 'Fast Delivery', icon: '🛵', bg: '#FFF3E0' },
];

// ── Shop-by-category data ──────────────────────────────────
const SHOP_CATEGORIES = [
  { id: 'veg', label: 'Vegetables &\nFruits', emoji: '🥦', bg: '#E8F5E9' },
  { id: 'staples', label: 'Staples &\nDaily Needs', emoji: '🌾', bg: '#FFF8E1' },
  { id: 'dairy', label: 'Dairy, Bread\n& Eggs', emoji: '🥛', bg: '#E3F2FD' },
  { id: 'personal', label: 'Personal Care\n& Hygiene', emoji: '🧴', bg: '#FCE4EC' },
  { id: 'snacks', label: 'Snacks &\nBeverages', emoji: '🍟', bg: '#FFF3E0' },
];

const FETCHING_LABEL = 'Fetching location...';

export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, userId, token } = useAuth();
  const { location, isLoading: locationLoading } = useDeliveryLocation();
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  // Static width check (same approach your original file used, no extra hook)
  const windowWidth = Dimensions.get('window').width;
  const isSmallScreen = windowWidth < 360;
  const isTablet = windowWidth >= 600;

  const locationText = locationLoading
    ? FETCHING_LABEL
    : getDeliveryLocationLabel(location);
  const isFetchingLocation = locationText === FETCHING_LABEL;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const [nearbyProducts, setNearbyProducts] = useState<any[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      if (userId && token) {
        getMyOrders(userId, token)
          .then((orders) => {
            const inactiveStatuses = [
              'DELIVERED',
              'SHOP_REJECTED',
              'CANCELLED',
              'SHOP_TIMEOUT',
              'CANCELLED_SHOP_TIMEOUT',
              'CANCELLED_BY_SHOP',
              'CANCELLED_NO_PARTNER_FOUND',
              'REJECTED',
            ];
            const pending = orders.find(o =>
              !inactiveStatuses.includes((o.orderStatus || '').toUpperCase())
            );
            setActiveOrder(pending || null);
          })
          .catch(() => {});
      }
      // Load nearby shops and their products for the Popular Stores & Nearby Products sections
      setShopsLoading(true);
      (location
        ? getNearbyShops(location.latitude, location.longitude, 5)
        : getShops())
        .then(async shops => {
          setNearbyShops(shops.slice(0, 4));
          // Fetch products from the top shops
          try {
            const { getProductsByShop } = require('../../services/productService');
            const allProducts: any[] = [];
            for (const s of shops.slice(0, 3)) {
              const prods = await getProductsByShop(s.id);
              if (Array.isArray(prods)) {
                allProducts.push(...prods.filter(p => p.isAvailable !== false && p.imageUrl && p.imageUrl.trim() !== ''));
              }
            }
            setNearbyProducts(allProducts.slice(0, 8));
          } catch (e) {}
        })
        .catch(() => {})
        .finally(() => setShopsLoading(false));
    }, [userId, token, location?.latitude, location?.longitude])
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar backgroundColor={WHITE} barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Logo */}
          <Text style={styles.logoText} numberOfLines={1}>
            <Text style={styles.logoR}>R</Text>
            <Text style={styles.logoU}>u</Text>
            <Text style={styles.logoVo}>Vo</Text>
          </Text>

          {/* Location pill */}
          <TouchableOpacity
            style={styles.locationPill}
            onPress={() => setLocationPickerVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="location-sharp" size={14} color={PRIMARY} />
            <View style={styles.locationPillText}>
              <Text style={styles.deliverToLabel} numberOfLines={1}>Deliver to</Text>
              <View style={styles.locationValueRow}>
                {isFetchingLocation && (
                  <ActivityIndicator size="small" color={TEXT_DARK} style={{ marginRight: 4 }} />
                )}
                <Text style={styles.locationValue} numberOfLines={1}>
                  {locationText}
                </Text>
                <Ionicons name="chevron-down" size={12} color={TEXT_DARK} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Action icons */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.75}>
              <Ionicons name="notifications-outline" size={22} color={TEXT_DARK} />
              {/* Notification badge */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(ROUTES.CART as never)}
            >
              <Ionicons name="bag-outline" size={22} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color={TEXT_SECONDARY} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search for products, stores..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.scanBtn}>
            <Ionicons name="scan-outline" size={18} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
      >
        {/* ── Active Order Tracking Widget ─────────────────── */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.activeOrderWidget}
            activeOpacity={0.9}
            onPress={() => (navigation as any).navigate('CustomerTracking', { orderId: activeOrder.id })}
          >
            <View style={styles.activeOrderIconBox}>
              <Ionicons name="bicycle" size={22} color="#3B82F6" />
            </View>
            <View style={styles.activeOrderDetails}>
              <Text style={styles.activeOrderTitle} numberOfLines={1}>
                Active Order: {activeOrder.orderStatus?.replace(/_/g, ' ')}
              </Text>
              <Text style={styles.activeOrderStatus}>Tap to track your delivery</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* ── Hero Banner ─────────────────────────────────── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeft}>
            <Text style={[styles.heroTitle, isSmallScreen && styles.heroTitleSmall]}>
              Fresh Groceries
            </Text>
            <Text style={[styles.heroSubTitle, isSmallScreen && styles.heroTitleSmall]}>
              Delivered Fast
            </Text>
            <Text style={styles.heroBody}>Get everything you need{'\n'}at your doorstep</Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => navigation.navigate(ROUTES.GROCERIES as never)}
              activeOpacity={0.85}
            >
              <Text style={styles.heroBtnText}>Shop Now</Text>
              <Ionicons name="arrow-forward" size={14} color={WHITE} />
            </TouchableOpacity>
          </View>
          {!isSmallScreen && (
            <View style={styles.heroRight}>
              <Text style={styles.heroEmoji}>🧺</Text>
            </View>
          )}
          {/* Dots */}
          <View style={styles.dotRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* ── Quick Links ──────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickLinksRow}
        >
          {QUICK_LINKS.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.quickLinkItem}
              onPress={() => {
                if (item.id === 'groceries' || item.id === 'stores' || item.id === 'delivery' || item.id === 'pass') {
                  navigation.navigate(ROUTES.GROCERIES as never);
                }
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: item.bg }]}>
                <Text style={styles.quickLinkEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.quickLinkLabel} numberOfLines={2}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Shop by Category ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <TouchableOpacity onPress={() => navigation.navigate(ROUTES.GROCERIES as never)}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollRow}
        >
          {SHOP_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: cat.bg }]}
              onPress={() => navigation.navigate(ROUTES.GROCERIES as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryLabel} numberOfLines={2}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Popular Stores Near You ───────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Stores Near You</Text>
          <TouchableOpacity onPress={() => navigation.navigate(ROUTES.GROCERIES as never)}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storeScrollRow}
        >
          {shopsLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginHorizontal: 16, marginVertical: 20 }} />
          ) : nearbyShops.length === 0 ? (
            // Static placeholders when no shops loaded yet
            [
              { id: 'p1', name: 'Fresh Basket', emoji: '🧺', mins: '15–20', rating: 4.6, bg: LIGHT_GREEN },
              { id: 'p2', name: 'Daily Mart', emoji: '🏪', mins: '20–25', rating: 4.4, bg: '#FFF8E1' },
              { id: 'p3', name: 'Green Express', emoji: '🌿', mins: '20–25', rating: 4.5, bg: '#E8F5E9' },
              { id: 'p4', name: 'Super Save', emoji: '🛒', mins: '25–30', rating: 4.3, bg: '#FCE4EC' },
            ].map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.storeCard}
                onPress={() => navigation.navigate(ROUTES.GROCERIES as never)}
                activeOpacity={0.85}
              >
                <View style={[styles.storeBannerPlaceholder, { backgroundColor: s.bg }]}>
                  <Text style={{ fontSize: 36 }}>{s.emoji}</Text>
                </View>
                <Text style={styles.storeName} numberOfLines={1}>{s.name}</Text>
                <View style={styles.storeMeta}>
                  <Text style={styles.storeTime} numberOfLines={1}>{s.mins} mins</Text>
                  <View style={styles.storeRating}>
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text style={styles.storeRatingText}>{s.rating}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            nearbyShops.map(shop => (
              <TouchableOpacity
                key={shop.id}
                style={styles.storeCard}
                onPress={() => navigation.navigate(ROUTES.SHOP_DETAILS as never, { shopId: shop.id } as never)}
                activeOpacity={0.85}
              >
                <View style={styles.storeBannerPlaceholder}>
                  {shop.logoUrl ? (
                    <Image source={{ uri: shop.logoUrl }} style={styles.storeImage} resizeMode="cover" />
                  ) : shop.bannerUrl ? (
                    <Image source={{ uri: shop.bannerUrl }} style={styles.storeImage} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 32 }}>🏪</Text>
                  )}
                </View>
                <Text style={styles.storeName} numberOfLines={1}>{shop.name}</Text>
                <View style={styles.storeMeta}>
                  <Text style={styles.storeTime} numberOfLines={1}>20–30 mins</Text>
                  {shop.rating != null && (
                    <View style={styles.storeRating}>
                      <Ionicons name="star" size={10} color="#F59E0B" />
                      <Text style={styles.storeRatingText}>{shop.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* ── Nearby Products ───────────────────────────────── */}
        {nearbyProducts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products Near You</Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.GROCERIES as never)}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storeScrollRow}
            >
              {nearbyProducts.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.storeCard, { width: sw(118), padding: sw(8) }]}
                  onPress={() => navigation.navigate(ROUTES.PRODUCT_DETAILS as never, { product: p } as never)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.storeBannerPlaceholder, { height: sh(75), borderRadius: sw(8), overflow: 'hidden' }]}>
                    {p.imageUrl ? (
                      <Image source={{ uri: p.imageUrl }} style={styles.storeImage} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 32 }}>📦</Text>
                    )}
                  </View>
                  <Text style={[styles.storeName, { fontSize: sf(12), paddingTop: sh(6) }]} numberOfLines={1}>{p.name}</Text>
                  <View style={[styles.storeMeta, { paddingBottom: sh(6) }]}>
                    <Text style={{ fontSize: sf(13), fontWeight: '800', color: TEXT_DARK }}>₹{p.sellingPrice}</Text>
                    {p.actualPrice > p.sellingPrice && (
                      <Text style={{ fontSize: sf(10), color: TEXT_SECONDARY, textDecorationLine: 'line-through' }}>₹{p.actualPrice}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Why RuVo ─────────────────────────────────────── */}
        <View style={styles.whyRow}>
          {[
            { icon: '💵', label: 'Cash on Delivery' },
            { icon: '🏪', label: 'Shop Local' },
            { icon: '🎉', label: '0% Commission' },
          ].map(item => (
            <View key={item.label} style={styles.whyChip}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              <Text style={styles.whyLabel} numberOfLines={2}>{item.label}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ────────────────────────────────────────────────
  header: {
    backgroundColor: WHITE,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + sh(6) : sh(8),
    paddingHorizontal: sw(16),
    paddingBottom: sh(12),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sh(12),
    gap: sw(8),
  },
  logoText: { fontSize: sf(26), fontWeight: '900', letterSpacing: -0.5, flexShrink: 0 },
  logoR: { color: '#1A237E' },
  logoU: { color: '#E65100' },
  logoVo: { color: PRIMARY },

  locationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(6),
    marginHorizontal: sw(4),
    minWidth: 0, // allows text truncation to work inside a flex row on Android
  },
  locationPillText: { flex: 1, minWidth: 0 },
  deliverToLabel: { fontSize: sf(11), color: TEXT_SECONDARY, fontWeight: '500' },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: sw(2), flexShrink: 1 },
  locationValue: { fontSize: sf(13), fontWeight: '700', color: TEXT_DARK, flexShrink: 1 },

  headerActions: { flexDirection: 'row', gap: sw(8), flexShrink: 0 },
  iconBtn: {
    width: sw(38),
    height: sw(38),
    borderRadius: sw(19),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    width: sw(14),
    height: sw(14),
    borderRadius: sw(7),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: sf(8), fontWeight: '800', color: WHITE },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: sw(12),
    paddingHorizontal: sw(14),
    paddingVertical: sh(12),
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  searchBarFocused: { borderColor: PRIMARY },
  searchInput: { flex: 1, fontSize: sf(14), color: TEXT_DARK, padding: 0 },
  scanBtn: { padding: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: sh(32) },
  // On wide/tablet screens, cap and center content so it doesn't stretch edge-to-edge
  scrollContentTablet: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },

  // ── Active Order Widget ───────────────────────────────────
  activeOrderWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: sw(16),
    marginTop: sh(14),
    padding: sw(14),
    borderRadius: sw(14),
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...CARD_SHADOW,
  },
  activeOrderIconBox: {
    backgroundColor: '#DBEAFE',
    width: sw(40),
    height: sw(40),
    borderRadius: sw(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sw(12),
    flexShrink: 0,
  },
  activeOrderDetails: { flex: 1, minWidth: 0 },
  activeOrderTitle: {
    fontSize: sf(14),
    fontWeight: '800',
    color: '#1E3A8A',
    textTransform: 'capitalize',
  },
  activeOrderStatus: { fontSize: sf(12), color: '#2563EB', fontWeight: '500', marginTop: sh(2) },

  // ── Hero Banner ───────────────────────────────────────────
  heroBanner: {
    backgroundColor: LIGHT_GREEN,
    marginHorizontal: sw(16),
    marginTop: sh(14),
    borderRadius: sw(16),
    padding: sw(20),
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    minHeight: sh(160),
  },
  heroLeft: { flex: 1, minWidth: 0 },
  heroTitle: {
    fontSize: sf(22),
    fontWeight: '900',
    color: TEXT_DARK,
    lineHeight: sf(26),
  },
  heroSubTitle: {
    fontSize: sf(22),
    fontWeight: '900',
    color: PRIMARY,
    lineHeight: sf(28),
    marginBottom: sh(6),
  },
  heroTitleSmall: {
    fontSize: sf(18),
    lineHeight: sf(22),
  },
  heroBody: {
    fontSize: sf(12.5),
    color: TEXT_SECONDARY,
    lineHeight: sf(18),
    marginBottom: sh(14),
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: sw(16),
    paddingVertical: sh(10),
    borderRadius: sw(10),
    alignSelf: 'flex-start',
    gap: sw(6),
  },
  heroBtnText: { fontSize: sf(13), fontWeight: '700', color: WHITE },
  heroRight: { alignItems: 'center', justifyContent: 'center', width: sw(100), flexShrink: 0 },
  heroEmoji: { fontSize: sf(64) },
  dotRow: {
    position: 'absolute',
    bottom: sh(12),
    left: sw(20),
    flexDirection: 'row',
    gap: sw(5),
  },
  dot: {
    width: sw(6),
    height: sw(6),
    borderRadius: sw(3),
    backgroundColor: '#A5D6A7',
  },
  dotActive: { backgroundColor: PRIMARY, width: sw(14) },

  // ── Quick Links ───────────────────────────────────────────
  quickLinksRow: {
    paddingHorizontal: sw(16),
    paddingVertical: sh(16),
    gap: sw(8),
  },
  quickLinkItem: {
    alignItems: 'center',
    width: sw(72),
  },
  quickLinkIcon: {
    width: sw(54),
    height: sw(54),
    borderRadius: sw(27),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sh(6),
  },
  quickLinkEmoji: { fontSize: sf(24) },
  quickLinkLabel: { fontSize: sf(11), color: TEXT_DARK, fontWeight: '600', textAlign: 'center' },

  // ── Section Header ────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(16),
    marginBottom: sh(10),
    marginTop: sh(4),
  },
  sectionTitle: { fontSize: sf(17), fontWeight: '800', color: TEXT_DARK, flexShrink: 1 },
  viewAll: { fontSize: sf(13), fontWeight: '700', color: PRIMARY, flexShrink: 0, marginLeft: sw(8) },

  // ── Shop by Category ──────────────────────────────────────
  categoryScrollRow: {
    paddingHorizontal: sw(16),
    paddingBottom: sh(16),
    gap: sw(10),
  },
  categoryCard: {
    width: sw(102),
    height: sh(110),
    borderRadius: sw(14),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sw(8),
    ...CARD_SHADOW,
  },
  categoryEmoji: { fontSize: sf(34), marginBottom: sh(6) },
  categoryLabel: {
    fontSize: sf(11),
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    lineHeight: sf(15),
  },

  // ── Popular Stores ────────────────────────────────────────
  storeScrollRow: {
    paddingHorizontal: sw(16),
    paddingBottom: sh(16),
    gap: sw(12),
  },
  storeCard: {
    width: sw(124),
    backgroundColor: WHITE,
    borderRadius: sw(14),
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  storeBannerPlaceholder: {
    height: sh(80),
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeImage: { width: '100%', height: '100%' },
  storeName: {
    fontSize: sf(13),
    fontWeight: '700',
    color: TEXT_DARK,
    paddingHorizontal: sw(8),
    paddingTop: sh(8),
    paddingBottom: sh(2),
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(8),
    paddingBottom: sh(10),
  },
  storeTime: { fontSize: sf(11), color: TEXT_SECONDARY, flexShrink: 1 },
  storeRating: { flexDirection: 'row', alignItems: 'center', gap: sw(2), flexShrink: 0 },
  storeRatingText: { fontSize: sf(11), fontWeight: '700', color: '#F59E0B' },

  // ── Offers ────────────────────────────────────────────────
  offersRow: {
    paddingHorizontal: sw(16),
    paddingBottom: sh(16),
    gap: sw(12),
  },
  offerCard: {
    width: sw(148),
    borderRadius: sw(14),
    padding: sw(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...CARD_SHADOW,
  },
  offerLeft: { flex: 1, minWidth: 0 },
  offerTopLabel: { fontSize: sf(10), fontWeight: '800', marginBottom: sh(1) },
  offerDiscount: { fontSize: sf(16), fontWeight: '900', lineHeight: sf(20) },
  offerSub: { fontSize: sf(10), lineHeight: sf(13), marginTop: sh(4), marginBottom: sh(8) },
  offerCodeBadge: {
    paddingHorizontal: sw(8),
    paddingVertical: sh(4),
    borderRadius: sw(6),
    alignSelf: 'flex-start',
  },
  offerCode: { fontSize: sf(10), fontWeight: '900' },
  offerEmoji: { fontSize: sf(30), marginLeft: sw(6), flexShrink: 0 },

  // ── Why RuVo ─────────────────────────────────────────────
  whyRow: {
    flexDirection: 'row',
    paddingHorizontal: sw(16),
    gap: sw(10),
    marginTop: sh(4),
    marginBottom: sh(8),
  },
  whyChip: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: sw(12),
    padding: sw(12),
    alignItems: 'center',
    gap: sh(6),
    borderWidth: 1,
    borderColor: BORDER,
    ...CARD_SHADOW,
  },
  whyLabel: { fontSize: sf(10.5), fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
});
