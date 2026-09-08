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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useOrderAlerts } from '../../hooks/useOrderAlerts';
import { ROUTES } from '../../constants/routes';

type FilterTab = 'ALL' | 'NEW' | 'PREPARE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

type OrderStatus =
  | 'PAYMENT_PENDING' | 'ORDER_PLACED' | 'SHOP_PENDING' | 'SHOP_ACCEPTED' | 'PREPARING' | 'READY'
  | 'DELIVERY_ASSIGNMENT' | 'DELIVERY_ASSIGNED' | 'DELIVERY_BROADCASTED'
  | 'WAITING_PARTNER' | 'BROADCASTED' | 'SEARCHING_PARTNER'
  | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'SHOP_REJECTED' | 'CANCELLED_NO_PARTNER_FOUND'
  | 'CANCELLED_BY_SHOP' | 'CANCELLED_BY_USER' | 'SHOP_TIMEOUT';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PAYMENT_PENDING:            { color: '#9CA3AF', bg: '#F3F4F6', label: 'Payment Pending' },
  ORDER_PLACED:               { color: '#D97706', bg: '#FEF3C7', label: 'New Request' },
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
  CANCELLED_BY_USER:          { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled by Customer' },
  SHOP_TIMEOUT:               { color: '#DC2626', bg: '#FEE2E2', label: 'Timeout' },
};

const getStatusCfg = (status?: string) =>
  STATUS_CONFIG[status ?? ''] ?? { color: '#6B7280', bg: '#F3F4F6', label: status?.replace(/_/g, ' ') ?? 'Unknown' };

const formatImgUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL',       label: 'All' },
  { key: 'NEW',       label: 'New' },
  { key: 'PREPARE',   label: 'Prepare' },
  { key: 'ACTIVE',    label: 'Active' },
  { key: 'COMPLETED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const tabMatches = (tab: FilterTab, status?: string): boolean => {
  if (tab === 'ALL') return true;
  if (tab === 'NEW') return ['SHOP_PENDING', 'ORDER_PLACED', 'PAYMENT_PENDING'].includes(status ?? '');
  if (tab === 'PREPARE') return ['SHOP_ACCEPTED', 'PREPARING', 'READY'].includes(status ?? '');
  if (tab === 'ACTIVE') return ['DELIVERY_ASSIGNMENT','DELIVERY_ASSIGNED', 'DELIVERY_BROADCASTED','WAITING_PARTNER','BROADCASTED','SEARCHING_PARTNER', 'PICKED_UP','OUT_FOR_DELIVERY'].includes(status ?? '');
  if (tab === 'COMPLETED') return status === 'DELIVERED';
  if (tab === 'CANCELLED') return ['CANCELLED', 'CANCELLED_BY_USER', 'SHOP_REJECTED','CANCELLED_NO_PARTNER_FOUND', 'CANCELLED_BY_SHOP','SHOP_TIMEOUT'].includes(status ?? '');
  return false;
};

