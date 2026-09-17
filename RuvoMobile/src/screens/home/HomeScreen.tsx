import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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

// ── Premium Home Header Navigation ───────────────────────────────────────────
const HOME_NAV_ITEMS = [
  {
    id: 'food',
    label: 'Food',
    image: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessorybag.jpg',
    route: ROUTES.NEARBY_SHOPS,
    params: undefined,
    badge: undefined,
  },
  {
    id: 'groceries',
    label: 'Groceries',
    image: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg',
    route: ROUTES.GROCERIES,
    params: undefined,
    badge: 'EXPRESS',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    image: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787657146/ce1254b8-af09-41a6-b5a7-003d3db58941.png',
    route: ROUTES.NEARBY_SHOPS,
    params: { category: 'Accessories' },
    badge: undefined,
  },
  {
    id: 'dineout',
    label: 'Dineout',
    image: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787828141/0858b8b6-7274-4c08-9d69-5256a5d3ce9b.png',
    route: ROUTES.NEARBY_SHOPS,
    params: { category: 'Cafe' },
    badge: undefined,
  },
] as const;


export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, userId, token } = useAuth();
  const { colors, theme: activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
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
  const [activeNavItem, setActiveNavItem] = useState(0);

  // Header background animation — subtle light movement, not a distracting color flash.
  const headerGlow1 = useRef(new Animated.Value(0)).current;
  const headerGlow2 = useRef(new Animated.Value(0)).current;
  const headerGlow3 = useRef(new Animated.Value(0)).current;

  // Top navigation item press animation.
  const navScales = useRef(
    HOME_NAV_ITEMS.map((_, index) => new Animated.Value(index === 0 ? 1.05 : 1))
  ).current;

  useEffect(() => {
    const glow1 = Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow1, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.timing(headerGlow1, { toValue: 0, duration: 5200, useNativeDriver: true }),
      ])
    );

    const glow2 = Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow2, { toValue: 1, duration: 7000, useNativeDriver: true }),
        Animated.timing(headerGlow2, { toValue: 0, duration: 7000, useNativeDriver: true }),
      ])
    );

    const glow3 = Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow3, { toValue: 1, duration: 4300, useNativeDriver: true }),
        Animated.timing(headerGlow3, { toValue: 0, duration: 4300, useNativeDriver: true }),
      ])
    );

    glow1.start();
    glow2.start();
    glow3.start();

    return () => {
      glow1.stop();
      glow2.stop();
      glow3.stop();
    };
  }, [headerGlow1, headerGlow2, headerGlow3]);

  const selectNavItem = (index: number) => {
    setActiveNavItem(index);

    navScales.forEach((scale, i) => {
      Animated.spring(scale, {
        toValue: i === index ? 1.05 : 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }).start();
    });
  };

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
          allProducts.push(...prods.filter(p => p.isAvailable !== false).map(p => ({ ...p, shopName: s.name })));
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={isDark ? colors.surface : '#FFFFFF'} barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header with U-Shaped Orange Rounded Background ─────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: '#FF6B35',
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 16,
          elevation: 8,
          shadowColor: '#FF6B35',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ── Animated orange ambient background ─────────────────────────────── */}
        <View
          pointerEvents="none"
          style={{
            ...(StyleSheet.absoluteFill as any),
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: 'rgba(255, 214, 170, 0.24)',
              top: -155,
              left: -75,
              opacity: headerGlow1.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
              transform: [
                {
                  translateX: headerGlow1.interpolate({ inputRange: [0, 1], outputRange: [-20, 100] }),
                },
                {
                  translateY: headerGlow1.interpolate({ inputRange: [0, 1], outputRange: [15, -35] }),
                },
                {
                  scale: headerGlow1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }),
                },
              ],
            }}
          />

          <Animated.View
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: 130,
              backgroundColor: 'rgba(207, 49, 5, 0.20)',
              right: -100,
              bottom: -150,
              opacity: headerGlow2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
              transform: [
                {
                  translateX: headerGlow2.interpolate({ inputRange: [0, 1], outputRange: [80, -50] }),
                },
                {
                  translateY: headerGlow2.interpolate({ inputRange: [0, 1], outputRange: [-25, 45] }),
                },
                {
                  scale: headerGlow2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                },
              ],
            }}
          />

          <Animated.View
            style={{
              position: 'absolute',
              width: 135,
              height: 135,
              borderRadius: 68,
              backgroundColor: 'rgba(255, 247, 237, 0.14)',
              top: 42,
              left: '43%',
              opacity: headerGlow3.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] }),
              transform: [
                {
                  translateX: headerGlow3.interpolate({ inputRange: [0, 1], outputRange: [-35, 55] }),
                },
                {
                  translateY: headerGlow3.interpolate({ inputRange: [0, 1], outputRange: [20, -25] }),
                },
              ],
            }}
          />
        </View>
        {/* Logo and Location Row */}
        <View className="flex-row items-center justify-between mb-sm">
          {/* Prominent Large Top-Left RuVo Icon */}
          <View style={{ marginRight: 8, backgroundColor: '#FFFFFF', padding: 2, borderRadius: 16, elevation: 4 }}>
            <Image
              source={ruvoIcon}
              style={{ width: 50, height: 50, borderRadius: 14, resizeMode: 'contain' }}
            />
          </View>

          {/* Location Pill */}
          <Pressable
            onPress={() => setLocationPickerVisible(true)}
            style={{
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              borderColor: isDark ? colors.border : '#FFE4D6',
            }}
            className="flex-row items-center gap-xs px-md py-2 border rounded-full flex-1 mx-sm shadow-sm"
          >
            <Ionicons name="location-sharp" size={18} color="#FF6B35" />
            <View className="flex-1">
              <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Deliver to</Text>
              <View className="flex-row items-center gap-xs">
                {isFetchingLocation && (
                  <ActivityIndicator size="small" color="#FF6B35" />
                )}
                <Text style={{ color: colors.textPrimary }} className="text-xs font-extrabold flex-1" numberOfLines={1}>
                  {locationText}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </View>
            </View>
          </Pressable>

          {/* Notification Icon */}
          <Pressable
            className="relative p-2"
            onPress={() => (navigation.navigate as any)(ROUTES.NOTIFICATIONS)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            </View>
            <View className="absolute top-1 right-1 bg-white rounded-full w-4 h-4 items-center justify-center border border-orange-600">
              <Text style={{ color: '#FF6B35' }} className="text-[9px] font-black">3</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Premium service carousel ───────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={{
            gap: 10,
            paddingHorizontal: 6,
            paddingVertical: 8,
          }}
        >
          {HOME_NAV_ITEMS.map((item, index) => {
            const isActive = activeNavItem === index;

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  selectNavItem(index);
                  (navigation.navigate as any)(item.route, item.params);
                }}
                onPressIn={() => {
                  Animated.spring(navScales[index], {
                    toValue: 0.95,
                    friction: 7,
                    useNativeDriver: true,
                  }).start();
                }}
                onPressOut={() => {
                  Animated.spring(navScales[index], {
                    toValue: isActive ? 1.05 : 1,
                    friction: 7,
                    tension: 80,
                    useNativeDriver: true,
                  }).start();
                }}
                style={{
                  width: 78,
                  alignItems: 'center',
                }}
              >
                <Animated.View
                  style={{
                    alignItems: 'center',
                    transform: [{ scale: navScales[index] }],
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 22,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isActive ? '#FFF0E9' : 'rgba(255,255,255,0.55)',
                      shadowColor: '#8F2E0D',
                      shadowOffset: { width: 0, height: isActive ? 7 : 4 },
                      shadowOpacity: isActive ? 0.28 : 0.15,
                      shadowRadius: isActive ? 9 : 6,
                      elevation: isActive ? 8 : 4,
                    }}
                  >
                    <Image
                      source={{ uri: item.image }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 18,
                        resizeMode: 'cover',
                      }}
                    />

                    {item.badge && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: -6,
                          backgroundColor: '#16A34A',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#FFFFFF',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 7.5 }}>
                          {item.badge}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#FFFFFF',
                      fontWeight: '900',
                      fontSize: 11,
                      marginTop: item.badge ? 9 : 7,
                      textAlign: 'center',
                    }}
                  >
                    {item.label}
                  </Text>

                  <View
                    style={{
                      marginTop: 5,
                      width: isActive ? 20 : 5,
                      height: 4,
                      borderRadius: 4,
                      backgroundColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                    }}
                  />
                </Animated.View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search Bar Button */}
        <Pressable
          onPress={() => (navigation.navigate as any)(ROUTES.SEARCH)}
          style={{
            height: 52,
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderRadius: 18,
            borderWidth: 1,
            borderColor: isDark ? colors.border : 'rgba(255,255,255,0.9)',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            shadowColor: '#8F2E0D',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.16,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <Ionicons name="search-outline" size={21} color="#FF6B35" />

          <Text
            style={{
              flex: 1,
              marginLeft: 10,
              color: colors.textSecondary,
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            Search shops, products...
          </Text>

          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 11,
              backgroundColor: isDark ? colors.surfaceSunken : '#FFF1EB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="options-outline" size={17} color="#FF6B35" />
          </View>
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

        {/* ── Shop by Category (White Background Container with Rounded Selection Items) ──── */}
        <View 
          style={{ 
            backgroundColor: isDark ? colors.surface : '#FFFFFF', 
            borderColor: isDark ? colors.border : '#EAF0F6',
            borderWidth: 1.5,
            borderRadius: 24, 
            marginVertical: 14,
            paddingVertical: 16,
            paddingHorizontal: 14,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          {/* Header Inside White Box */}
          <View className="flex-row items-center justify-between mb-3.5 px-1">
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontFamily: 'Poppins_800ExtraBold' }}>
                Shop by Category
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Poppins_600SemiBold', marginTop: 1 }}>
                Explore top categories near you
              </Text>
            </View>

            <Pressable 
              onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS)}
              style={{ backgroundColor: '#FF6B35' }}
              className="flex-row items-center gap-1 px-3.5 py-1.5 rounded-full shadow-sm"
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins_800ExtraBold' }}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* 3D Tilted Category List inside White Background */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingHorizontal: 2, paddingVertical: 4 }}
          >
            {CATEGORIES.map((cat, index) => {
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS, { category: cat.label })}
                  style={{ alignItems: 'center', width: 76 }}
                >
                  <View
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      backgroundColor: isDark ? colors.surfaceSunken : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2.5,
                      borderColor: '#FF6B35',
                      overflow: 'hidden',
                      elevation: 4,
                      shadowColor: '#FF6B35',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.18,
                      shadowRadius: 5,
                    }}
                  >
                    <Image
                      source={{ uri: cat.image }}
                      style={{ width: '100%', height: '100%', borderRadius: 35, resizeMode: 'cover' }}
                    />
                  </View>
                  <Text 
                    numberOfLines={1} 
                    style={{ color: colors.textPrimary, fontFamily: 'Poppins_800ExtraBold', fontSize: 11, marginTop: 8, textAlign: 'center' }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

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

        {/* ── RuVo Why Us Animated Carousel ───────────────── */}
        <RuvoFeatureCarousel />

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
                  <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_800ExtraBold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Active Order #{activeOrder.id}
                  </Text>
                  <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 10 }}>
                    <Text style={{ color: '#FF7A00', fontFamily: 'Poppins_800ExtraBold', fontSize: 9 }}>LIVE</Text>
                  </View>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.92)', fontFamily: 'Poppins_700Bold', fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                  {activeOrder.orderStatus?.replace(/_/g, ' ') || 'Order in progress'} • ₹{activeOrder.totalAmount}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }}>
              <Text style={{ color: '#FF7A00', fontFamily: 'Poppins_800ExtraBold', fontSize: 12 }}>Track</Text>
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

