import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ROUTES } from '../../constants/routes';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getNearbyShops, getShops } from '../../services/shopService';
import { getProductsByShop } from '../../services/productService';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { formatDistance, getDistanceInKm } from '../../utils/distanceUtils';
import type { Shop } from '../../types';
import type { RootStackParamList } from '../../types/navigation';

type NearbyShopsRouteProp = RouteProp<RootStackParamList, 'NearbyShops'>;
import { SHOP_IMAGES, CATEGORY_IMAGES, PRODUCT_IMAGES, GROCERY_IMAGES, getCategoryImage } from '../../assets/cloudinary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Default Mock Shops with 3D Assets for Demonstration ────


export const NearbyShopsScreen = () => {
  const { colors, theme, toggleTheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<NearbyShopsRouteProp>();
  const categoryFilter = (route.params as any)?.category as string | undefined;
  const { location: userLocation, refreshFromGps } = useDeliveryLocation();
  const { cartItems, addToCart, cartTotal } = useCart();

  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load shops from backend, optionally filtered by category
  const loadData = useCallback(async () => {
    setShopsLoading(true);
    try {
      const data = userLocation
        ? await getNearbyShops(userLocation.latitude, userLocation.longitude, 5)
        : await getShops();
      let all: any[] = Array.isArray(data) ? data : [];

      const merged = all.map((s, idx) => {
        const validBanner = s.bannerUrl && typeof s.bannerUrl === 'string' && s.bannerUrl.trim().length > 0 ? s.bannerUrl : null;
        const validLogo = s.logoUrl && typeof s.logoUrl === 'string' && s.logoUrl.trim().length > 0 ? s.logoUrl : null;
        const catImg = getCategoryImage(s.category || '');
        const fallbackImg = SHOP_IMAGES.freshMart;

        return {
          ...s,
          tag: s.category || 'Store',
          subtitle: s.address || 'Groceries & Daily Essentials',
          rating: s.rating ?? 4.5,
          eta: '20-25 mins',
          dist: s.distanceKm ? `${s.distanceKm} km` : '0.5 km',
          image: validBanner || validLogo || catImg || fallbackImg,
        };
      });

      // Filter by category if provided; fall back to all if none match
      let displayed = merged;
      if (categoryFilter) {
        const filtered = merged.filter(s =>
          s.category?.toLowerCase().includes(categoryFilter.toLowerCase()) ||
          s.tag?.toLowerCase().includes(categoryFilter.toLowerCase())
        );
        displayed = filtered.length > 0 ? filtered : merged;
      }

      setShops(displayed);
      if (displayed.length > 0) setSelectedShopId(displayed[0].id);
    } catch {
      setShops([]);
    } finally {
      setShopsLoading(false);
    }
  }, [userLocation, categoryFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Fetch shop products when selected shop changes
  useEffect(() => {
    if (!selectedShopId) return;
    setLoading(true);
    getProductsByShop(Number(selectedShopId))
      .then(prods => {
        if (Array.isArray(prods) && prods.length > 0) {
          setProducts(prods.map(p => ({
            id: p.id,
            name: p.name,
            unit: p.unit || '1 unit',
            price: p.sellingPrice || p.actualPrice,
            category: p.category || 'All',
            image: (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.trim().length > 0) ? p.imageUrl : PRODUCT_IMAGES.milk,
          })));
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      })
      .catch(() => setProducts(MOCK_PRODUCTS))
      .finally(() => setLoading(false));
  }, [selectedShopId]);

  const selectedShop = useMemo(
    () => shops.find(s => String(s.id) === String(selectedShopId)) || shops[0] || null,
    [shops, selectedShopId]
  );

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  if (shopsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F8FAFC', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#EAB308" />
        <Text style={{ color: theme === 'dark' ? '#F8FAFC' : '#0F172A', marginTop: 12, fontWeight: '600' }}>Finding shops near you...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F8FAFC' }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF', borderBottomColor: theme === 'dark' ? '#334155' : '#E2E8F0' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : (navigation.navigate as any)(ROUTES.HOME))} style={styles.iconBtn}>
            <Ionicons name="menu-outline" size={24} color={theme === 'dark' ? '#F8FAFC' : '#1E293B'} />
          </TouchableOpacity>

          <Text style={styles.logoRuvo}>
            ru<Text style={styles.logoVo}>vo</Text>
          </Text>

          <TouchableOpacity style={styles.locationPill} onPress={refreshFromGps}>
            <Ionicons name="location-sharp" size={14} color="#EAB308" />
            <Text style={[styles.locationText, { color: theme === 'dark' ? '#E2E8F0' : '#334155' }]} numberOfLines={1}>
              {getDeliveryLocationLabel(userLocation) || 'Connaught Place, Delhi'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={theme === 'dark' ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {/* Theme Toggle Button */}
          <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
            <Ionicons name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={22} color={theme === 'dark' ? '#FACC15' : '#475569'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate(ROUTES.CART)}>
            <Ionicons name="cart-outline" size={24} color={theme === 'dark' ? '#F8FAFC' : '#1E293B'} />
            {cartItems.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Bar ───────────────────────────────────────────── */}
      <View style={[styles.searchWrap, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF' }]}>
        <View style={[styles.searchBar, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F1F5F9' }]}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <Text style={styles.searchPlaceholder}>Search for shops or products...</Text>
          <Ionicons name="mic-outline" size={18} color="#94A3B8" />
        </View>
      </View>

      {/* ── Category filter header if coming from category tap ──── */}
      {categoryFilter && (
        <View style={[styles.catFilterBanner, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FEFCE8' }]}>
          <Ionicons name="filter-outline" size={14} color="#EAB308" />
          <Text style={styles.catFilterText}>Showing shops for: <Text style={{ color: '#EAB308', fontWeight: '800' }}>{categoryFilter}</Text></Text>
          <TouchableOpacity onPress={() => (navigation as any).setParams({ category: undefined })}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── 2-Panel Split Body ───────────────────────────────────── */}
      <View style={styles.splitBody}>
        {/* ── Left Panel: Shops List ────────────────────────────── */}
        <View style={[styles.leftPanel, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF', borderRightColor: theme === 'dark' ? '#334155' : '#E2E8F0' }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }]}>Shops Near You</Text>
            <Text style={styles.panelSubtitle}>Discover top shops around you</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {shops.map(shop => {
              const isSelected = String(shop.id) === String(selectedShopId);
              return (
                <TouchableOpacity
                  key={String(shop.id)}
                  activeOpacity={0.8}
                  onPress={() => setSelectedShopId(shop.id)}
                  style={[
                    styles.shopItemCard,
                    {
                      backgroundColor: isSelected
                        ? theme === 'dark' ? '#334155' : '#FEFCE8'
                        : theme === 'dark' ? '#1E293B' : '#FFFFFF',
                      borderColor: isSelected ? '#EAB308' : theme === 'dark' ? '#334155' : '#F1F5F9',
                    },
                  ]}
                >
                  <Image source={{ uri: shop.image }} style={styles.shopItemImg} resizeMode="contain" />
                  <View style={styles.shopItemInfo}>
                    <View style={styles.shopTitleRow}>
                      <Text style={[styles.shopItemName, { color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                        {shop.name}
                      </Text>
                    </View>

                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{shop.tag || 'Store'}</Text>
                    </View>

                    <Text style={styles.shopItemSub} numberOfLines={1}>{shop.subtitle || 'Groceries & Essentials'}</Text>

                    <View style={styles.metaRow}>
                      <Ionicons name="star" size={11} color="#EAB308" />
                      <Text style={styles.metaText}>{shop.rating || 4.5} • {shop.eta || '25 mins'}</Text>
                    </View>
                    <Text style={styles.distText}>{shop.dist || '0.3 km'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate(ROUTES.GROCERIES)}>
              <Text style={styles.viewAllBtnText}>View all shops</Text>
              <Ionicons name="chevron-forward" size={14} color="#0F172A" />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Right Panel: Selected Shop & Product Grid ─────────── */}
        <View style={styles.rightPanel}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Selected Shop Header Card */}
            <View style={[styles.shopHeaderCard, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF' }]}>
              <TouchableOpacity style={styles.backCircle}>
                <Ionicons name="chevron-back" size={18} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareCircle}>
                <Ionicons name="share-outline" size={18} color="#0F172A" />
              </TouchableOpacity>

              <Image source={{ uri: selectedShop?.image || SHOP_IMAGES.freshMart }} style={styles.heroShopImg} resizeMode="contain" />

              <View style={styles.heroShopDetails}>
                <View style={styles.heroTitleRow}>
                  <Text style={[styles.heroShopName, { color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }]}>{selectedShop?.name || 'Local Shop'}</Text>
                  <View style={styles.superBadge}>
                    <Text style={styles.superBadgeText}>{selectedShop?.tag || 'Super Store'}</Text>
                  </View>
                </View>

                <Text style={styles.heroShopSub}>{selectedShop?.subtitle || 'Groceries & Daily Essentials'}</Text>

                <View style={styles.heroMetaRow}>
                  <Ionicons name="star" size={13} color="#EAB308" />
                  <Text style={styles.heroMetaText}>
                    {selectedShop?.rating || 4.6} • {selectedShop?.eta || '25 mins'} • {selectedShop?.dist || '0.3 km'}
                  </Text>
                </View>

                <View style={styles.freeDelPill}>
                  <Ionicons name="leaf-outline" size={12} color="#16A34A" />
                  <Text style={styles.freeDelText}>Free delivery on orders above ₹199</Text>
                </View>
              </View>
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
              {['All', 'Staples', 'Snacks', 'More'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: activeCategory === cat ? '#EAB308' : theme === 'dark' ? '#1E293B' : '#FFFFFF',
                      borderColor: activeCategory === cat ? '#EAB308' : '#E2E8F0',
                    },
                  ]}
                >
                  <Text style={[styles.catPillText, { color: activeCategory === cat ? '#FFFFFF' : theme === 'dark' ? '#F8FAFC' : '#334155' }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 2-Column Product Grid */}
            <View style={styles.productGrid}>
              {filteredProducts.map(prod => (
                <View key={String(prod.id)} style={[styles.prodCard, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF' }]}>
                  <Image source={{ uri: prod.image || PRODUCT_IMAGES.milk }} style={styles.prodImg} resizeMode="contain" />
                  <Text style={[styles.prodTitle, { color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>{prod.name}</Text>
                  <Text style={styles.prodUnit}>{prod.unit}</Text>

                  <View style={styles.prodBottomRow}>
                    <Text style={[styles.prodPrice, { color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }]}>₹{prod.price}</Text>
                    <TouchableOpacity
                      style={styles.addYellowBtn}
                      onPress={() => addToCart(prod as any)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.addYellowText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Sticky Cart Footer Bar */}
          {cartItems.length > 0 && (
            <View style={styles.stickyCartBar}>
              <View style={styles.cartBarLeft}>
                <Ionicons name="bag-handle" size={22} color="#EAB308" />
                <View>
                  <Text style={styles.cartBarTitle}>{cartItems.length} Items</Text>
                  <TouchableOpacity onPress={() => navigation.navigate(ROUTES.CART)}>
                    <Text style={styles.cartBarSub}>View Cart ›</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkoutYellowBtn}
                onPress={() => navigation.navigate(ROUTES.CHECKOUT, { fromCart: true })}
              >
                <Text style={styles.checkoutYellowText}>Checkout ₹{cartTotal}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 6 : 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 4 },
  logoRuvo: { fontSize: 22, fontWeight: '900', color: '#EAB308', letterSpacing: -0.5 },
  logoVo: { color: '#CA8A04' },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  locationText: { fontSize: 12, fontWeight: '600' },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  searchWrap: { paddingHorizontal: 12, paddingVertical: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  searchPlaceholder: { flex: 1, color: '#94A3B8', fontSize: 13 },

  splitBody: { flex: 1, flexDirection: 'row' },
  leftPanel: { width: '22%', borderRightWidth: 1, padding: 6 },
  rightPanel: { flex: 1, padding: 8 },
  catFilterBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FEF08A' },
  catFilterText: { flex: 1, fontSize: 11, color: '#64748B', fontWeight: '600' },

  panelHeader: { marginBottom: 8, paddingHorizontal: 4 },
  panelTitle: { fontSize: 14, fontWeight: '800' },
  panelSubtitle: { fontSize: 10, color: '#64748B', marginTop: 1 },

  shopItemCard: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
    flexDirection: 'column',
    alignItems: 'center',
  },
  shopItemImg: { width: 56, height: 56, marginBottom: 4 },
  shopItemInfo: { alignItems: 'center', width: '100%' },
  shopTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  shopItemName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  tagBadge: { backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginVertical: 2 },
  tagBadgeText: { fontSize: 9, fontWeight: '800', color: '#854D0E' },
  shopItemSub: { fontSize: 9, color: '#64748B', textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  metaText: { fontSize: 9, color: '#475569', fontWeight: '600' },
  distText: { fontSize: 9, color: '#94A3B8', marginTop: 1 },

  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginTop: 6,
    gap: 4,
  },
  viewAllBtnText: { fontSize: 11, fontWeight: '700', color: '#0F172A' },

  shopHeaderCard: { padding: 12, borderRadius: 14, marginBottom: 10, position: 'relative', alignItems: 'center' },
  backCircle: { position: 'absolute', top: 8, left: 8, padding: 6, backgroundColor: '#F1F5F9', borderRadius: 12 },
  shareCircle: { position: 'absolute', top: 8, right: 8, padding: 6, backgroundColor: '#F1F5F9', borderRadius: 12 },
  heroShopImg: { width: 70, height: 70, marginTop: 10 },
  heroShopDetails: { alignItems: 'center', marginTop: 6 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroShopName: { fontSize: 15, fontWeight: '900' },
  superBadge: { backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  superBadgeText: { fontSize: 9, fontWeight: '800', color: '#854D0E' },
  heroShopSub: { fontSize: 10, color: '#64748B', marginTop: 2 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroMetaText: { fontSize: 10, color: '#475569', fontWeight: '600' },
  freeDelPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  freeDelText: { fontSize: 9, fontWeight: '700', color: '#15803D' },

  categoryBar: { marginBottom: 10 },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  catPillText: { fontSize: 11, fontWeight: '700' },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prodCard: { width: '48%', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  prodImg: { width: '100%', height: 65, marginBottom: 4 },
  prodTitle: { fontSize: 11, fontWeight: '700' },
  prodUnit: { fontSize: 9, color: '#94A3B8', marginTop: 1 },
  prodBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  prodPrice: { fontSize: 12, fontWeight: '800' },
  addYellowBtn: { backgroundColor: '#FACC15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  addYellowText: { fontSize: 10, fontWeight: '800', color: '#713F12' },

  stickyCartBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBarTitle: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  cartBarSub: { color: '#EAB308', fontSize: 10, fontWeight: '700' },
  checkoutYellowBtn: { backgroundColor: '#FACC15', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  checkoutYellowText: { color: '#713F12', fontSize: 11, fontWeight: '800' },
});

export default NearbyShopsScreen;
