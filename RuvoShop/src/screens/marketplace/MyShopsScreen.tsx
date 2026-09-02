import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  useWindowDimensions,
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
import { Button, IconButton } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

// ── Image resolution ────────────────────────────────────────────────────────
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
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');

  const loadShops = async (isRefresh = false) => {
    const ownerId = userId || user?.id;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    if (ownerId && token) {
      try {
        const fetchedShops = await getMyShops(String(ownerId), token);
        setShops(fetchedShops);

        // Fetch products for each shop concurrently using getProductsByShop + fallback
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
            : !s.approved;
        return matchSearch && matchFilter;
      }),
    [shops, searchQuery, activeFilter]
  );

  // ── Loading State ────────────────────────────────────────────────────────
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

  // ── Shop Card Component ──────────────────────────────────────────────────
  const ShopCard = ({ item, index }: { item: Shop; index: number }) => {
    const shopData = item as Shop & { category?: string; address?: string; phone?: string };
    const approved = Boolean(item.approved);
    const thumbUri = resolveImage(
      item.logoUrl || item.bannerUrl || (item as any).imageUrl
    );
    const productsList = shopProducts[item.id] || [];
    const recentProducts = productsList.slice(0, 3);

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
          className="mb-lg overflow-hidden border border-warm-300 rounded-3xl bg-white shadow-sm"
        >
          {/* Status Stripe */}
          <View
            className={`absolute left-0 top-0 bottom-0 w-1.5 ${
              approved ? 'bg-ruvo-accent' : 'bg-orange-500'
            }`}
          />

          <View className="p-md pl-sm">
            {/* Shop Info Header */}
            <View className="flex-row items-center gap-md">
              <View className="w-16 h-16 bg-warm-100 rounded-2xl border border-warm-200 items-center justify-center overflow-hidden">
                {thumbUri ? (
                  <Image source={{ uri: thumbUri }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Ionicons name="storefront" size={30} color="#F5B700" />
                )}
              </View>

              <View className="flex-1 gap-xs">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-lg font-black text-ruvo-ink mr-xs" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Badge variant={approved ? 'success' : 'warning'} size="sm">
                    {approved ? 'Approved' : 'Pending'}
                  </Badge>
                </View>

                {shopData.category && (
                  <View className="flex-row items-center gap-xs">
                    <Ionicons name="pricetag" size={12} color="#F5B700" />
                    <Text className="text-xs font-semibold text-warm-600" numberOfLines={1}>
                      {shopData.category}
                    </Text>
                  </View>
                )}

                {shopData.address && (
                  <View className="flex-row items-center gap-xs">
                    <Ionicons name="location" size={12} color="#A79E92" />
                    <Text className="flex-1 text-xs text-warm-600" numberOfLines={1}>
                      {shopData.address}
                    </Text>
                  </View>
                )}
              </View>

              <Ionicons name="chevron-forward" size={20} color="#D4C8B8" />
            </View>

            {/* Action Bar */}
            <View className="flex-row flex-wrap gap-xs mt-md pt-sm border-t border-warm-200">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-xs bg-ruvo-yellow-soft py-sm rounded-xl"
                onPress={() => navigation.navigate(ROUTES.MY_PRODUCTS, { shopId: item.id })}
              >
                <Ionicons name="cube-outline" size={14} color="#D99B00" />
                <Text className="text-xs font-black text-ruvo-yellow-dark">Products ({productsList.length})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-xs bg-blue-100 py-sm rounded-xl"
                onPress={() =>
                  navigation.navigate(ROUTES.SHOP_ORDERS, {
                    shopId: item.id,
                    shopName: item.name,
                  })
                }
              >
                <Ionicons name="receipt-outline" size={14} color="#2563EB" />
                <Text className="text-xs font-black text-blue-600">Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-center gap-xs bg-ruvo-accent-soft px-md py-sm rounded-xl"
                onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT, { shopId: item.id })}
              >
                <Ionicons name="add-circle" size={14} color="#16A34A" />
                <Text className="text-xs font-black text-ruvo-accent">Add</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-center gap-xs bg-purple-100 px-md py-sm rounded-xl"
                onPress={() => navigation.navigate('EditShop', { shop: item })}
              >
                <Ionicons name="create-outline" size={14} color="#9333EA" />
                <Text className="text-xs font-black text-purple-600">Edit</Text>
              </TouchableOpacity>
            </View>

            {/* ── Recent Products Showcase (Directly inside Shop Card) ── */}
            <View className="mt-md pt-md border-t border-warm-200">
              <View className="flex-row items-center justify-between mb-sm">
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="cube" size={16} color="#231C10" />
                  <Text className="text-xs font-black text-ruvo-ink uppercase tracking-wider">
                    Recent Products
                  </Text>
                </View>
                {productsList.length > 0 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate(ROUTES.MY_PRODUCTS, { shopId: item.id })}
                    className="flex-row items-center gap-xs"
                  >
                    <Text className="text-xs font-bold text-ruvo-yellow-dark">Browse All</Text>
                    <Ionicons name="chevron-forward" size={12} color="#D99B00" />
                  </TouchableOpacity>
                )}
              </View>

              {recentProducts.length === 0 ? (
                <View className="bg-warm-50 p-sm rounded-xl items-center justify-center border border-dashed border-warm-300">
                  <Text className="text-xs font-medium text-warm-600">No products added yet</Text>
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
                        className="bg-warm-50 border border-warm-200 rounded-xl p-2.5 flex-row items-center gap-2.5"
                      >
                        <View className="w-12 h-12 rounded-lg bg-white border border-warm-200 items-center justify-center overflow-hidden relative">
                          {pImg ? (
                            <Image source={{ uri: pImg }} className="w-full h-full" resizeMode="contain" />
                          ) : (
                            <Ionicons name="image-outline" size={20} color="#A79E92" />
                          )}
                          {discount > 0 && (
                            <View className="absolute top-0 left-0 bg-ruvo-accent px-1 rounded-br-sm">
                              <Text className="text-[8px] font-black text-white">{discount}%</Text>
                            </View>
                          )}
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs font-extrabold text-ruvo-ink flex-1 mr-1" numberOfLines={1}>
                              {product.name}
                            </Text>
                            <View
                              className={`px-1.5 py-0.5 rounded-full ${
                                isAvailable ? 'bg-green-100' : 'bg-red-100'
                              }`}
                            >
                              <Text
                                className={`text-[9px] font-black ${
                                  isAvailable ? 'text-green-700' : 'text-red-700'
                                }`}
                              >
                                {isAvailable ? 'Active' : 'Stock Out'}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-baseline gap-1 mt-0.5">
                            <Text className="text-xs font-black text-ruvo-ink">₹{product.sellingPrice}</Text>
                            {product.actualPrice > product.sellingPrice && (
                              <Text className="text-[10px] text-warm-500 line-through">₹{product.actualPrice}</Text>
                            )}
                            {product.unit && (
                              <Text className="text-[9px] text-warm-500 font-semibold">/ {product.unit}</Text>
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
                          className="bg-white p-2 rounded-lg border border-warm-300 items-center justify-center"
                        >
                          <Ionicons name="create-outline" size={16} color="#231C10" />
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

  // ── Empty State ──────────────────────────────────────────────────────────
  const EmptyComponent = () => (
    <EmptyState
      icon={searchQuery ? 'search-outline' : 'storefront-outline'}
      title={searchQuery ? 'No results found' : 'No shops yet'}
      description={
        searchQuery
          ? 'Try a different search term'
          : 'Register your local shop on RuVo to start managing products and orders.'
      }
      actionLabel={!searchQuery ? 'Register New Shop' : undefined}
      onAction={!searchQuery ? () => navigation.navigate(ROUTES.REGISTER_SHOP) : undefined}
    />
  );

  // ── Main Screen ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg">
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="bg-ruvo-surface border-b border-warm-300 px-lg py-md"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-md flex-1">
            <View
              className="w-10 h-10 bg-ruvo-yellow-soft rounded-lg items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons name="storefront" size={22} color="#F5B700" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-ruvo-ink">My Shops</Text>
              <Text className="text-sm text-warm-600">Manage your shops</Text>
            </View>
          </View>

          <View className="flex-row gap-sm">
            <IconButton icon="refresh" onPress={() => loadShops(true)} size="md" />
            <IconButton icon="log-out-outline" onPress={logout} size="md" variant="danger" />
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)} className="px-lg py-md">
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search shops..."
        />
      </Animated.View>

      {/* Filter Stats */}
      <Animated.View
        entering={FadeInDown.delay(150).duration(300)}
        className={`flex-row gap-sm px-lg mb-md ${isTablet ? 'justify-start' : ''}`}
      >
        {[
          { key: 'ALL', label: 'Total', count: shops.length, icon: 'storefront-outline', color: 'bg-ruvo-yellow-soft', textColor: 'text-ruvo-yellow-dark' },
          { key: 'APPROVED', label: 'Approved', count: approvedCount, icon: 'checkmark-circle-outline', color: 'bg-ruvo-accent-soft', textColor: 'text-ruvo-accent' },
          { key: 'PENDING', label: 'Pending', count: pendingCount, icon: 'time-outline', color: 'bg-orange-100', textColor: 'text-orange-600' },
        ].map(stat => (
          <TouchableOpacity
            key={stat.key}
            className={`flex-1 ${isTablet ? 'max-w-xs' : ''} bg-ruvo-surface rounded-lg p-md border ${
              activeFilter === stat.key ? 'border-ruvo-yellow' : 'border-warm-300'
            }`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => setActiveFilter(stat.key as any)}
          >
            <View className={`w-8 h-8 ${stat.color} rounded-lg items-center justify-center mb-sm`}>
              <Ionicons name={stat.icon as any} size={16} color={stat.key === 'PENDING' ? '#EA580C' : stat.key === 'APPROVED' ? '#16A34A' : '#F5B700'} />
            </View>
            <Text className="text-2xl font-bold text-ruvo-ink">{stat.count}</Text>
            <Text className="text-xs text-warm-600 mt-xs">{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Error Banner */}
      {error && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="mx-lg mb-md bg-red-100 rounded-lg p-md flex-row items-center gap-sm"
        >
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text className="flex-1 text-sm text-red-600">{error}</Text>
        </Animated.View>
      )}

      {/* Shops List */}
      <FlatList
        data={filteredShops}
        keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
        renderItem={({ item, index }) => <ShopCard item={item} index={index} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShops(true)}
            tintColor="#F5B700"
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
