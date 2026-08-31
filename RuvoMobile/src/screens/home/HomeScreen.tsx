import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { RuvoFirstOrderPromoBanner } from '../../components/premium/RuvoFirstOrderPromoBanner';
import { RuvoBanner } from '../../components/premium/RuvoBanner';
import { CATEGORIES, PRODUCT_IMAGES } from '../../assets/cloudinary';
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

  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = screenWidth < 360 ? 12 : 16;
  const shopCardWidth = Math.min(208, Math.max(168, screenWidth * 0.52));
  const productCardWidth = Math.min(164, Math.max(138, screenWidth * 0.4));

  const locationText = locationLoading
    ? FETCHING_LABEL
    : getDeliveryLocationLabel(location);
  const isFetchingLocation = locationText === FETCHING_LABEL;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  useFocusEffect(
    React.useCallback(() => {
      // Fetch active orders
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

      // Fetch nearby shops and their products
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
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-3 pt-2 pb-3">
        {/* Logo and Location Row */}
        <View className="flex-row items-center justify-between mb-sm">
          {/* Logo */}
          <Text className="text-2xl font-black text-ruvo-ink">
            <Text className="text-ruvo-yellow">R</Text>
            <Text className="text-ruvo-yellow-dark">u</Text>
            <Text className="text-ruvo-yellow">Vo</Text>
          </Text>

          {/* Location Pill */}
          <Pressable
            onPress={() => setLocationPickerVisible(true)}
            className="flex-row items-center gap-xs px-md py-xs bg-ruvo-yellow-soft rounded-full flex-1 mx-md"
          >
            <Ionicons name="location-sharp" size={14} color="#F5B700" />
            <View className="flex-1">
              <Text className="text-xs text-warm-600 font-semibold">Deliver to</Text>
              <View className="flex-row items-center gap-xs">
                {isFetchingLocation && (
                  <ActivityIndicator size="small" color="#F5B700" />
                )}
                <Text className="text-sm font-bold text-ruvo-ink flex-1" numberOfLines={1}>
                  {locationText}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#A79E92" />
              </View>
            </View>
          </Pressable>

          {/* Notifications and Cart */}
          <View className="flex-row items-center gap-md">
            <Pressable className="relative">
              <Ionicons name="notifications-outline" size={22} color="#231C10" />
              <View className="absolute -top-1 -right-1 bg-ruvo-error rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">3</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => (navigation.navigate as any)(ROUTES.CART)}
            >
              <Ionicons name="bag-outline" size={22} color="#231C10" />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View className={`flex-row items-center bg-warm-100 rounded-lg px-md py-sm gap-sm ${searchFocused ? 'border-2 border-ruvo-yellow' : ''}`}>
          <Ionicons name="search-outline" size={18} color="#A79E92" />
          <TextInput
            className="flex-1 text-base text-ruvo-ink"
            placeholder="Search shops, products..."
            placeholderTextColor="#A79E92"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchText && (
            <Pressable onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#A79E92" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* ── Active Order Tracking Widget ─────────────────── */}
        {activeOrder && (
          <Pressable
            onPress={() => (navigation.navigate as any)('CustomerTracking', { orderId: activeOrder.id })}
            className="flex-row items-center mx-md mt-lg mb-md bg-blue-50 border border-blue-300 rounded-lg p-md gap-md"
          >
            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
              <Ionicons name="bicycle" size={20} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-ruvo-ink">
                Active Order: {activeOrder.orderStatus?.replace(/_/g, ' ')}
              </Text>
              <Text className="text-xs text-blue-600 mt-xs">Tap to track your delivery</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>
        )}

        {/* ── Hero Banner ─────────────────────────────────── */}
        <RuvoBanner
          onPress={() => (navigation.navigate as any)(ROUTES.NEARBY_SHOPS)}
        />

        {/* ── 3D RuVo Mascot Coupon Banner ────────────────── */}
        <RuvoFirstOrderPromoBanner
          onPressBanner={() => (navigation.navigate as any)(ROUTES.GROCERIES)}
          onApplyCoupon={() => (navigation.navigate as any)(ROUTES.GROCERIES)}
        />

        {/* ── Shop by Category ──── */}
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
            {nearbyShops.slice(0, 6).map(shop => (
              <View key={String(shop.id)} style={{ width: shopCardWidth }}>
                <ShopCard
                  shop={shop}
                  onPress={() => (navigation.navigate as any)(ROUTES.SHOP_DETAILS, { shopId: Number(shop.id) })}
                  showDistance={true}
                />
              </View>
            ))}
          </ScrollView>
        )}

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
        <View className="flex-row gap-md mx-md my-2xl">
          {[
            { icon: '💵', label: 'Cash on Delivery' },
            { icon: '🏪', label: 'Shop Local' },
            { icon: '🎉', label: '0% Commission' },
          ].map(item => (
            <View
              key={item.label}
              className="flex-1 items-center p-md bg-ruvo-surface rounded-lg border border-warm-200"
            >
              <Text className="text-2xl mb-sm">{item.icon}</Text>
              <Text className="text-xs font-bold text-ruvo-ink text-center">
                {item.label}
              </Text>
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

export default HomeScreen;
