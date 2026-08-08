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
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Layout } from '../../components/Layout';
import { TextInput } from '../../components/TextInput';
import { getShops } from '../../services/shopService';
import type { Shop } from '../../types';
import type { RootStackParamList } from '../../types/navigation';

type UserLocation = {
  latitude: number;
  longitude: number;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceInKm = (location: UserLocation, shop: Shop): number | null => {
  const latitude = Number(shop.latitude);
  const longitude = Number(shop.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const latitudeDifference = toRadians(latitude - location.latitude);
  const longitudeDifference = toRadians(longitude - location.longitude);
  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(location.latitude)) *
      Math.cos(toRadians(latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    6371 * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation))
  );
};

export const GroceriesScreen = () => {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [nearbyMode, setNearbyMode] = useState(false);

  const loadShops = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setShops(await getShops());
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load shops', error);
      setLoadError(
        'We could not load the shops. Check that the server is running and try again.',
      );
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

  const fetchNearbyShops = async () => {
    setIsFetchingLocation(true);

    try {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location permission',
            message: 'RuVo needs your location to show nearby shops.',
            buttonNeutral: 'Ask me later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          },
        );

        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Location permission denied',
            'Enable location permission to see nearby shops.',
          );
          setIsFetchingLocation(false);
          return;
        }
      }

      Geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setNearbyMode(true);
          setIsFetchingLocation(false);
        },
        error => {
          Alert.alert('Location error', error.message);
          setIsFetchingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 },
      );
    } catch (error) {
      Alert.alert(
        'Location error',
        error instanceof Error ? error.message : 'Unexpected error',
      );
      setIsFetchingLocation(false);
    }
  };

  const visibleShops = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const matchingShops = query
      ? shops.filter(shop =>
          [shop.name, shop.category, shop.address].some(value =>
            value?.toLowerCase().includes(query),
          ),
        )
      : shops;

    if (!nearbyMode || !userLocation) {
      return matchingShops;
    }

    return [...matchingShops].sort((firstShop, secondShop) => {
      const firstDistance =
        getDistanceInKm(userLocation, firstShop) ?? Number.POSITIVE_INFINITY;
      const secondDistance =
        getDistanceInKm(userLocation, secondShop) ?? Number.POSITIVE_INFINITY;
      return firstDistance - secondDistance;
    });
  }, [nearbyMode, searchText, shops, userLocation]);

  return (
    <Layout>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              loadShops(true);
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.titleIconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="basket-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              All Shops
            </Text>
          </View>
          <TextInput
            placeholder="Search shops, categories or locations"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.search}
          />
        </View>

        <View
          style={[
            styles.nearbyCard,
            { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
          ]}
        >
          <View style={styles.nearbyIconRow}>
            <Ionicons name="navigate-circle-outline" size={22} color={colors.primary} />
            <Text style={[styles.nearbyTitle, { color: colors.textPrimary }]}>
              Find shops near you
            </Text>
          </View>
          <Text
            style={[styles.nearbyDescription, { color: colors.textSecondary }]}
          >
            Use your current location to order the list by distance.
          </Text>
          <Button
            title="Fetch from near"
            onPress={fetchNearbyShops}
            loading={isFetchingLocation}
            style={styles.nearbyButton}
          />

          {userLocation ? (
            <View
              style={[styles.locationResult, { borderTopColor: colors.border }]}
            >
              <View style={styles.locationFoundRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text
                  style={[styles.locationText, { color: colors.textPrimary }]}
                >
                  Current location found
                </Text>
              </View>
              <Text
                style={[
                  styles.locationCoordinates,
                  { color: colors.textSecondary },
                ]}
              >
                {userLocation.latitude.toFixed(4)},{' '}
                {userLocation.longitude.toFixed(4)}
              </Text>
              <TouchableOpacity onPress={() => setNearbyMode(false)}>
                <Text style={[styles.showAllText, { color: colors.primary }]}>
                  Show all shops
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              All Shops
            </Text>
            {!isLoading && !loadError ? (
              <Text style={[styles.shopCount, { color: colors.textSecondary }]}>
                {visibleShops.length} found
              </Text>
            ) : null}
          </View>

          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loading}
            />
          ) : loadError ? (
            <View
              style={[
                styles.statusCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="cloud-offline-outline" size={36} color={colors.textSecondary} />
              <Text
                style={[styles.statusText, { color: colors.textSecondary }]}
              >
                {loadError}
              </Text>
              <Button
                title="Try again"
                variant="outline"
                onPress={() => {
                  loadShops();
                }}
              />
            </View>
          ) : visibleShops.length === 0 ? (
            <View
              style={[
                styles.statusCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="storefront-outline" size={36} color={colors.textSecondary} />
              <Text
                style={[styles.statusText, { color: colors.textSecondary }]}
              >
                {searchText
                  ? 'No shops match your search.'
                  : shops.length === 0
                  ? 'No shops have been registered yet. Be the first shop owner to join RuVo.'
                  : nearbyMode
                  ? 'No nearby shops have location details yet. Show all shops or register a local shop.'
                  : 'No shops are available right now.'}
              </Text>
              {!searchText && (
                <Button
                  title="Register the first shop"
                  onPress={() => navigation.navigate(ROUTES.REGISTER_SHOP)}
                />
              )}
            </View>
          ) : (
            visibleShops.map(shop => {
              const distance =
                userLocation && nearbyMode
                  ? getDistanceInKm(userLocation, shop)
                  : null;

              return (
                <Card
                  key={shop.id}
                  style={styles.shopCard}
                  onPress={() =>
                    navigation.navigate(ROUTES.SHOP_DETAILS, {
                      shopId: Number(shop.id),
                    })
                  }
                >
                  <View style={styles.shopRow}>
                    <View style={[styles.logoWrap, { backgroundColor: colors.surface }]}>
                      {shop.logoUrl ? (
                        <Image source={{ uri: shop.logoUrl }} style={styles.logo} resizeMode="cover" />
                      ) : (
                        <Ionicons name="storefront-outline" size={22} color={colors.textSecondary} />
                      )}
                    </View>

                    <View style={styles.shopCopy}>
                      <View style={styles.shopTitleRow}>
                        <Text
                          style={[styles.shopTitle, { color: colors.textPrimary }]}
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
                      <Text
                        style={[styles.shopCategory, { color: colors.primary }]}
                        numberOfLines={1}
                      >
                        {shop.category}
                      </Text>

                      <View style={styles.metaRow}>
                        {typeof shop.rating === 'number' && (
                          <View style={styles.metaItem}>
                            <Ionicons name="star" size={12} color="#f59e0b" />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                              {shop.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                        {shop.deliveryAvailable && (
                          <View style={styles.metaItem}>
                            <Ionicons name="bicycle-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                              Delivery
                            </Text>
                          </View>
                        )}
                        {distance !== null && (
                          <View style={styles.metaItem}>
                            <Ionicons name="navigate-outline" size={12} color="#22c55e" />
                            <Text style={[styles.metaText, { color: '#22c55e', fontWeight: '700' }]}>
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
            })
          )}
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    paddingTop: 20,
    paddingVertical: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  titleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  search: {
    marginBottom: 8,
  },
  nearbyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  nearbyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nearbyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  nearbyDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  nearbyButton: {
    alignSelf: 'flex-start',
  },
  locationResult: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  locationFoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationCoordinates: {
    fontSize: 13,
    marginTop: 2,
  },
  showAllText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  shopCount: {
    fontSize: 13,
  },
  loading: {
    marginVertical: 28,
  },
  statusCard: {
    minHeight: 112,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  statusText: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  shopCard: {
    marginVertical: 6,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  shopCopy: {
    flex: 1,
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shopTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  shopCategory: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
  },
  shopAddress: {
    fontSize: 13,
    marginTop: 4,
  },
});