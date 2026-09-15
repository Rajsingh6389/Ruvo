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
    const logoUri = resolveImage(item.logoUrl);
    const bannerUri = resolveImage(item.bannerUrl || (item as any).imageUrl);

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate(ROUTES.SHOPKEEPER_DASHBOARD, {
              shopId: item.id,
              shopName: item.name,
            })
          }
          className="mb-lg overflow-hidden border border-ruvo-border rounded-2xl bg-ruvo-surface shadow-sm"
        >
          {/* Shop Banner Image with Blurred Background Accent */}
          <View className="h-28 w-full bg-warm-200/50 overflow-hidden relative">
            {bannerUri ? (
              <>
                <Image source={{ uri: bannerUri }} className="absolute inset-0 w-full h-full opacity-40" blurRadius={15} resizeMode="cover" />
                <Image source={{ uri: bannerUri }} className="w-full h-full" resizeMode="contain" />
              </>
            ) : (
              <View className="w-full h-full bg-ruvo-yellow-soft/40 items-center justify-center">
                <Ionicons name="storefront-outline" size={36} color="#F4B400" />
              </View>
            )}

            {/* Shop Logo Avatar overlay */}
            <View className="absolute bottom-2 left-3 w-14 h-14 bg-white/95 rounded-xl border border-warm-200 p-0.5 shadow-md items-center justify-center overflow-hidden">
              {logoUri ? (
                <Image source={{ uri: logoUri }} className="w-full h-full" resizeMode="contain" />
              ) : (
                <Ionicons name="storefront" size={24} color="#F4B400" />
              )}
            </View>
          </View>

          <View className="p-md pt-2">
            {/* Shop Name & Status */}
            <View className="flex-row items-center justify-between mb-xs">
              <Text className="text-lg font-black text-ruvo-ink flex-1 mr-2" numberOfLines={1}>
                {item.name}
              </Text>
              <Badge variant={approved ? 'success' : 'warning'} size="sm">
                {approved ? 'Approved' : 'Pending'}
              </Badge>
            </View>

            {(shopData.category || (item as any).categoryName) && (
              <Text className="text-xs font-bold text-warm-600">
                {shopData.category || (item as any).categoryName}
              </Text>
            )}

            {/* Actions Row */}
            <View className="mt-md flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(ROUTES.SHOPKEEPER_DASHBOARD, {
                    shopId: item.id,
                    shopName: item.name,
                  })
                }
                className="flex-1 bg-ruvo-yellow py-3 rounded-xl flex-row items-center justify-center gap-2 border border-amber-300 shadow-xs"
              >
                <Text className="text-xs font-extrabold text-ruvo-ink uppercase tracking-wider">View Dashboard</Text>
                <Ionicons name="arrow-forward" size={16} color="#231C10" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('EditShop', { shop: item })
                }
                className="bg-white px-4 py-3 rounded-xl flex-row items-center justify-center border border-ruvo-border shadow-xs"
              >
                <Ionicons name="create-outline" size={18} color="#231C10" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 bg-warm-200 rounded-xl items-center justify-center active:opacity-70"
            >
              <Ionicons name="arrow-back" size={20} color="#171A1F" />
            </TouchableOpacity>
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