export default function ShopOrdersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const routeShopId = route?.params?.shopId;
  const [shopId, setShopId] = useState<number | null>(routeShopId || null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [countdowns, setCountdowns] = useState<Record<number, string>>({});
  const [broadcastCountdowns, setBroadcastCountdowns] = useState<Record<number, { text: string; progress: number }>>({});
  const [viewBroadcastId, setViewBroadcastId] = useState<number | null>(null);
  const [liveBroadcastData, setLiveBroadcastData] = useState<any>(null);

  useOrderAlerts(orders);

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

  // Poll live broadcast data for the currently viewed radar
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (viewBroadcastId && token) {
      const fetchLive = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/delivery/orders/${viewBroadcastId}/current-request`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
          });
          if (response.ok) {
            setLiveBroadcastData(await response.json());
          }
        } catch (e) {}
      };
      fetchLive();
      timer = setInterval(fetchLive, 3000);
    } else {
      setLiveBroadcastData(null);
    }
    return () => clearInterval(timer);
  }, [viewBroadcastId, token]);

  // Countdown timer for pending and broadcasting orders
  useEffect(() => {
    const timer = setInterval(() => {
      const newCountdowns: Record<number, string> = {};
      const newBroadcast: Record<number, { text: string; progress: number }> = {};
      
      orders.forEach(o => {
        if (o.orderStatus === 'SHOP_PENDING' && o.shopResponseDeadline) {
          const diff = new Date(o.shopResponseDeadline).getTime() - Date.now();
          if (diff <= 0) {
            newCountdowns[o.id!] = 'EXPIRED';
          } else {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            newCountdowns[o.id!] = `${mins}:${secs.toString().padStart(2, '0')} left`;
          }
        }
        
        if (['DELIVERY_ASSIGNMENT', 'DELIVERY_BROADCASTED', 'WAITING_PARTNER', 'BROADCASTED', 'SEARCHING_PARTNER', 'SHOP_ACCEPTED'].includes(o.orderStatus || '')) {
          const refTime = (o as any).dispatchStartedAt || o.updatedAt || o.createdAt;
          if (refTime) {
            const diff = new Date(refTime).getTime() + (10 * 60000) - Date.now();
            if (diff <= 0) {
              newBroadcast[o.id!] = { text: '00:00', progress: 0 };
            } else {
              const mins = Math.floor(diff / 60000);
              const secs = Math.floor((diff % 60000) / 1000);
              newBroadcast[o.id!] = { 
                text: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
                progress: Math.max(0, diff / (10 * 60000))
              };
            }
          }
        }
      });
      
      setCountdowns(newCountdowns);
      setBroadcastCountdowns(newBroadcast);
    }, 1000);
    return () => clearInterval(timer);
  }, [orders]);

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
      Alert.alert(
        'Order Accepted',
        'Order accepted! Broadcasting delivery request to online partners.',
        [{ text: 'View Assignment', onPress: () => navigation.navigate('DeliveryPartnerAssignment', { orderId, shopId }) }]
      );
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

  const handleCancelAfterAccept = (orderId: number) => {
    Alert.alert('Cancel Order', 'Cancel this order? This will stop delivery assignment.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          if (!token) return;
          setProcessingOrderId(orderId);
          try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel-by-shopkeeper`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Failed to cancel order');
            await fetchOrders(false);
            Alert.alert('Order Cancelled', 'The order has been successfully cancelled.');
          } catch {
            Alert.alert('Error', 'Failed to cancel the order. Please try again.');
          } finally {
            setProcessingOrderId(null);
          }
        },
      },
    ]);
  };

  const filtered = orders.filter(o => tabMatches(filterTab, o.orderStatus));
  const pendingCount = orders.filter(o => o.orderStatus === 'SHOP_PENDING').length;
  const todayOrdersCount = orders.filter(o => {
    if (!o.createdAt) return false;
    const orderDate = new Date(o.createdAt).toDateString();
    return orderDate === new Date().toDateString();
  }).length;

  return (
    <View className="flex-1 bg-ruvo-bg" style={{ paddingTop: insets.top }}>
      <OfflineBar />
      {/* Header */}
      <View className="bg-white border-b border-warm-200 px-lg py-sm flex-row items-center justify-between shadow-xs">
        <View className="flex-row items-center gap-sm flex-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-warm-100 items-center justify-center border border-warm-200"
          >
            <Ionicons name="arrow-back" size={20} color="#231C10" />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-black text-ruvo-ink">Store Orders</Text>
              <View className="bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                <Text className="text-[11px] font-black text-amber-800">Today: {todayOrdersCount}</Text>
              </View>
            </View>
            {pendingCount > 0 && (
              <Text className="text-xs text-rose-600 font-extrabold mt-0.5">⚠️ {pendingCount} pending action</Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-xs">
          {!!shopId && (
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.DELIVERY_ASSIGNMENT, { shopId, viewPartnersOnly: true })}
              className="px-md py-2 bg-amber-500 rounded-2xl flex-row items-center gap-xs border border-amber-600 shadow-xs"
            >
              <Ionicons name="bicycle" size={16} color="#FFFFFF" />
              <Text className="text-xs font-black text-white">Riders</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => fetchOrders(true)}
            className="w-10 h-10 rounded-full bg-warm-100 items-center justify-center border border-warm-200"
          >
            <Ionicons name="refresh" size={18} color="#231C10" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white border-b border-warm-200 py-xs">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-md">
          <View className="flex-row gap-xs py-1">
            {TABS.map(tab => {
              const isActive = filterTab === tab.key;
              const count = tab.key === 'ALL' ? orders.length : orders.filter(o => tabMatches(tab.key, o.orderStatus)).length;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.8}
                  onPress={() => setFilterTab(tab.key)}
                  className={`flex-row items-center gap-xs px-md py-2 rounded-2xl ${
                    isActive ? 'bg-amber-500 border border-amber-600 shadow-sm' : 'bg-warm-100/70 border border-warm-200/50'
                  }`}
                >
                  <Text className={`text-xs font-black ${isActive ? 'text-white' : 'text-warm-700'}`}>
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View className={`px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white' : 'bg-warm-300'}`}>
                      <Text className={`text-[10px] font-black ${isActive ? 'text-amber-600' : 'text-ruvo-ink'}`}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
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
            const countdown = countdowns[item.id!];
            const broadcast = broadcastCountdowns[item.id!];

            const mainImg = formatImgUrl(item.productImageUrl);

            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
                <View className="bg-white border border-warm-300 rounded-3xl p-lg shadow-sm">
                  {/* Order Header */}
                  <View className="flex-row items-start justify-between mb-md">
                    <View className="flex-1 pr-sm flex-row items-center gap-md">
                      {mainImg ? (
                        <Image 
                          source={{ uri: mainImg }} 
                          className="w-14 h-14 rounded-2xl bg-warm-100 border border-warm-200" 
                        />
                      ) : (
                        <View className="w-14 h-14 rounded-2xl bg-warm-100 border border-warm-200 items-center justify-center">
                          <Ionicons name="cart-outline" size={26} color="#A79E92" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-black text-ruvo-ink" numberOfLines={2}>
                          {item.productName} {item.quantity ? `× ${item.quantity}` : ''}
                        </Text>
                        <Text className="text-xs text-warm-600 font-bold mt-1">
                          {item.distanceKm != null ? `📍 ${item.distanceKm} km away` : '📍 Store Order'}
                        </Text>
                      </View>
                    </View>
                    <View className="px-3 py-1 rounded-full border border-warm-200" style={{ backgroundColor: cfg.bg }}>
                      <Text className="text-[11px] font-black" style={{ color: cfg.color }}>{cfg.label}</Text>
                    </View>
                  </View>

                  {/* Customer & Address Section */}
                  <View className={`rounded-2xl p-md gap-sm mb-sm border ${
                    ['CANCELLED', 'CANCELLED_BY_USER', 'SHOP_REJECTED', 'CANCELLED_NO_PARTNER_FOUND', 'CANCELLED_BY_SHOP', 'SHOP_TIMEOUT'].includes(status) 
                      ? 'bg-rose-50/80 border-rose-200' 
                      : 'bg-amber-50/60 border-amber-200/80'
                  }`}>
                    {/* Customer Info */}
                    {item.customerName || item.customerPhone ? (
                      <View className="flex-row items-center justify-between pb-xs border-b border-amber-200/60 mb-xs">
                        <View className="flex-row items-center gap-1.5">
                          <Ionicons name="person-circle" size={18} color="#231C10" />
                          <Text className="text-sm font-black text-ruvo-ink">{item.customerName || 'Customer'}</Text>
                        </View>
                        {item.customerPhone ? (
                          <TouchableOpacity className="flex-row items-center gap-1 bg-amber-500 px-3 py-1 rounded-full border border-amber-600 shadow-xs">
                            <Ionicons name="call" size={12} color="#FFFFFF" />
                            <Text className="text-xs font-black text-white">{item.customerPhone}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Complete Address section - Highly Legible & Bold */}
                    <View className="flex-row items-start gap-2 mb-xs bg-white p-sm rounded-xl border border-amber-200/70">
                      <Ionicons name="location" size={18} color="#E11D48" className="mt-0.5" />
                      <View className="flex-1">
                        <Text className="text-[10px] font-black text-rose-700 uppercase tracking-wider mb-0.5">Delivery Address</Text>
                        <Text className="text-xs text-black font-black leading-5">
                          {item.deliveryAddress || 'No delivery address provided'}
                        </Text>
                      </View>
                    </View>

                    {/* Multi-Item Breakdown - Crisp Contrast */}
                    {item.items && item.items.length > 0 ? (
                      <View className="gap-xs my-xs">
                        <Text className="text-xs font-black text-ruvo-ink uppercase tracking-wider mb-xs">
                          Order Items ({item.items.length})
                        </Text>
                        {item.items.map((it, idx) => {
                          const itImg = formatImgUrl(it.productImageUrl) || mainImg;
                          return (
                            <View key={it.id || idx} className="flex-row justify-between items-center bg-white p-sm rounded-xl border border-warm-300 gap-sm shadow-xs">
                              {itImg ? (
                                <Image source={{ uri: itImg }} className="w-12 h-12 rounded-lg bg-warm-100 border border-warm-200" />
                              ) : (
                                <View className="w-12 h-12 rounded-lg bg-warm-100 border border-warm-200 items-center justify-center">
                                  <Ionicons name="basket-outline" size={20} color="#A79E92" />
                                </View>
                              )}
                              <View className="flex-1 pr-xs">
                                <Text className="text-sm font-black text-ruvo-ink" numberOfLines={1}>
                                  {it.productName}
                                </Text>
                                <View className="bg-amber-100 self-start px-2 py-0.5 rounded-md mt-1 border border-amber-300">
                                  <Text className="text-xs font-black text-amber-900">
                                    Qty: {it.quantity}
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-base font-black text-ruvo-ink">
                                ₹{it.priceAtOrder ? (it.priceAtOrder * it.quantity) : (item.subtotal || item.totalAmount)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View className="flex-row justify-between items-center bg-white p-sm rounded-xl border border-warm-200">
                        <Text className="text-xs text-warm-700 font-extrabold">Item Price</Text>
                        <Text className="text-base font-black text-ruvo-ink">₹{item.subtotal || item.totalAmount}</Text>
                      </View>
                    )}

                    {/* Total & Payment Method */}
                    <View className="flex-row justify-between items-center mt-xs bg-white p-sm rounded-xl border border-amber-300">
                      <View>
                        <Text className="text-[10px] font-black text-warm-600 uppercase tracking-wider">Total Amount</Text>
                        <Text className="text-lg font-black text-emerald-700">₹{item.totalAmount}</Text>
                      </View>
                      
                      <View className="items-end">
                        <Text className="text-[10px] font-black text-warm-600 uppercase tracking-wider mb-0.5">Payment</Text>
                        <View className={`px-3 py-1 rounded-full flex-row items-center gap-1 border ${
                          isCod ? 'bg-amber-100 border-amber-300' : 'bg-blue-100 border-blue-300'
                        }`}>
                          <Ionicons name={isCod ? 'cash' : 'card'} size={14} color={isCod ? '#B45309' : '#1D4ED8'} />
                          <Text className={`text-xs font-black uppercase ${isCod ? 'text-amber-900' : 'text-blue-900'}`}>
                            {item.paymentMethod || 'N/A'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Cancellation Explanation */}
                  {['CANCELLED', 'CANCELLED_BY_USER', 'SHOP_REJECTED', 'CANCELLED_NO_PARTNER_FOUND', 'CANCELLED_BY_SHOP', 'SHOP_TIMEOUT'].includes(status) && (
                    <View className="flex-row items-center gap-xs mt-3 bg-red-100 p-sm rounded-lg border border-red-200">
                      <Ionicons name="information-circle" size={16} color="#DC2626" />
                      <Text className="text-xs text-red-700 font-bold flex-1">
                        {status === 'SHOP_REJECTED' && 'You rejected this order before accepting.'}
                        {status === 'CANCELLED_BY_SHOP' && 'You cancelled the delivery partner broadcast.'}
                        {status === 'CANCELLED_NO_PARTNER_FOUND' && 'No delivery partner accepted the request.'}
                        {status === 'SHOP_TIMEOUT' && 'You did not accept the order in time.'}
                        {status === 'CANCELLED_BY_USER' && 'The order was cancelled by the customer.'}
                        {status === 'CANCELLED' && 'The order was cancelled by the customer or admin.'}
                      </Text>
                    </View>
                  )}

                  {/* Countdown Timer */}
                  {isPending && !!countdown && (
                    <View className="bg-orange-100 px-md py-xs rounded-lg mb-sm mt-sm">
                      <Text className="text-xs font-bold text-orange-600">⏰ {countdown}</Text>
                    </View>
                  )}

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
                  {/* Active Order Actions */}
                  {['DELIVERY_ASSIGNMENT', 'DELIVERY_BROADCASTED', 'WAITING_PARTNER', 'BROADCASTED', 'SEARCHING_PARTNER', 'SHOP_ACCEPTED'].includes(status) && (
                    <View className="mt-md gap-sm">
                      {/* Broadcast Animation */}
                      {broadcast && viewBroadcastId === item.id ? (
                        <View className="bg-blue-50 py-4 px-xl rounded-xl border border-blue-200 items-center justify-center relative overflow-hidden mb-sm">
                          <View className="absolute left-0 bottom-0 top-0 bg-blue-200/40" style={{ width: `${broadcast.progress * 100}%` }} />
                          <Animated.View entering={FadeIn.duration(1000)} style={{ alignItems: 'center' }}>
                            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mb-1 border border-blue-200 shadow-sm">
                              <Ionicons name="radio-outline" size={20} color="#2563EB" />
                            </View>
                            <Text className="text-xs font-black text-blue-800 uppercase tracking-widest mt-1 mb-0.5">
                              Finding Rider
                            </Text>
                            <Text className="text-xl font-black text-blue-600 font-mono tracking-widest">
                              {broadcast.text}
                            </Text>
                            <Text className="text-[9px] text-blue-500 font-bold mt-0.5 mb-1">
                              Broadcasting to online partners
                            </Text>
                            
                            {/* Live Active Request Info */}
                            {liveBroadcastData && liveBroadcastData.status === 'PENDING' && (
                              <Animated.View entering={FadeIn.duration(400)} className="bg-white px-md py-xs rounded-lg border border-blue-200 mb-2 items-center">
                                <Text className="text-[10px] text-warm-500 font-bold mb-0.5">Currently Asking:</Text>
                                <Text className="text-sm font-black text-ruvo-ink">{liveBroadcastData.partnerName || 'Partner'}</Text>
                                {liveBroadcastData.distanceKm != null && (
                                  <Text className="text-[9px] text-blue-600 font-bold mt-0.5">{liveBroadcastData.distanceKm} km away</Text>
                                )}
                              </Animated.View>
                            )}

                            {liveBroadcastData && liveBroadcastData.status === 'NONE' && (
                              <View className="bg-orange-50 px-md py-xs rounded-lg border border-orange-200 mb-2 items-center">
                                <Text className="text-[10px] font-bold text-orange-600">No partner in range</Text>
                                <Text className="text-[9px] text-orange-500">Retrying...</Text>
                              </View>
                            )}

                            <TouchableOpacity onPress={() => { setViewBroadcastId(null); setLiveBroadcastData(null); }} className="px-sm py-xs bg-blue-200 rounded-md">
                              <Text className="text-[10px] font-bold text-blue-800">Hide Tracker</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        </View>
                      ) : broadcast ? (
                        <TouchableOpacity 
                          onPress={() => setViewBroadcastId(item.id!)}
                          className="bg-blue-50 py-md px-md rounded-xl border border-blue-200 items-center justify-center flex-row gap-xs mb-sm"
                        >
                          <Ionicons name="radio-outline" size={18} color="#2563EB" />
                          <Text className="text-sm font-extrabold text-blue-700">View Live Broadcast Tracker</Text>
                        </TouchableOpacity>
                      ) : null}
                      
                      <Button
                        variant="danger"
                        onPress={() => item.id && handleCancelAfterAccept(item.id)}
                        disabled={processing}
                      >
                        {processing ? <ActivityIndicator color="#FFF" size="small" /> : 'Cancel Order'}
                      </Button>
                      <Text className="text-[10px] text-warm-500 text-center">
                        Use only if you are unable to fulfill this order.
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}
