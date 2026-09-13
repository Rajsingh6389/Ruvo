import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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

import { RuvoBanner } from '../../components/premium/RuvoBanner';
import { getStandardBanners, getOnboardBanners, getFirstOrderBanners } from '../../assets/cloudinary/banners';
import { CATEGORIES, PRODUCT_IMAGES } from '../../assets/cloudinary';

const ruvoLogo = require('../../../assets/images/RuvoMobileLogo.png');
const ruvoIcon = require('../../../assets/images/RuvoIcon.png');
import {
  SectionHeader,
  ShopCard,
  ProductCard,
  CategoryCard,
  EmptyState,
  LoadingState,
} from '../../components/design-system';

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
  const [nearbyProducts, setNearbyProducts] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const tabBarHeight = useBottomTabBarHeight();

  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = screenWidth < 360 ? 12 : 16;
  const shopCardWidth = Math.min(208, Math.max(168, screenWidth * 0.52));
  const productCardWidth = Math.min(164, Math.max(138, screenWidth * 0.4));

  const locationText = locationLoading
    ? FETCHING_LABEL
    : getDeliveryLocationLabel(location);
  const isFetchingLocation = locationText === FETCHING_LABEL;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = React.useCallback(async () => {
    // Fetch active orders
    if (userId && token) {
      getMyOrders(userId, token)
        .then((orders) => {
          const pending = orders.find(o =>
            !['DELIVERED', 'SHOP_REJECTED', 'CANCELLED', 'CANCELLED_BY_USER', 'CANCELLED_BY_SHOP', 'SHOP_TIMEOUT', 'CANCELLED_SHOP_TIMEOUT', 'CANCELLED_NO_PARTNER_FOUND', 'FAILED', 'PAYMENT_FAILED'].includes(o.orderStatus || '')
          );
          setActiveOrder(pending || null);
        })
        .catch(() => {});
    }

    setShopsLoading(true);
    let result: Shop[] = [];
    if (location?.latitude && location?.longitude) {
      try {
        result = await getNearbyShops(location.latitude, location.longitude, 50);
      } catch (e) {}
    }
    if (!result || result.length === 0) {
      try {
        result = await getShops();
      } catch (e) {}
    }
    setNearbyShops(result || []);
    try {
      const { getProductsByShop } = require('../../services/productService');
      const allProducts: any[] = [];
      for (const s of (result || []).slice(0, 6)) {
        const prods = await getProductsByShop(s.id);
        if (Array.isArray(prods)) {
          allProducts.push(...prods.filter(p => p.isAvailable !== false));
        }
      }
      setNearbyProducts(allProducts.slice(0, 10));
    } catch (e) {}
    setShopsLoading(false);
  }, [userId, token, location?.latitude, location?.longitude]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  }, [loadHomeData]);

  useFocusEffect(
    React.useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View className="bg-ruvo-surface border-b border-ruvo-border px-3 pt-2 pb-3">
        {/* Logo and Location Row */}
        <View className="flex-row items-center justify-between mb-sm">
          {/* Prominent Large Top-Left RuVo Icon */}
          <View style={{ marginRight: 8 }}>
            <Image
              source={ruvoIcon}
              style={{ width: 54, height: 54, borderRadius: 14, resizeMode: 'contain' }}
            />
          </View>

          {/* Location Pill */}
          <Pressable
            onPress={() => setLocationPickerVisible(true)}
            className="flex-row items-center gap-xs px-md py-2 bg-ruvo-bg border border-ruvo-border rounded-xl flex-1 mx-sm"
          >
            <Ionicons name="location-sharp" size={16} color="#FF8A00" />
            <View className="flex-1">
              <Text className="text-[10px] text-warm-600 font-medium">Deliver to</Text>
              <View className="flex-row items-center gap-xs">
                {isFetchingLocation && (
                  <ActivityIndicator size="small" color="#FF8A00" />
                )}
                <Text className="text-xs font-bold text-ruvo-ink flex-1" numberOfLines={1}>
                  {locationText}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#77736B" />
              </View>
            </View>
          </Pressable>

          {/* Notification Icon */}
          <Pressable
            className="relative p-2"
            onPress={() => (navigation.navigate as any)(ROUTES.NOTIFICATIONS)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={24} color="#171A1F" />
            <View className="absolute top-1 right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
              <Text className="text-white text-[9px] font-bold">3</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Top Navigator Tabs (Groceries, Accessories, Dineout, Scenes with Cloudinary Images) ── */}
        {/* Swiggy-Style 3D Tilted Vertical Category Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2 mt-2"
          contentContainerStyle={{ gap: 14, paddingHorizontal: 4, paddingVertical: 8 }}
        >
          {/* Food & Dining */}
          <Pressable
            onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS)}
            style={{
              alignItems: 'center',
              width: 76,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                backgroundColor: '#FFF4E5',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: '#FF8A00',
                elevation: 4,
                shadowColor: '#FF8A00',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                transform: [{ perspective: 400 }, { rotateX: '12deg' }, { rotateY: '-6deg' }],
              }}
            >
              <Image
                source={{ uri: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessorybag.jpg' }}
                style={{ width: 56, height: 56, borderRadius: 16, resizeMode: 'cover' }}
              />
            </View>
            <Text numberOfLines={1} style={{ color: '#171A1F', fontWeight: '800', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
              Food
            </Text>
          </Pressable>

          {/* Groceries (Instamart) */}
          <Pressable
            onPress={() => (navigation.navigate as any)(ROUTES.GROCERIES)}
            style={{
              alignItems: 'center',
              width: 76,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                backgroundColor: '#E8F8EE',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#22C55E',
                elevation: 4,
                shadowColor: '#22C55E',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                transform: [{ perspective: 400 }, { rotateX: '12deg' }, { rotateY: '-4deg' }],
              }}
            >
              <Image
                source={{ uri: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg' }}
                style={{ width: 56, height: 56, borderRadius: 16, resizeMode: 'cover' }}
              />
              <View style={{ position: 'absolute', bottom: -6, backgroundColor: '#22C55E', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 8 }}>EXPRESS</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={{ color: '#171A1F', fontWeight: '800', fontSize: 11, marginTop: 10, textAlign: 'center' }}>
              Groceries
            </Text>
          </Pressable>

          {/* Accessories */}
          <Pressable
            onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS, { category: 'Accessories' })}
            style={{
              alignItems: 'center',
              width: 76,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                elevation: 3,
                shadowColor: '#171A1F',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 5,
                transform: [{ perspective: 400 }, { rotateX: '10deg' }, { rotateY: '4deg' }],
              }}
            >
              <Image
                source={{ uri: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787657146/ce1254b8-af09-41a6-b5a7-003d3db58941.png' }}
                style={{ width: 56, height: 56, borderRadius: 16, resizeMode: 'cover' }}
              />
            </View>
            <Text numberOfLines={1} style={{ color: '#171A1F', fontWeight: '700', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
              Accessories
            </Text>
          </Pressable>

          {/* Dineout */}
          <Pressable
            onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS, { category: 'Cafe' })}
            style={{
              alignItems: 'center',
              width: 76,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                backgroundColor: '#FFF0F5',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#FBCFE8',
                elevation: 3,
                shadowColor: '#EC4899',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 5,
                transform: [{ perspective: 400 }, { rotateX: '10deg' }, { rotateY: '6deg' }],
              }}
            >
              <Image
                source={{ uri: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787828141/0858b8b6-7274-4c08-9d69-5256a5d3ce9b.png' }}
                style={{ width: 56, height: 56, borderRadius: 16, resizeMode: 'cover' }}
              />
            </View>
            <Text numberOfLines={1} style={{ color: '#171A1F', fontWeight: '700', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
              Dineout
            </Text>
          </Pressable>
        </ScrollView>

        {/* Search Bar Button */}
        <Pressable 
          onPress={() => (navigation.navigate as any)(ROUTES.SEARCH)}
          className="flex-row items-center bg-ruvo-bg border border-ruvo-border rounded-xl px-md py-2 gap-sm"
        >
          <Ionicons name="search-outline" size={18} color="#77736B" />
          <Text className="flex-1 text-sm text-warm-600">
            Search shops, products...
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: tabBarHeight + (activeOrder ? 80 : 20) }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F4B400']} />
        }
      >
        {/* ── Shop by Category ──── */}
      

        {/* ── Growth Banners (Shop & Partner) ─────────────── */}
        <RuvoBanner
          data={getOnboardBanners()}
        />

          <SectionHeader
          title="Shop by Category"
          showViewAll
          onViewAllPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS)}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 12 }}
        >
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS, { category: cat.label })}
            >
              <CategoryCard
                name={cat.label}
                image={cat.image}
                onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS, { category: cat.label })}
              />
            </Pressable>
          ))}
        </ScrollView>

        {/* ── First Order Offer ───────────────────────────── */}
       

        {/* ── Popular Stores Near You ───────────────────────── */}
        <SectionHeader
          title="Popular Stores Near You"
          showViewAll
          onViewAllPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS)}
        />

        {shopsLoading ? (
          <LoadingState message="Loading nearby shops..." />
        ) : nearbyShops.length === 0 ? (
          <EmptyState
            icon="storefront"
            title="No shops found"
            subtitle="Tap View All to explore available shops in your area"
            action={{
              label: 'Browse Shops',
              onPress: () => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS),
            }}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 12 }}
          >
            {nearbyShops.slice(0, 6).map(shop => {
              let calcDistance: number | undefined = undefined;
              if (location?.latitude && location?.longitude && shop.latitude && shop.longitude) {
                const R = 6371; // km
                const dLat = (shop.latitude - location.latitude) * (Math.PI / 180);
                const dLon = (shop.longitude - location.longitude) * (Math.PI / 180);
                const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(location.latitude * (Math.PI / 180)) *
                    Math.cos(shop.latitude * (Math.PI / 180)) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                calcDistance = R * c;
              }
              return (
                <View key={String(shop.id)} style={{ width: shopCardWidth }}>
                  <ShopCard
                    shop={shop}
                    onPress={() => (navigation.navigate as any)(ROUTES.SHOP_DETAILS, { shopId: Number(shop.id) })}
                    showDistance={true}
                    distance={calcDistance}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
         <RuvoBanner
          data={getFirstOrderBanners()}
          
        />
        {/* ── Nearby Products ───────────────────────────────── */}
        {nearbyProducts.length > 0 && (
          <>
            <SectionHeader
              title="Products Near You"
              showViewAll
              onViewAllPress={() => (navigation.navigate as any)(ROUTES.GROCERIES)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 12 }}
            >
              {nearbyProducts.map(p => {
                const prodImg = p.imageUrl || PRODUCT_IMAGES.milk;
                return (
                  <View key={String(p.id)} style={{ width: productCardWidth }}>
                    <ProductCard
                      product={{
                        ...p,
                        image: prodImg,
                        price: p.sellingPrice || p.actualPrice,
                        originalPrice: p.actualPrice,
                      }}
                      onPress={() => (navigation.navigate as any)(ROUTES.PRODUCT_DETAILS, { product: p })}
                      showDiscount
                    />
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}



        {/* ── Why RuVo Features ───────────────────────────── */}
      
      </ScrollView>

      {/* ── Floating Active Order Widget (Above Tab Navigator) ─────────────────── */}
      {activeOrder && (
        <View style={{ position: 'absolute', bottom: tabBarHeight + 12, left: 12, right: 12, zIndex: 100 }}>
          <Pressable
            onPress={() => (navigation.navigate as any)(ROUTES.CUSTOMER_TRACKING, { orderId: activeOrder.id })}
            style={{
              backgroundColor: '#FF7A00',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#FF7A00',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 8,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="bicycle" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Active Order #{activeOrder.id}
                  </Text>
                  <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 10 }}>
                    <Text style={{ color: '#FF7A00', fontWeight: '900', fontSize: 9 }}>LIVE</Text>
                  </View>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                  {activeOrder.orderStatus?.replace(/_/g, ' ') || 'Order in progress'} • ₹{activeOrder.totalAmount}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }}>
              <Text style={{ color: '#FF7A00', fontWeight: '900', fontSize: 12 }}>Track</Text>
              <Ionicons name="chevron-forward" size={14} color="#FF7A00" />
            </View>
          </Pressable>
        </View>
      )}

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
