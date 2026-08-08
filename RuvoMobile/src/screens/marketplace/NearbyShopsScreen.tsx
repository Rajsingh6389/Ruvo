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
        style={styles.shopCard}
        onPress={() =>
          navigation.navigate(ROUTES.SHOP_DETAILS, { shopId: Number(shop.id) })
        }
      >
        <View style={styles.shopRow}>
          <View style={[styles.logoWrap, { backgroundColor: colors.surface }]}>
            {shop.logoUrl ? (
              <Image source={{ uri: shop.logoUrl }} style={styles.logo} resizeMode="cover" />
            ) : (
              <Ionicons name="storefront-outline" size={24} color={colors.textSecondary} />
            )}
          </View>

          <View style={styles.shopBody}>
            <View style={styles.shopTitleRow}>
              <Text
                style={[styles.shopName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {shop.name}
              </Text>
              {shop.approved === false && (
                <View style={[styles.pendingBadge, { backgroundColor: '#f59e0b22' }]}>
                  <Text style={[styles.pendingText, { color: '#f59e0b' }]}>Pending</Text>
                </View>
              )}
            </View>

            {shop.category ? (
              <Text style={[styles.shopCategory, { color: colors.primary }]} numberOfLines={1}>
                {shop.category}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              {typeof shop.rating === 'number' && (
                <View style={styles.metaItem}>
                  <Ionicons name="star" size={13} color="#f59e0b" />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {shop.rating.toFixed(1)}
                  </Text>
                </View>
              )}
              {shop.deliveryAvailable && (
                <View style={styles.metaItem}>
                  <Ionicons name="bicycle-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    Delivery
                  </Text>
                </View>
              )}
              {distance !== null && (
                <View style={styles.metaItem}>
                  <Ionicons name="navigate-outline" size={13} color="#22c55e" />
                  <Text style={[styles.metaText, { color: '#22c55e', fontWeight: '600' }]}>
                    {distance.toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>

            {shop.address ? (
              <Text
                style={[styles.shopAddress, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {shop.address}
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
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
            style={[styles.locateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
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
            <TouchableOpacity onPress={() => setBannerDismissed(true)}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
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
  shopCard: { marginBottom: 10 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  shopBody: { flex: 1 },
  shopTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shopName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  pendingBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  pendingText: { fontSize: 10, fontWeight: '700' },
  shopCategory: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12 },
  shopAddress: { fontSize: 12, marginTop: 4 },
});

// Named `NearbyShopsScreen` to match the import in AppNavigator.tsx:
// import { NearbyShopsScreen } from '../screens/marketplace/NearbyShopsScreen';
export { NearbyShopsScreen };
export default NearbyShopsScreen;