// ── RuVo Why Us Feature Carousel (styled like Products Near You section) ──
const RUVO_FEATURES = [
  { id: 'cod',      icon: 'cash-outline'      as const, label: 'Cash on Delivery',       desc: 'Pay at your door — Cash or UPI accepted.',          accent: '#FF7A00' },
  { id: 'speed',    icon: 'flash-outline'     as const, label: '15-Min Local Delivery',   desc: 'Fresh from nearby stores in minutes.',               accent: '#16A34A' },
  { id: 'shop',     icon: 'storefront-outline' as const, label: 'Zero Onboarding Fee',    desc: 'Local shops go digital with 0% setup cost.',         accent: '#2563EB' },
  { id: 'quality',  icon: 'ribbon-outline'    as const, label: '100% Authentic Products', desc: 'Sourced directly from verified local merchants.',     accent: '#D97706' },
];

const RuvoFeatureCarousel: React.FC = () => {
  const { colors, theme: activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const [idx, setIdx] = useState(0);
  const fade  = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 0,   duration: 280, useNativeDriver: true }),
        Animated.timing(slide, { toValue: -12, duration: 280, useNativeDriver: true }),
      ]).start(() => {
        setIdx(p => (p + 1) % RUVO_FEATURES.length);
        slide.setValue(12);
        Animated.parallel([
          Animated.timing(fade,  { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.spring(slide, { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
        ]).start();
      });
    }, 4000);
    return () => clearInterval(id);
  }, [fade, slide]);

  const item = RUVO_FEATURES[idx];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, marginVertical: 8 }}>
      {/* Section Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '900' }}>Why RuVo?</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {RUVO_FEATURES.map((f, i) => (
            <View
              key={f.id}
              style={{
                height: 4, borderRadius: 2,
                width: i === idx ? 20 : 5,
                backgroundColor: i === idx ? item.accent : isDark ? colors.border : '#EAF0F6',
              }}
            />
          ))}
        </View>
      </View>

      {/* Card */}
      <Pressable
        onPress={() => setIdx(p => (p + 1) % RUVO_FEATURES.length)}
        style={{
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: isDark ? colors.border : '#EAF0F6',
          padding: 18,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {/* Icon Circle */}
            <View style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: item.accent + '15',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1,
              borderColor: item.accent + '30',
            }}>
              <Ionicons name={item.icon} size={26} color={item.accent} />
            </View>
            {/* Text */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 4 }}>
                {item.label}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                {item.desc}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default HomeScreen;
