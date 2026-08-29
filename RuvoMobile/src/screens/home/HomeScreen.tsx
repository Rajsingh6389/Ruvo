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
import { useTheme } from '../../context/ThemeContext';
import { RuvoFirstOrderPromoBanner } from '../../components/premium/RuvoFirstOrderPromoBanner';
import { CATEGORIES, CATEGORY_IMAGES, SHOP_IMAGES, PRODUCT_IMAGES, GROCERY_IMAGES, getCategoryImage } from '../../assets/cloudinary';

const FETCHING_LABEL = 'Fetching location...';

export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, userId, token } = useAuth();
  const { theme, colors } = useTheme();
  const { location, isLoading: locationLoading } = useDeliveryLocation();

  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [nearbyProducts, setNearbyProducts] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const windowWidth = Dimensions.get('window').width;
  const isSmallScreen = windowWidth < 360;
  const isTablet = windowWidth >= 600;

  const locationText = locationLoading
    ? FETCHING_LABEL
    : getDeliveryLocationLabel(location);
  const isFetchingLocation = locationText === FETCHING_LABEL;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  useFocusEffect(
    React.useCallback(() => {
      if (userId && token) {
        getMyOrders(userId, token)
          .then((orders) => {
            const pending = orders.find(o =>
              !['DELIVERED', 'SHOP_REJECTED', 'CANCELLED'].includes(o.orderStatus || '')
            );
            setActiveOrder(pending || null);
          })
          .catch(() => {});
      }

      setShopsLoading(true);
      (location
        ? getNearbyShops(location.latitude, location.longitude, 5)
        : getShops())
        .then(async shops => {
          setNearbyShops(shops || []);
          try {
            const { getProductsByShop } = require('../../services/productService');
            const allProducts: any[] = [];
            for (const s of (shops || []).slice(0, 4)) {
              const prods = await getProductsByShop(s.id);
              if (Array.isArray(prods)) {
                allProducts.push(...prods.filter(p => p.isAvailable !== false));
              }
            }
            setNearbyProducts(allProducts.slice(0, 10));
          } catch (e) {}
        })
        .catch(() => {})
        .finally(() => setShopsLoading(false));
    }, [userId, token, location?.latitude, location?.longitude])
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F8FAFC' }]}>
      <StatusBar backgroundColor={theme === 'dark' ? '#1E293B' : '#FFFFFF'} barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF', borderBottomColor: theme === 'dark' ? '#334155' : '#E2E8F0' }]}>
        <View style={styles.headerTop}>
          {/* Logo */}
          <Text style={styles.logoText} numberOfLines={1}>
            <Text style={styles.logoR}>R</Text>
            <Text style={styles.logoU}>u</Text>
            <Text style={styles.logoVo}>Vo</Text>
          </Text>

          {/* Location pill */}
          <TouchableOpacity
            style={[styles.locationPill, { backgroundColor: theme === 'dark' ? '#334155' : '#FEF08A33' }]}
            onPress={() => setLocationPickerVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="location-sharp" size={14} color="#EAB308" />
            <View style={styles.locationPillText}>
              <Text style={styles.deliverToLabel} numberOfLines={1}>Deliver to</Text>
              <View style={styles.locationValueRow}>
                {isFetchingLocation && (
                  <ActivityIndicator size="small" color="#EAB308" style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.locationValue, { color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]} numberOfLines={1}>
                  {locationText}
                </Text>
                <Ionicons name="chevron-down" size={12} color={theme === 'dark' ? '#94A3B8' : '#64748B'} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Action icons */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.75}>
              <Ionicons name="notifications-outline" size={22} color={theme === 'dark' ? '#F8FAFC' : '#1A1A1A'} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.75}
              onPress={() => (navigation.navigate as any)(ROUTES.CART)}
            >
              <Ionicons name="bag-outline" size={22} color={theme === 'dark' ? '#F8FAFC' : '#1A1A1A'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F1F5F9' }, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search for shops or products..."
            placeholderTextColor="#94A3B8"
            style={[styles.searchInput, { color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.scanBtn}>
            <Ionicons name="mic-outline" size={18} color="#94A3B8" />
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
            style={[styles.activeOrderWidget, { backgroundColor: theme === 'dark' ? '#1E293B' : '#EFF6FF', borderColor: '#3B82F6' }]}
            activeOpacity={0.9}
            onPress={() => (navigation.navigate as any)('CustomerTracking', { orderId: activeOrder.id })}
          >
            <View style={styles.activeOrderIconBox}>
              <Ionicons name="bicycle" size={22} color="#3B82F6" />
            </View>
            <View style={styles.activeOrderDetails}>
              <Text style={[styles.activeOrderTitle, { color: theme === 'dark' ? '#F8FAFC' : '#1E293B' }]} numberOfLines={1}>
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
              onPress={() => (navigation.navigate as any)(ROUTES.GROCERIES)}
              activeOpacity={0.85}
            >
              <Text style={styles.heroBtnText}>Shop Now</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          {!isSmallScreen && (
            <View style={styles.heroRight}>
              <Image source={{ uri: GROCERY_IMAGES.groceryBag }} style={styles.heroImg} resizeMode="contain" />
            </View>
          )}
        </View>

        {/* ── 3D RuVo Mascot Coupon Banner ────────────────── */}
        <RuvoFirstOrderPromoBanner
          onPressBanner={() => (navigation.navigate as any)(ROUTES.GROCERIES)}
          onApplyCoupon={() => {
            (navigation.navigate as any)(ROUTES.GROCERIES);
          }}
        />

        {/* ── Shop by Category (Cloudinary Asset Powered) ──── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]}>Shop by Category</Text>
          <TouchableOpacity onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS)}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollRow}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF', borderColor: theme === 'dark' ? '#334155' : '#F1F5F9' }]}
              onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS, { category: cat.label })}
              activeOpacity={0.8}
            >
              <Image source={{ uri: cat.image }} style={styles.categoryImg} resizeMode="cover" />
              <Text style={[styles.categoryLabel, { color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]} numberOfLines={1}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Popular Stores Near You ───────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]}>Popular Stores Near You</Text>
          <TouchableOpacity onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS)}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storeScrollRow}
        >
          {shopsLoading ? (
            <ActivityIndicator color="#EAB308" style={{ marginHorizontal: 16, marginVertical: 20 }} />
          ) : nearbyShops.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme === 'dark' ? '#94A3B8' : '#64748B' }]}>No nearby stores found. Tap View All to explore available shops.</Text>
          ) : (
            nearbyShops.map(shop => {
              const shopImg = shop.logoUrl || shop.bannerUrl || getCategoryImage(shop.category || '') || SHOP_IMAGES.freshMart;
              return (
                <TouchableOpacity
                  key={String(shop.id)}
                  style={[styles.storeCard, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF', borderColor: theme === 'dark' ? '#334155' : '#F1F5F9' }]}
                  onPress={() => (navigation.navigate as any)(ROUTES.SHOP_DETAILS, { shopId: Number(shop.id) })}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: shopImg }} style={styles.storeImage} resizeMode="cover" />
                  <Text style={[styles.storeName, { color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]} numberOfLines={1}>{shop.name}</Text>
                  <View style={styles.storeMeta}>
                    <Text style={styles.storeTime} numberOfLines={1}>20–30 mins</Text>
                    <View style={styles.storeRating}>
                      <Ionicons name="star" size={10} color="#EAB308" />
                      <Text style={styles.storeRatingText}>4.5</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* ── Nearby Products ───────────────────────────────── */}
        {nearbyProducts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]}>Products Near You</Text>
              <TouchableOpacity onPress={() => (navigation.navigate as any)(ROUTES.GROCERIES)}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storeScrollRow}
            >
              {nearbyProducts.map(p => {
                const prodImg = p.imageUrl || PRODUCT_IMAGES.milk;
                return (
                  <TouchableOpacity
                    key={String(p.id)}
                    style={[styles.storeCard, { width: sw(124), padding: sw(8), backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF', borderColor: theme === 'dark' ? '#334155' : '#F1F5F9' }]}
                    onPress={() => (navigation.navigate as any)(ROUTES.PRODUCT_DETAILS, { product: p })}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: prodImg }} style={styles.prodThumbImg} resizeMode="contain" />
                    <Text style={[styles.storeName, { fontSize: sf(12), paddingTop: sh(6), color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]} numberOfLines={1}>{p.name}</Text>
                    <View style={[styles.storeMeta, { paddingBottom: sh(6) }]}>
                      <Text style={{ fontSize: sf(13), fontWeight: '800', color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }}>₹{p.sellingPrice || p.actualPrice}</Text>
                      {p.actualPrice > p.sellingPrice && (
                        <Text style={{ fontSize: sf(10), color: '#94A3B8', textDecorationLine: 'line-through' }}>₹{p.actualPrice}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Why RuVo Features ───────────────────────────── */}
        <View style={styles.whyRow}>
          {[
            { icon: '💵', label: 'Cash on Delivery' },
            { icon: '🏪', label: 'Shop Local' },
            { icon: '🎉', label: '0% Commission' },
          ].map(item => (
            <View key={item.label} style={[styles.whyChip, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF', borderColor: theme === 'dark' ? '#334155' : '#F1F5F9' }]}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              <Text style={[styles.whyLabel, { color: theme === 'dark' ? '#F8FAFC' : '#1A1A1A' }]} numberOfLines={2}>{item.label}</Text>
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
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 4 : 8, paddingBottom: 10, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  logoText: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  logoR: { color: '#EAB308' },
  logoU: { color: '#CA8A04' },
  logoVo: { color: '#EAB308' },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, flex: 1, maxWidth: 200 },
  locationPillText: { flex: 1 },
  deliverToLabel: { fontSize: 9, color: '#64748B', fontWeight: '600' },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locationValue: { fontSize: 12, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 4, position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', borderRadius: 7, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  searchBarFocused: { borderWidth: 1, borderColor: '#EAB308' },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  scanBtn: { padding: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  scrollContentTablet: { paddingHorizontal: 30 },

  activeOrderWidget: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, gap: 12 },
  activeOrderIconBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  activeOrderDetails: { flex: 1 },
  activeOrderTitle: { fontSize: 13, fontWeight: '800' },
  activeOrderStatus: { fontSize: 11, color: '#3B82F6', marginTop: 1 },

  heroBanner: { marginHorizontal: 16, marginTop: 14, marginBottom: 12, backgroundColor: '#1E293B', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  heroLeft: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#FACC15' },
  heroTitleSmall: { fontSize: 17 },
  heroSubTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  heroBody: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#CA8A04', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, alignSelf: 'flex-start', marginTop: 10 },
  heroBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  heroRight: { width: 75, height: 75 },
  heroImg: { width: '100%', height: '100%' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  viewAll: { fontSize: 12, fontWeight: '700', color: '#EAB308' },

  categoryScrollRow: { paddingHorizontal: 16, gap: 12 },
  categoryCard: { width: 85, alignItems: 'center', padding: 8, borderRadius: 14, borderWidth: 1 },
  categoryImg: { width: 50, height: 50, borderRadius: 10, marginBottom: 6 },
  categoryLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  storeScrollRow: { paddingHorizontal: 16, gap: 12 },
  storeCard: { width: 140, borderRadius: 14, padding: 8, borderWidth: 1 },
  storeImage: { width: '100%', height: 85, borderRadius: 10, marginBottom: 6 },
  storeName: { fontSize: 13, fontWeight: '800' },
  storeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  storeTime: { fontSize: 10, color: '#64748B' },
  storeRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  storeRatingText: { fontSize: 10, fontWeight: '700', color: '#EAB308' },
  prodThumbImg: { width: '100%', height: 75, borderRadius: 8 },

  emptyText: { fontSize: 12, paddingHorizontal: 16, marginVertical: 10 },

  whyRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 24, gap: 8 },
  whyChip: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 4 },
  whyLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
});

export default HomeScreen;
