import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  useWindowDimensions,
  ScrollView,
  Animated as RNAnimated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { getMyShops, Shop } from '../../services/shopService';
import { getProductsByShop } from '../../services/productService';
import { API_BASE_URL } from '../../config/api';
import { ROUTES } from '../../constants/routes';
import { IconButton } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

function resolveImage(url?: string): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const MyShopsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, userId, token, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopProducts, setShopProducts] = useState<{ [shopId: number]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'OVERDUE'>('ALL');

  const loadShops = async (isRefresh = false) => {
    const ownerId = userId || user?.id;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    if (ownerId && token) {
      try {
        const fetchedShops = await getMyShops(String(ownerId), token);
        setShops(fetchedShops);

        const productsMap: { [shopId: number]: any[] } = {};
        await Promise.all(
          fetchedShops.map(async (s: Shop) => {
            if (s.id) {
              try {
                let prods = await getProductsByShop(s.id, token);
                if (!prods || prods.length === 0) {
                  const fallbackRes = await fetch(`${API_BASE_URL}/api/shops/${s.id}/products`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (fallbackRes.ok) {
                    const fallbackData = await fallbackRes.json();
                    if (Array.isArray(fallbackData)) prods = fallbackData;
                  }
                }
                productsMap[s.id] = prods || [];
              } catch (e) {
                console.log(`Failed to fetch products for shop ${s.id}`, e);
              }
            }
          })
        );
        setShopProducts(productsMap);
      } catch (err: any) {
        setError(err.message || 'Failed to load your shops');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    } else {
      setError('User not authenticated properly');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, [userId, user, token]);

  const approvedCount = useMemo(() => shops.filter(s => Boolean(s.approved)).length, [shops]);
  const pendingCount = useMemo(() => shops.filter(s => !s.approved).length, [shops]);
  const overdueCount = useMemo(() => shops.filter(s => Boolean((s as any).settlementBlocked)).length, [shops]);

  const filteredShops = useMemo(
    () =>
      shops.filter(s => {
        const matchSearch =
          !searchQuery ||
          s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s as any).category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s as any).address?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchFilter =
          activeFilter === 'ALL'
            ? true
            : activeFilter === 'APPROVED'
            ? Boolean(s.approved)
            : activeFilter === 'PENDING'
            ? !s.approved
            : Boolean((s as any).settlementBlocked);
        return matchSearch && matchFilter;
      }),
    [shops, searchQuery, activeFilter]
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg">
        <View className="flex-1 items-center justify-center px-xl">
          <Animated.View entering={FadeInUp.duration(300)}>
            <View
              className="w-20 h-20 bg-ruvo-yellow rounded-2xl items-center justify-center mb-lg"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <Ionicons name="storefront" size={36} color="#231C10" />
            </View>
          </Animated.View>
          <Text className="text-2xl font-bold text-ruvo-ink mb-sm">Loading your shops</Text>
          <Text className="text-base text-warm-600 mb-xl">Please wait...</Text>
          <ActivityIndicator size="large" color="#F5B700" />
        </View>
      </SafeAreaView>
    );
  }

  const ShopCard = ({ item, index }: { item: Shop; index: number }) => {
    const shopData = item as Shop & { category?: string; address?: string; phone?: string; settlementBlocked?: boolean };
    const approved = Boolean(item.approved);
    const isOverdue = Boolean(shopData.settlementBlocked);
    const thumbUri = resolveImage(
      item.logoUrl || item.bannerUrl || (item as any).imageUrl
    );
    const productsList = shopProducts[item.id] || [];
    const recentProducts = productsList.slice(0, 3);

    // Continuous Chamakti/Light Sweep Animation
    const shineAnim = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
      const loop = RNAnimated.loop(
        RNAnimated.timing(shineAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, [shineAnim]);

    const translateX = shineAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-250, 450],
    });

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
        <Card
          onPress={() =>
            navigation.navigate(ROUTES.SHOPKEEPER_DASHBOARD, {
              shopId: item.id,
              shopName: item.name,
            })
          }
          variant="default"
          className="mb-lg overflow-hidden border border-ruvo-border rounded-2xl bg-ruvo-surface shadow-sm"
        >
          <View className="p-md">
            {/* Overdue Alert Banner if settlementBlocked */}
            {isOverdue && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-sm mb-md flex-row items-center gap-xs">
                <Ionicons name="alert-circle" size={18} color="#D94A4A" />
                <View className="flex-1">
                  <Text className="text-xs font-black text-red-900">Settlement Overdue Notice</Text>
                  <Text className="text-[10px] text-red-700 font-medium">
                    Order broadcast paused. Please clear your weekly settlement dues to resume.
                  </Text>
                </View>
              </View>
            )}

            {/* Shop Info Header */}
            <View className="flex-row items-center gap-md">
              <View className="w-14 h-14 bg-ruvo-bg rounded-xl border border-ruvo-border items-center justify-center overflow-hidden">
                {thumbUri ? (
                  <Image source={{ uri: thumbUri }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Ionicons name="storefront" size={26} color="#F4B400" />
                )}
              </View>

              <View className="flex-1 gap-1">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-base font-extrabold text-ruvo-ink mr-xs" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View className="flex-row items-center gap-xs">
                    {isOverdue ? (
                      <Badge variant="error" size="sm">Overdue</Badge>
                    ) : (
                      <Badge variant={approved ? 'success' : 'warning'} size="sm">
                        {approved ? 'Approved' : 'Pending'}
                      </Badge>
                    )}
                  </View>
                </View>

                {(shopData.category || (item as any).categoryName) && (
                  <View className="flex-row items-center gap-xs">
                    <Ionicons name="pricetag" size={12} color="#F4B400" />
                    <Text className="text-xs font-semibold text-warm-600" numberOfLines={1}>
                      {shopData.category || (item as any).categoryName}
                    </Text>
                  </View>
                )}

                {(shopData.address || (item as any).fullAddress) && (
                  <View className="flex-row items-start gap-xs mt-0.5">
                    <Ionicons name="location" size={12} color="#77736B" style={{ marginTop: 2 }} />
                    <Text className="flex-1 text-xs text-warm-600 leading-4" numberOfLines={1}>
                      {shopData.address || (item as any).fullAddress}
                    </Text>
                  </View>
                )}
              </View>

              <Ionicons name="chevron-forward" size={18} color="#77736B" />
            </View>

            {/* Premium Action Grid Menu */}
            <View className="mt-md pt-md border-t border-ruvo-border">
              <View className="flex-row items-center justify-between gap-1.5">
                {/* Products Tile */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  className="flex-1 items-center bg-ruvo-bg py-2 px-1 rounded-xl border border-ruvo-border shadow-xs"
                  onPress={() => navigation.navigate(ROUTES.MY_PRODUCTS, { shopId: item.id })}
                >
                  <View className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 items-center justify-center mb-1">
                    <Ionicons name="cube" size={15} color="#F4B400" />
                  </View>
                  <Text className="text-[10px] font-bold text-ruvo-ink text-center" numberOfLines={1}>Products</Text>
                  <Text className="text-[9px] font-semibold text-warm-600 mt-0.5">{productsList.length} Items</Text>
                </TouchableOpacity>

                {/* Orders Tile */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  className="flex-1 items-center bg-ruvo-bg py-2 px-1 rounded-xl border border-ruvo-border shadow-xs"
                  onPress={() =>
                    navigation.navigate(ROUTES.SHOP_ORDERS, {
                      shopId: item.id,
                      shopName: item.name,
                    })
                  }
                >
                  <View className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 items-center justify-center mb-1">
                    <Ionicons name="receipt" size={15} color="#3478C8" />
                  </View>
                  <Text className="text-[10px] font-bold text-ruvo-ink text-center" numberOfLines={1}>Orders</Text>
                  <Text className="text-[9px] font-semibold text-warm-600 mt-0.5">Manage</Text>
                </TouchableOpacity>

                {/* Add Item Tile */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  className="flex-1 items-center bg-ruvo-bg py-2 px-1 rounded-xl border border-ruvo-border shadow-xs"
                  onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT, { shopId: item.id })}
                >
                  <View className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 items-center justify-center mb-1">
                    <Ionicons name="add" size={16} color="#18A957" />
                  </View>
                  <Text className="text-[10px] font-bold text-ruvo-ink text-center" numberOfLines={1}>Add Item</Text>
                  <Text className="text-[9px] font-semibold text-warm-600 mt-0.5">New</Text>
                </TouchableOpacity>

                {/* Edit Tile */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  className="flex-1 items-center bg-ruvo-bg py-2 px-1 rounded-xl border border-ruvo-border shadow-xs"
                  onPress={() => navigation.navigate('EditShop', { shop: item })}
                >
                  <View className="w-8 h-8 rounded-lg bg-ruvo-surface border border-ruvo-border items-center justify-center mb-1">
                    <Ionicons name="create" size={15} color="#171A1F" />
                  </View>
                  <Text className="text-[10px] font-bold text-ruvo-ink text-center" numberOfLines={1}>Edit</Text>
                  <Text className="text-[9px] font-semibold text-warm-600 mt-0.5">Info</Text>
                </TouchableOpacity>

                {/* Dues Tile */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  className="flex-1 items-center bg-ruvo-bg py-2 px-1 rounded-xl border border-ruvo-border shadow-xs"
                  onPress={() => navigation.navigate('ShopSettlement', { shopId: item.id })}
                >
                  <View className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center mb-1">
                    <Ionicons name="wallet" size={15} color="#D94A4A" />
                  </View>
                  <Text className="text-[10px] font-bold text-ruvo-ink text-center" numberOfLines={1}>Dues</Text>
                  <Text className="text-[9px] font-semibold text-warm-600 mt-0.5">Pay</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Products Showcase */}
            <View className="mt-md pt-md border-t border-ruvo-border">
              <View className="flex-row items-center justify-between mb-sm">
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="cube" size={15} color="#171A1F" />
                  <Text className="text-xs font-extrabold text-ruvo-ink uppercase tracking-wider">
                    Recent Inventory
                  </Text>
                </View>
                {productsList.length > 0 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate(ROUTES.MY_PRODUCTS, { shopId: item.id })}
                    className="flex-row items-center gap-xs"
                  >
                    <Text className="text-xs font-bold text-ruvo-ink">Browse All</Text>
                    <Ionicons name="chevron-forward" size={12} color="#171A1F" />
                  </TouchableOpacity>
                )}
              </View>

              {recentProducts.length === 0 ? (
                <View className="bg-ruvo-bg p-sm rounded-xl items-center justify-center border border-dashed border-ruvo-border">
                  <Text className="text-xs font-medium text-warm-600">No inventory products added yet</Text>
                </View>
              ) : (
                <View className="gap-xs">
                  {recentProducts.map((product: any) => {
                    const pImg = resolveImage(product.imageUrl || product.image);
                    const isAvailable = product.isAvailable !== false && product.stockQuantity > 0;
                    const discount =
                      product.discount ||
                      (product.actualPrice > product.sellingPrice
                        ? Math.round(((product.actualPrice - product.sellingPrice) / product.actualPrice) * 100)
                        : 0);

                    return (
                      <View
                        key={product.id}
                        className="bg-ruvo-bg border border-ruvo-border rounded-xl p-2.5 flex-row items-center gap-2.5"
                      >
                        <View className="w-12 h-12 rounded-lg bg-white border border-ruvo-border items-center justify-center overflow-hidden relative">
                          {pImg ? (
                            <Image source={{ uri: pImg }} className="w-full h-full" resizeMode="contain" />
                          ) : (
                            <Ionicons name="image-outline" size={20} color="#77736B" />
                          )}
                          {discount > 0 && (
                            <View className="absolute top-0 left-0 bg-ruvo-primary px-1 rounded-br-sm">
                              <Text className="text-[8px] font-black text-ruvo-ink">{discount}%</Text>
                            </View>
                          )}
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs font-extrabold text-ruvo-ink flex-1 mr-1" numberOfLines={1}>
                              {product.name}
                            </Text>
                            <Badge variant={isAvailable ? 'success' : 'error'} size="sm">
                              {isAvailable ? 'Active' : 'Stock Out'}
                            </Badge>
                          </View>

                          <View className="flex-row items-baseline gap-1 mt-0.5">
                            <Text className="text-xs font-extrabold text-ruvo-ink">₹{product.sellingPrice}</Text>
                            {product.actualPrice > product.sellingPrice && (
                              <Text className="text-[10px] text-warm-500 line-through">₹{product.actualPrice}</Text>
                            )}
                            {product.unit && (
                              <Text className="text-[9px] text-warm-600 font-medium">/ {product.unit}</Text>
                            )}
                          </View>

                          <Text className="text-[10px] text-warm-600 font-medium">
                            Stock: {product.stockQuantity} units
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate(ROUTES.EDIT_PRODUCT, {
                              product,
                              productId: product.id,
                              shopId: item.id,
                            })
                          }
                          className="bg-ruvo-surface p-2 rounded-lg border border-ruvo-border items-center justify-center"
                        >
                          <Ionicons name="create-outline" size={15} color="#171A1F" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  };

  const EmptyComponent = () => (
    <EmptyState
      icon={searchQuery ? 'search-outline' : 'storefront-outline'}
      title={searchQuery ? 'No matching shops' : 'No Shops Registered'}
      description={
        searchQuery
          ? 'Try searching with another shop name or location'
          : 'Register your local store on RuVo to start managing inventory, prices, and receiving customer orders.'
      }
      actionLabel={!searchQuery ? 'Register New Shop' : undefined}
      onAction={!searchQuery ? () => navigation.navigate(ROUTES.REGISTER_SHOP) : undefined}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg">
      {/* Header Bar */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="bg-ruvo-surface border-b border-warm-300 px-lg py-md"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-md flex-1">
            <View
              className="w-10 h-10 bg-ruvo-yellow-soft rounded-xl items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons name="storefront" size={20} color="#171A1F" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-ruvo-ink">Manage My Shops</Text>
              <Text className="text-xs text-warm-600 font-medium">Control inventory, orders & shop status</Text>
            </View>
          </View>

          <View className="flex-row gap-xs items-center">
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.REGISTER_SHOP)}
              className="bg-ruvo-primary px-3 py-2 rounded-xl flex-row items-center gap-xs shadow-xs"
            >
              <Ionicons name="add" size={16} color="#171A1F" />
              <Text className="text-xs font-bold text-ruvo-ink">Add Shop</Text>
            </TouchableOpacity>
            <IconButton icon="refresh" onPress={() => loadShops(true)} size="md" />
            <TouchableOpacity
              onPress={() => Alert.alert('Sign Out', 'Are you sure you want to log out?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive', onPress: logout }])}
              className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 items-center justify-center flex-row shadow-xs"
            >
              <Ionicons name="log-out-outline" size={18} color="#D94A4A" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Search Input Bar */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)} className="px-lg py-md">
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search shop by name or address..."
        />
      </Animated.View>

      {/* Filter Quick Pills */}
      <Animated.View
        entering={FadeInDown.delay(150).duration(300)}
        className={`flex-row gap-xs px-lg mb-md ${isTablet ? 'justify-start' : ''}`}
      >
        {[
          { key: 'ALL', label: 'All Shops', count: shops.length, icon: 'storefront-outline', color: 'bg-amber-50 border-amber-200', iconColor: '#F4B400' },
          { key: 'APPROVED', label: 'Approved', count: approvedCount, icon: 'checkmark-circle-outline', color: 'bg-emerald-50 border-emerald-200', iconColor: '#18A957' },
          { key: 'PENDING', label: 'Pending', count: pendingCount, icon: 'time-outline', color: 'bg-amber-50 border-amber-200', iconColor: '#E99A16' },
          { key: 'OVERDUE', label: 'Overdue', count: overdueCount, icon: 'alert-circle-outline', color: 'bg-red-50 border-red-200', iconColor: '#D94A4A' },
        ].map(stat => (
          <TouchableOpacity
            key={stat.key}
            className={`flex-1 ${isTablet ? 'max-w-xs' : ''} bg-ruvo-surface rounded-2xl p-sm border shadow-xs ${
              activeFilter === stat.key ? 'border-ruvo-primary' : 'border-ruvo-border'
            }`}
            onPress={() => setActiveFilter(stat.key as any)}
          >
            <View className={`w-7 h-7 ${stat.color} border rounded-lg items-center justify-center mb-xs`}>
              <Ionicons name={stat.icon as any} size={14} color={stat.iconColor} />
            </View>
            <Text className="text-base font-extrabold text-ruvo-ink">{stat.count}</Text>
            <Text className="text-[10px] font-medium text-warm-600" numberOfLines={1}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Error Banner */}
      {error && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="mx-lg mb-md bg-red-50 border border-red-200 rounded-xl p-md flex-row items-center gap-sm"
        >
          <Ionicons name="alert-circle-outline" size={18} color="#D94A4A" />
          <Text className="flex-1 text-sm text-red-600">{error}</Text>
        </Animated.View>
      )}

      {/* Shops List View */}
      <FlatList
        data={filteredShops}
        keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
        renderItem={({ item, index }) => <ShopCard item={item} index={index} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShops(true)}
            tintColor="#F4B400"
            colors={['#F4B400']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-lg pb-24"
        ListEmptyComponent={EmptyComponent}
      />
    </SafeAreaView>
  );
};

export default MyShopsScreen;
