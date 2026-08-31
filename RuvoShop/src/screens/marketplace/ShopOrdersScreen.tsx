/**
 * ShopOrdersScreen - RuvoShop (Redesigned)
 * Full NativeWind + Reanimated premium UI.
 * All API calls, filter tabs, accept/reject logic preserved.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { Order } from '../../types/order';
import { API_BASE_URL } from '../../config/api';
import { OfflineBar } from '../../components/OfflineBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

type FilterTab = 'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

type OrderStatus =
  | 'SHOP_PENDING' | 'SHOP_ACCEPTED' | 'PREPARING' | 'READY'
  | 'DELIVERY_ASSIGNMENT' | 'DELIVERY_ASSIGNED' | 'DELIVERY_BROADCASTED'
  | 'WAITING_PARTNER' | 'BROADCASTED' | 'SEARCHING_PARTNER'
  | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'SHOP_REJECTED' | 'CANCELLED_NO_PARTNER_FOUND'
  | 'CANCELLED_BY_SHOP' | 'SHOP_TIMEOUT';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  SHOP_PENDING:               { color: '#D97706', bg: '#FEF3C7', label: 'Pending' },
  SHOP_ACCEPTED:              { color: '#2563EB', bg: '#DBEAFE', label: 'Accepted' },
  PREPARING:                  { color: '#2563EB', bg: '#DBEAFE', label: 'Preparing' },
  READY:                      { color: '#7C3AED', bg: '#EDE9FE', label: 'Ready' },
  DELIVERY_BROADCASTED:       { color: '#EA580C', bg: '#FFEDD5', label: '📡 Broadcasting' },
  DELIVERY_ASSIGNMENT:        { color: '#EA580C', bg: '#FFEDD5', label: '📡 Broadcasting' },
  WAITING_PARTNER:            { color: '#EA580C', bg: '#FFEDD5', label: '📡 Broadcasting' },
  BROADCASTED:                { color: '#EA580C', bg: '#FFEDD5', label: '📡 Broadcasting' },
  SEARCHING_PARTNER:          { color: '#EA580C', bg: '#FFEDD5', label: '📡 Broadcasting' },
  DELIVERY_ASSIGNED:          { color: '#0891B2', bg: '#CFFAFE', label: 'Partner Assigned' },
  PICKED_UP:                  { color: '#059669', bg: '#D1FAE5', label: 'Picked Up' },
  OUT_FOR_DELIVERY:           { color: '#059669', bg: '#D1FAE5', label: 'Out for Delivery' },
  DELIVERED:                  { color: '#15803D', bg: '#DCFCE7', label: 'Delivered' },
  CANCELLED:                  { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled' },
  SHOP_REJECTED:              { color: '#DC2626', bg: '#FEE2E2', label: 'Rejected' },
  CANCELLED_NO_PARTNER_FOUND: { color: '#DC2626', bg: '#FEE2E2', label: 'No Partner Found' },
  CANCELLED_BY_SHOP:          { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled by Shop' },
  SHOP_TIMEOUT:               { color: '#DC2626', bg: '#FEE2E2', label: 'Timeout' },
};

const getStatusCfg = (status?: string) =>
  STATUS_CONFIG[status ?? ''] ?? { color: '#6B7280', bg: '#F3F4F6', label: status?.replace(/_/g, ' ') ?? 'Unknown' };

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL',       label: 'All' },
  { key: 'PENDING',   label: 'Pending' },
  { key: 'ACTIVE',    label: 'Active' },
  { key: 'COMPLETED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const tabMatches = (tab: FilterTab, status?: string): boolean => {
  if (tab === 'ALL') return true;
  if (tab === 'PENDING')   return status === 'SHOP_PENDING';
  if (tab === 'ACTIVE')    return ['SHOP_ACCEPTED','PREPARING','READY','DELIVERY_ASSIGNMENT','DELIVERY_ASSIGNED',
                                   'DELIVERY_BROADCASTED','WAITING_PARTNER','BROADCASTED','SEARCHING_PARTNER',
                                   'PICKED_UP','OUT_FOR_DELIVERY'].includes(status ?? '');
  if (tab === 'COMPLETED') return status === 'DELIVERED';
  if (tab === 'CANCELLED') return ['CANCELLED','SHOP_REJECTED','CANCELLED_NO_PARTNER_FOUND',
                                   'CANCELLED_BY_SHOP','SHOP_TIMEOUT'].includes(status ?? '');
  return true;
};

export default function ShopOrdersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();

  const routeShopId = route.params?.shopId;
  const [shopId, setShopId] = useState<number | null>(routeShopId || null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');

  const fetchOrders = useCallback(async (showLoader = true) => {
    if (!token) { setLoading(false); return; }
    let currentShopId = shopId || routeShopId;

    if (!currentShopId && user) {
      try {
        const shopRes = await fetch(`${API_BASE_URL}/api/shops/mine`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (shopRes.ok) {
          const mineData = await shopRes.json();
          if (Array.isArray(mineData) && mineData.length > 0) {
            currentShopId = mineData[0].id;
            setShopId(currentShopId);
          }
        }
      } catch {}
    }

    if (!currentShopId) { setLoading(false); setError('No active shop found.'); return; }
    if (showLoader) setLoading(true);

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/orders/shop/${currentShopId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid orders response');
      setOrders([...data].sort((a: Order, b: Order) => Number(b.id || 0) - Number(a.id || 0)));
    } catch (err: any) {
      setError('Failed to fetch orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, shopId, routeShopId, user]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(false), 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleAccept = async (orderId: number) => {
    if (!token) return;
    setProcessingOrderId(orderId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to accept order');
      await fetchOrders(false);
      Alert.alert('Order Accepted', 'The order has been accepted and is ready for preparation.');
    } catch {
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleReject = (orderId: number) => {
    Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          if (!token) return;
          setProcessingOrderId(orderId);
          try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/reject`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Failed to reject order');
            await fetchOrders(false);
            Alert.alert('Order Rejected', 'The order has been rejected.');
          } catch {
            Alert.alert('Error', 'Failed to reject order.');
          } finally {
            setProcessingOrderId(null);
          }
        },
      },
    ]);
  };

  const filtered = orders.filter(o => tabMatches(filterTab, o.orderStatus));
  const pendingCount = orders.filter(o => o.orderStatus === 'SHOP_PENDING').length;

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      <OfflineBar />

      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center gap-md">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 bg-warm-200 rounded-lg items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#231C10" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ruvo-ink">Store Orders</Text>
          {pendingCount > 0 && (
            <Text className="text-xs text-orange-600 font-bold mt-xs">{pendingCount} pending action</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => fetchOrders(true)} className="w-9 h-9 bg-ruvo-yellow/20 rounded-lg items-center justify-center">
          <Ionicons name="refresh" size={18} color="#F5B700" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-lg pt-md pb-sm gap-xs">
        {TABS.map(tab => {
          const isActive = filterTab === tab.key;
          const count = tab.key === 'ALL' ? orders.length : orders.filter(o => tabMatches(tab.key, o.orderStatus)).length;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilterTab(tab.key)}
              className={`px-md py-xs rounded-full flex-row items-center gap-xs ${
                isActive ? 'bg-ruvo-yellow' : 'bg-warm-200'
              }`}
            >
              <Text className={`text-xs font-extrabold ${isActive ? 'text-ruvo-ink' : 'text-warm-700'}`}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View className={`w-4 h-4 rounded-full items-center justify-center ${isActive ? 'bg-ruvo-ink/20' : 'bg-warm-400'}`}>
                  <Text className={`text-[9px] font-extrabold ${isActive ? 'text-ruvo-ink' : 'text-white'}`}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View className="px-lg pt-sm">
          <Skeleton height={180} className="mb-md" />
          <Skeleton height={180} className="mb-md" />
          <Skeleton height={180} />
        </View>
      ) : error ? (
        <Animated.View entering={FadeIn.duration(300)} className="flex-1 items-center justify-center px-xl">
          <View className="w-24 h-24 bg-red-100 rounded-3xl items-center justify-center mb-lg">
            <Ionicons name="alert-circle-outline" size={44} color="#DC2626" />
          </View>
          <Text className="text-xl font-extrabold text-ruvo-ink mb-sm">Couldn't Load Orders</Text>
          <Text className="text-sm text-warm-600 text-center mb-xl">{error}</Text>
          <Button variant="primary" onPress={() => fetchOrders()} icon="refresh">Retry</Button>
        </Animated.View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOrders(false); }}
              tintColor="#F5B700"
              colors={['#F5B700']}
            />
          }
          contentContainerClassName={`px-lg pt-sm pb-2xl ${filtered.length === 0 ? 'flex-grow' : ''}`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" title="No orders" description={`No ${filterTab.toLowerCase()} orders to show.`} />
          }
          ItemSeparatorComponent={() => <View className="h-md" />}
          renderItem={({ item, index }) => {
            const status = item.orderStatus as OrderStatus;
            const cfg = getStatusCfg(status);
            const isPending = status === 'SHOP_PENDING';
            const processing = processingOrderId === item.id;
            const isCod = item.paymentMethod?.toUpperCase().includes('COD');

            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
                <Card>
                  {/* Order Header */}
                  <View className="flex-row items-start justify-between mb-md">
                    <View>
                      <Text className="text-lg font-extrabold text-ruvo-ink">Order #{item.id}</Text>
                      <Text className="text-xs text-warm-600 font-medium mt-xs">Shop Order</Text>
                    </View>
                    <View className="px-sm py-xs rounded-lg" style={{ backgroundColor: cfg.bg }}>
                      <Text className="text-xs font-extrabold" style={{ color: cfg.color }}>{cfg.label}</Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View className="bg-warm-100 rounded-lg p-md mb-md gap-sm">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-warm-600 font-medium">Product</Text>
                      <Text className="text-sm text-ruvo-ink font-bold">
                        {item.productName} {item.quantity ? `× ${item.quantity}` : ''}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-warm-600 font-medium">Amount</Text>
                      <Text className="text-base font-extrabold text-ruvo-yellow">₹{item.totalAmount}</Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-warm-600 font-medium">Payment</Text>
                      <View className={`px-sm py-xs rounded-md flex-row items-center gap-xs ${isCod ? 'bg-orange-100' : 'bg-blue-100'}`}>
                        <Ionicons name={isCod ? 'cash-outline' : 'card-outline'} size={12} color={isCod ? '#D97706' : '#3B82F6'} />
                        <Text className={`text-xs font-bold ${isCod ? 'text-orange-700' : 'text-blue-700'}`}>
                          {item.paymentMethod || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Pending Actions */}
                  {isPending && (
                    <View className="flex-row gap-sm">
                      <TouchableOpacity
                        onPress={() => handleReject(item.id!)}
                        disabled={processing}
                        className="flex-1 border-2 border-red-300 rounded-xl py-md items-center justify-center"
                      >
                        <Text className="text-sm font-extrabold text-red-600">Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleAccept(item.id!)}
                        disabled={processing}
                        className="flex-[2] bg-ruvo-yellow rounded-xl py-md items-center justify-center flex-row gap-xs"
                        style={{ opacity: processing ? 0.7 : 1 }}
                      >
                        {processing
                          ? <ActivityIndicator color="#231C10" size="small" />
                          : <>
                              <Ionicons name="checkmark-circle-outline" size={18} color="#231C10" />
                              <Text className="text-sm font-extrabold text-ruvo-ink">Accept Order</Text>
                            </>
                        }
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </Animated.View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
