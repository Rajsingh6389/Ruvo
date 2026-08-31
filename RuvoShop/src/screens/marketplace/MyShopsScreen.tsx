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
import { API_BASE_URL } from '../../config/api';
import { ROUTES } from '../../constants/routes';
import { Button, IconButton } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton, ListSkeleton } from '../../components/ui/Skeleton';

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
        setShops(await getMyShops(String(ownerId), token));
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
          className="mb-md overflow-hidden"
        >
          {/* Status Stripe */}
          <View
            className={`absolute left-0 top-0 bottom-0 w-1 ${
              approved ? 'bg-ruvo-accent' : 'bg-orange-500'
            }`}
          />

          <View className="flex-row items-center gap-md pl-xs">
            {/* Shop Thumbnail */}
            <View
              className="w-14 h-14 bg-warm-200 rounded-lg items-center justify-center overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {thumbUri ? (
                <Image
                  source={{ uri: thumbUri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="storefront" size={28} color="#A79E92" />
              )}
            </View>

            {/* Shop Info */}
            <View className="flex-1 gap-xs">
              {/* Name + Status */}
              <View className="flex-row items-center gap-sm">
                <Text className="flex-1 text-lg font-bold text-ruvo-ink" numberOfLines={1}>
                  {item.name}
                </Text>
                <Badge variant={approved ? 'success' : 'warning'} size="sm">
                  {approved ? 'Approved' : 'Pending'}
                </Badge>
              </View>

              {/* Category */}
              {shopData.category && (
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="pricetag-outline" size={12} color="#A79E92" />
                  <Text className="text-sm text-warm-600" numberOfLines={1}>
                    {shopData.category}
                  </Text>
                </View>
              )}

              {/* Address */}
              {shopData.address && (
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="location-outline" size={12} color="#A79E92" />
                  <Text className="flex-1 text-sm text-warm-600" numberOfLines={1}>
                    {shopData.address}
                  </Text>
                </View>
              )}

              {/* Quick Actions */}
              <View className="flex-row flex-wrap gap-xs mt-xs">
                <TouchableOpacity
                  className="flex-row items-center gap-xs bg-ruvo-yellow-soft px-md py-xs rounded-lg"
                  onPress={() => navigation.navigate(ROUTES.MY_PRODUCTS, { shopId: item.id })}
                >
                  <Ionicons name="cube-outline" size={12} color="#D99B00" />
                  <Text className="text-xs font-bold text-ruvo-yellow-dark">Products</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center gap-xs bg-blue-100 px-md py-xs rounded-lg"
                  onPress={() =>
                    navigation.navigate(ROUTES.SHOP_ORDERS, {
                      shopId: item.id,
                      shopName: item.name,
                    })
                  }
                >
                  <Ionicons name="receipt-outline" size={12} color="#2563EB" />
                  <Text className="text-xs font-bold text-blue-600">Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center gap-xs bg-ruvo-accent-soft px-md py-xs rounded-lg"
                  onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT, { shopId: item.id })}
                >
                  <Ionicons name="add" size={12} color="#16A34A" />
                  <Text className="text-xs font-bold text-ruvo-accent">Add</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center gap-xs bg-purple-100 px-md py-xs rounded-lg"
                  onPress={() => navigation.navigate('EditShop', { shop: item })}
                >
                  <Ionicons name="create-outline" size={12} color="#9333EA" />
                  <Text className="text-xs font-bold text-purple-600">Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Chevron */}
            <Ionicons name="chevron-forward" size={20} color="#D4C8B8" />
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
