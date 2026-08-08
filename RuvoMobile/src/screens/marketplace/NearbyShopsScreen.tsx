import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Geolocation from 'react-native-geolocation-service';

import { ROUTES } from '../../constants/routes';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/Card';
import { Layout } from '../../components/Layout';
import { getShops } from '../../services/shopService';
import type { Shop } from '../../types';
import type { RootStackParamList } from '../../types/navigation';

type UserLocation = { latitude: number; longitude: number };

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceInKm = (location: UserLocation, shop: Shop): number | null => {
  const latitude = Number(shop.latitude);
  const longitude = Number(shop.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const dLat = toRadians(latitude - location.latitude);
  const dLon = toRadians(longitude - location.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(location.latitude)) *
      Math.cos(toRadians(latitude)) *
      Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// "All Shops" + whatever categories actually exist in the fetched data —
// nothing hardcoded, so this stays correct as shop owners add new categories.
const buildCategoryList = (shops: Shop[]): string[] => {
  const seen = new Set<string>();
  shops.forEach(shop => {
    if (shop.category) seen.add(shop.category);
  });
  return ['All Shops', ...Array.from(seen).sort()];
};

const NearbyShopsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const [activeCategory, setActiveCategory] = useState('All Shops');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const loadShops = useCallback(async (isRefresh = false) => {
    isRefresh ? setIsRefreshing(true) : setIsLoading(true);
    try {
      setShops(await getShops());
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load shops', error);
      setLoadError('We could not load shops. Check your connection and try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    setIsFetchingLocation(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location permission',
            message: 'RuVo needs your location to show the nearest shops.',
            buttonNeutral: 'Ask me later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationDenied(true);
          setIsFetchingLocation(false);
          return;
        }
      }
      setLocationDenied(false);
      Geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsFetchingLocation(false);
        },
        error => {
          Alert.alert('Location error', error.message);
          setIsFetchingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
      );
    } catch (error) {
      Alert.alert('Location error', error instanceof Error ? error.message : 'Unexpected error');
      setIsFetchingLocation(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShops();
      fetchLocation();
    }, [loadShops, fetchLocation]),
  );

  const categories = useMemo(() => buildCategoryList(shops), [shops]);

  const visibleShops = useMemo(() => {
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

  const renderShop = (shop: Shop) => {
    const distance = userLocation ? getDistanceInKm(userLocation, shop) : null;

    return (
      <Card
        key={shop.id}
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
        <View style={styles.shopInfo}>
          <View style={styles.shopTitleRow}>
            <View style={styles.shopTitleContent}>
              <Text
                style={[styles.shopName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {shop.name}
              </Text>

              <Text style={[styles.shopCategory, { color: colors.primary }]}>
                {shop.category}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>
                0.1 km
              </Text>
            </View>
          </View>

          {shop.address ? (
            <Text
              style={[styles.shopAddress, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {shop.address}
            </Text>
          ) : null}

          <View style={styles.shopActionRow}>
            <View style={styles.shopNowPill}>
              <Ionicons name="bag-handle-outline" size={12} color={colors.primary} />
              <Text style={[styles.shopNowText, { color: colors.primary }]}>
                Shop Now
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.shopImageWrap}>
          {shop.logoUrl ? (
            <Image
              source={{ uri: shop.logoUrl }}
              style={styles.shopImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.shopImagePlaceholder}>
              <Ionicons name="storefront-outline" size={32} color={colors.primary} />
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <Layout>
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
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Nearest Shops</Text>
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole="button"
            style={[
              styles.locateBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={fetchLocation}
          >
            {isFetchingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="locate-outline" size={16} color={colors.primary} />
            )}
            <Text style={[styles.locateBtnText, { color: colors.primary }]}>
              {userLocation ? 'Update location' : 'Use my location'}
            </Text>
          </TouchableOpacity>
        </View>

        {locationDenied && (
          <View style={[styles.warnBanner, { backgroundColor: '#f59e0b1a', borderColor: '#f59e0b4d' }]}>
            <Ionicons name="location-outline" size={18} color="#f59e0b" />
            <Text style={styles.warnText}>
              Location permission denied — showing all shops unsorted.
            </Text>
          </View>
        )}

        {/* Category chips */}
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
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary + '1a' : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Promo banner */}
        {!bannerDismissed && (
          <View style={[styles.promoBanner, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="storefront" size={28} color={colors.primary} />
            <View style={styles.promoTextWrap}>
              <Text style={[styles.promoTitle, { color: colors.textPrimary }]}>
                Support Local. Shop Local.
              </Text>
              <Text style={[styles.promoSubtitle, { color: colors.textSecondary }]}>
                Get the best quality from shops near you.
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel="Dismiss local shopping message"
              hitSlop={8}
              onPress={() => setBannerDismissed(true)}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Shopping guidance — informational, not clickable */}
        {!isLoading && !loadError && visibleShops.length > 0 && (
          <>
            <View style={styles.discoveryCard}>
              <View style={styles.discoveryIconWrap}>
                <Ionicons name="cart-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.discoveryContent}>
                <Text style={[styles.discoveryTitle, { color: colors.primary }]}>
                  Find shops near you
                </Text>
                <Text style={[styles.discoveryText, { color: colors.textSecondary }]}>
                  Tap any shop to explore its products and offers.
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle-outline" size={24} color={colors.primary} />
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Shops near you
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Choose a shop to start shopping
                </Text>
              </View>
              <View style={styles.shopCountBadge}>
                <Text style={[styles.shopCountText, { color: colors.primary }]}>
                  {visibleShops.length} {visibleShops.length === 1 ? 'shop' : 'shops'}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* List */}
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

        {!isLoading && !loadError && visibleShops.length > 0 && (
          <>
            {/* Trust / value strip — informational */}
            <View style={styles.trustCard}>
              <View style={styles.trustIconWrap}>
                <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              </View>
              <View style={styles.trustContent}>
                <Text style={[styles.trustTitle, { color: colors.primary }]}>
                  Shop local with confidence
                </Text>
                <Text style={[styles.trustText, { color: colors.textSecondary }]}>
                  Discover nearby stores and explore what they have in stock.
                </Text>
              </View>
            </View>

            {/* How it works — informational */}
            <View style={styles.howSection}>
              <Text style={[styles.howTitle, { color: colors.textPrimary }]}>
                How it works
              </Text>

              <View style={styles.stepsRow}>
                <View style={styles.stepCard}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name="storefront-outline" size={23} color={colors.primary} />
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                    Choose a shop
                  </Text>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    Browse shops near you
                  </Text>
                </View>

                <Ionicons name="arrow-forward" size={18} color={colors.primary} style={styles.stepArrow} />

                <View style={styles.stepCard}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name="bag-handle-outline" size={23} color={colors.primary} />
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                    Explore products
                  </Text>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    See products and offers
                  </Text>
                </View>

                <Ionicons name="arrow-forward" size={18} color={colors.primary} style={styles.stepArrow} />

                <View style={styles.stepCard}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name="cart-outline" size={23} color={colors.primary} />
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                    Add to cart
                  </Text>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    Add items and order
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.localSupportPill}>
              <Ionicons name="heart-outline" size={17} color={colors.primary} />
              <Text style={[styles.localSupportText, { color: colors.primary }]}>
                Your support helps local businesses grow.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  title: { fontSize: 26, fontWeight: '700' },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    minHeight: 38,
    borderRadius: 20,
    borderWidth: 1,
  },
  locateBtnText: { fontSize: 12, fontWeight: '600' },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  warnText: { flex: 1, color: '#f59e0b', fontSize: 12 },
  chipRow: { gap: 8, paddingVertical: 4, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  promoTextWrap: { flex: 1 },
  promoTitle: { fontSize: 15, fontWeight: '700' },
  promoSubtitle: { fontSize: 12, marginTop: 2 },
  discoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    marginBottom: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#CFE8D2',
    backgroundColor: '#F1F8F2',
  },
  discoveryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    marginRight: 12,
  },
  discoveryContent: {
    flex: 1,
  },
  discoveryTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  discoveryText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  shopCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#E8F5E9',
  },
  shopCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  loading: { marginVertical: 32 },
  statusCard: {
    minHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  statusText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  retryBtn: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 20 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  shopCard: {
    height: 126,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  shopInfo: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 13,
    paddingTop: 10,
    paddingBottom: 9,
    paddingRight: 7,
    justifyContent: 'space-between',
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shopTitleContent: {
    flex: 1,
    minWidth: 0,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '800',
  },
  shopCategory: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  shopAddress: {
    fontSize: 10.5,
    marginTop: 2,
  },
  shopActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  shopNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 13,
    backgroundColor: '#E8F5E9',
  },
  shopNowText: {
    fontSize: 10,
    fontWeight: '800',
  },
  shopImageWrap: {
    width: 118,
    height: '100%',
    backgroundColor: '#F1F5F2',
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 4,
    borderRadius: 15,
    backgroundColor: '#F1F8F2',
    borderWidth: 1,
    borderColor: '#D8ECDC',
  },
  trustIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  trustContent: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  trustText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  howSection: {
    marginTop: 22,
  },
  howTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  stepCard: {
    flex: 1,
    minHeight: 145,
    padding: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#CFE8D2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    position: 'relative',
  },
  stepNumber: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2E7D32',
  },
  stepIconWrap: {
    width: 43,
    height: 43,
    borderRadius: 14,
    marginTop: 19,
    marginBottom: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  stepText: {
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  stepArrow: {
    alignSelf: 'center',
    marginHorizontal: 3,
  },
  localSupportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 13,
    marginBottom: 8,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CFE8D2',
    backgroundColor: '#FAFDFC',
  },
  localSupportText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

// Named `NearbyShopsScreen` to match the import in AppNavigator.tsx:
// import { NearbyShopsScreen } from '../screens/marketplace/NearbyShopsScreen';
export { NearbyShopsScreen };
export default NearbyShopsScreen;