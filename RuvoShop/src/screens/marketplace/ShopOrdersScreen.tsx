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
import { useToast } from '../../context/ToastContext';
import { useOrderAlerts } from '../../hooks/useOrderAlerts';
import { ROUTES } from '../../constants/routes';

type FilterTab = 'ALL' | 'TODAY' | 'NEW' | 'PREPARE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

type OrderStatus =
  | 'PAYMENT_PENDING' | 'ORDER_PLACED' | 'SHOP_PENDING' | 'SHOP_ACCEPTED' | 'PREPARING' | 'READY'
  | 'DELIVERY_ASSIGNMENT' | 'DELIVERY_ASSIGNED' | 'DELIVERY_BROADCASTED'
  | 'WAITING_PARTNER' | 'BROADCASTED' | 'SEARCHING_PARTNER'
  | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'SHOP_REJECTED' | 'CANCELLED_NO_PARTNER_FOUND'
  | 'CANCELLED_BY_SHOP' | 'CANCELLED_BY_USER' | 'SHOP_TIMEOUT';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PAYMENT_PENDING:            { color: '#6B7280', bg: '#F3F4F6', label: 'Payment Pending' },
  ORDER_PLACED:               { color: '#FF7A00', bg: '#FFF7ED', label: 'New Request' },
  SHOP_PENDING:               { color: '#FF7A00', bg: '#FFF7ED', label: 'Pending' },
  SHOP_ACCEPTED:              { color: '#2563EB', bg: '#EFF6FF', label: 'Accepted' },
  PREPARING:                  { color: '#7C3AED', bg: '#F5F3FF', label: 'Preparing' },
  READY:                      { color: '#16A34A', bg: '#F0FDF4', label: 'Ready' },
  DELIVERY_BROADCASTED:       { color: '#FF7A00', bg: '#FFF7ED', label: '📡 Broadcasting' },
  DELIVERY_ASSIGNMENT:        { color: '#FF7A00', bg: '#FFF7ED', label: '📡 Broadcasting' },
  WAITING_PARTNER:            { color: '#FF7A00', bg: '#FFF7ED', label: '📡 Broadcasting' },
  BROADCASTED:                { color: '#FF7A00', bg: '#FFF7ED', label: '📡 Broadcasting' },
  SEARCHING_PARTNER:          { color: '#FF7A00', bg: '#FFF7ED', label: '📡 Broadcasting' },
  DELIVERY_ASSIGNED:          { color: '#2563EB', bg: '#EFF6FF', label: 'Partner Assigned' },
  PICKED_UP:                  { color: '#16A34A', bg: '#F0FDF4', label: 'Picked Up' },
  OUT_FOR_DELIVERY:           { color: '#16A34A', bg: '#F0FDF4', label: 'Out for Delivery' },
  DELIVERED:                  { color: '#10B981', bg: '#ECFDF5', label: 'Delivered' },
  CANCELLED:                  { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled' },
  SHOP_REJECTED:              { color: '#EF4444', bg: '#FEF2F2', label: 'Rejected' },
  CANCELLED_NO_PARTNER_FOUND: { color: '#EF4444', bg: '#FEF2F2', label: 'No Partner' },
  CANCELLED_BY_SHOP:          { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled by Shop' },
  CANCELLED_BY_USER:          { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled by User' },
  SHOP_TIMEOUT:               { color: '#EF4444', bg: '#FEF2F2', label: 'Timeout' },
};

const getStatusCfg = (status?: string) =>
  STATUS_CONFIG[status ?? ''] ?? { color: '#77736B', bg: '#FAF7F0', label: status?.replace(/_/g, ' ') ?? 'Unknown' };

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
  { key: 'TODAY',     label: "Today's" },
  { key: 'NEW',       label: 'New' },
  { key: 'PREPARE',   label: 'Prepare' },
  { key: 'ACTIVE',    label: 'Active' },
  { key: 'COMPLETED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const tabMatches = (tab: FilterTab, order?: Order): boolean => {
  if (!order) return false;
  const status = order.orderStatus;
  if (tab === 'ALL') return true;
  if (tab === 'TODAY') {
    if (!order.createdAt) return false;
    return new Date(order.createdAt).toDateString() === new Date().toDateString();
  }
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
  const { token, user, userId } = useAuth();
  const { showToast } = useToast();
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

    if (!currentShopId && (userId || user)) {
      try {
        const ownerId = userId || user?.email || '';
        const shopRes = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerId)}`, {
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
  }, [token, shopId, routeShopId, user, userId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(false), 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Poll live broadcast data for the currently viewed radar
  useEffect(() => {
<<<<<<< HEAD
    let timer: ReturnType<typeof setInterval>;
=======
    let timer: ReturnType<typeof setTimeout>;
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
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
      showToast('✅ Order Accepted! Finding delivery partner...', 'success');
    } catch {
      showToast('❌ Failed to accept order. Try again.', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleGeneratePickupOtp = async (orderId: number) => {
    if (!token) return;
    setProcessingOrderId(orderId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/generate-pickup-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to generate pickup OTP');
      const data = await response.json();
      Alert.alert(
        'Handover OTP', 
        `Share this 6-digit OTP with the delivery partner when they arrive:\n\n⭐ ${data.pickupOtp} ⭐`
      );
    } catch {
      Alert.alert('Error', 'Failed to generate Pickup OTP');
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

  const filtered = orders.filter(o => tabMatches(filterTab, o));
  const pendingCount = orders.filter(o => o.orderStatus === 'SHOP_PENDING').length;
  const todayOrdersCount = orders.filter(o => {
    if (!o.createdAt) return false;
    const orderDate = new Date(o.createdAt).toDateString();
    return orderDate === new Date().toDateString();
  }).length;

  // Shop Active Status State
  const [isShopActive, setIsShopActive] = useState<boolean>(true);
  const [togglingStatus, setTogglingStatus] = useState<boolean>(false);

  // Fetch shop active status
  useEffect(() => {
    if (!shopId || !token) return;
    fetch(`${API_BASE_URL}/api/shops/${shopId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data.active === 'boolean') {
          setIsShopActive(data.active);
        }
      })
      .catch(() => {});
  }, [shopId, token]);

  const toggleShopStatus = async () => {
    if (!shopId || !token || togglingStatus) return;
    const nextState = !isShopActive;
    setTogglingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/active?active=${nextState}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (res.ok) {
        setIsShopActive(nextState);
        showToast(nextState ? '🟢 Shop is now OPEN & accepting orders' : '🔴 Shop is now CLOSED', 'info');
      } else {
        showToast('Failed to update shop status', 'error');
      }
    } catch {
      showToast('Network error while updating status', 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]" style={{ paddingTop: insets.top }}>
      <OfflineBar />
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center justify-between z-10 shadow-sm">
        <View className="flex-row items-center gap-4 flex-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-black text-gray-900">Store Orders</Text>
              
              {/* Today's Orders Pill */}
              <TouchableOpacity
                onPress={() => setFilterTab('TODAY')}
                className="bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 active:opacity-80"
              >
                <Text className="text-[11px] font-black text-[#FF7A00]">Today: {todayOrdersCount}</Text>
              </TouchableOpacity>
            </View>
            {pendingCount > 0 && (
              <Text className="text-xs text-red-600 font-extrabold mt-0.5">⚠️ {pendingCount} pending action</Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Shop Open / Close Toggle Button */}
          {!!shopId && (
            <TouchableOpacity
              onPress={toggleShopStatus}
              disabled={togglingStatus}
              className={`px-3 py-2 rounded-xl flex-row items-center gap-1.5 border ${
                isShopActive
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <View className={`w-2.5 h-2.5 rounded-full ${isShopActive ? 'bg-[#16A34A]' : 'bg-red-500'}`} />
              <Text className={`text-xs font-black tracking-wider ${isShopActive ? 'text-green-800' : 'text-red-800'}`}>
                {togglingStatus ? '...' : isShopActive ? 'OPEN' : 'CLOSED'}
              </Text>
            </TouchableOpacity>
          )}

          {!!shopId && (
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.DELIVERY_ASSIGNMENT, { shopId, viewPartnersOnly: true })}
              className="px-4 py-2 bg-[#FF7A00] rounded-xl flex-row items-center gap-1.5 shadow-sm active:opacity-80"
            >
              <Ionicons name="bicycle" size={16} color="#FFFFFF" />
              <Text className="text-xs font-black text-white">Riders</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => fetchOrders(true)}
            className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center border border-gray-100"
          >
            <Ionicons name="refresh" size={18} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white border-b border-gray-100 py-3 shadow-sm z-0">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-md">
          <View className="flex-row gap-xs py-1">
            {TABS.map(tab => {
              const isActive = filterTab === tab.key;
              const count = tab.key === 'ALL' ? orders.length : orders.filter(o => tabMatches(tab.key, o)).length;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.8}
                  onPress={() => setFilterTab(tab.key)}
                  className={`flex-row items-center gap-xs px-md py-2 rounded-xl ${
                    isActive ? 'bg-[#FF7A00] border border-[#FF7A00]' : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-black ${isActive ? 'text-white' : 'text-gray-700'}`}>
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View className={`px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white' : 'bg-gray-200'}`}>
                      <Text className={`text-[10px] font-black ${isActive ? 'text-[#FF7A00]' : 'text-gray-800'}`}>
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
          <View className="w-24 h-24 bg-red-50 border border-red-200 rounded-3xl items-center justify-center mb-lg">
            <Ionicons name="alert-circle-outline" size={44} color="#D94A4A" />
          </View>
          <Text className="text-xl font-extrabold text-gray-900 mb-sm">Couldn't Load Orders</Text>
          <Text className="text-sm text-gray-600 text-center mb-xl">{error}</Text>
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
              tintColor="#F4B400"
              colors={['#F4B400']}
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
                <View className="bg-white rounded-2xl p-lg shadow-sm" style={{ borderWidth: 0.5, borderColor: '#EEE7DA' }}>
                  {/* Order Header */}
                  <View className="flex-row items-start justify-between mb-md">
                    <View className="flex-1 pr-sm flex-row items-center gap-md">
                      {mainImg ? (
                        <Image 
                          source={{ uri: mainImg }} 
                          className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100" 
                        />
                      ) : (
                        <View className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 items-center justify-center">
                          <Ionicons name="cart-outline" size={24} color="#F4B400" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-extrabold text-gray-900" numberOfLines={2}>
                          {item.productName} {item.quantity ? `× ${item.quantity}` : ''}
                        </Text>
                        <Text className="text-xs text-gray-600 font-medium mt-0.5">
                          {item.distanceKm != null ? `📍 ${item.distanceKm} km away` : '📍 Store Order'}
                        </Text>
                      </View>
                    </View>
                    <View className="px-3 py-1 rounded-full border border-gray-100" style={{ backgroundColor: cfg.bg }}>
                      <Text className="text-[11px] font-extrabold" style={{ color: cfg.color }}>{cfg.label}</Text>
                    </View>
                  </View>

                  {/* Customer & Address Section */}
                  <View className={`rounded-xl p-md gap-sm mb-sm ${
                    ['CANCELLED', 'CANCELLED_BY_USER', 'SHOP_REJECTED', 'CANCELLED_NO_PARTNER_FOUND', 'CANCELLED_BY_SHOP', 'SHOP_TIMEOUT'].includes(status) 
                      ? 'bg-red-50' 
                      : 'bg-[#F9FAFB]'
                  }`} style={{ borderWidth: 0.5, borderColor: ['CANCELLED', 'CANCELLED_BY_USER', 'SHOP_REJECTED', 'CANCELLED_NO_PARTNER_FOUND', 'CANCELLED_BY_SHOP', 'SHOP_TIMEOUT'].includes(status) ? '#FECACA' : '#EEE7DA' }}>
                    {/* Customer Info */}
                    {item.customerName || item.customerPhone ? (
                      <View className="flex-row items-center justify-between pb-xs mb-xs" style={{ borderBottomWidth: 0.5, borderBottomColor: '#EEE7DA' }}>
                        <View className="flex-row items-center gap-1.5">
                          <Ionicons name="person-circle" size={16} color="#171A1F" />
                          <Text className="text-sm font-extrabold text-gray-900">{item.customerName || 'Customer'}</Text>
                        </View>
                        {item.customerPhone ? (
                          <TouchableOpacity className="flex-row items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-100">
                            <Ionicons name="call" size={12} color="#171A1F" />
                            <Text className="text-xs font-bold text-gray-900">{item.customerPhone}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Complete Address section */}
                    <View className="flex-row items-start gap-2 mb-xs bg-white p-sm rounded-xl border border-gray-100">
                      <Ionicons name="location" size={16} color="#3478C8" className="mt-0.5" />
                      <View className="flex-1">
                        <Text className="text-[10px] font-extrabold text-gray-600 uppercase tracking-wider mb-0.5">Delivery Address</Text>
                        <Text className="text-xs text-gray-900 font-semibold leading-5">
                          {item.deliveryAddress || 'No delivery address provided'}
                        </Text>
                      </View>
                    </View>

                    {/* Multi-Item Breakdown */}
                    {item.items && item.items.length > 0 ? (
                      <View className="gap-xs my-xs">
                        <Text className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-xs">
                          Order Items ({item.items.length})
                        </Text>
                        {item.items.map((it, idx) => {
                          const itImg = formatImgUrl(it.productImageUrl) || mainImg;
                          return (
                            <View key={it.id || idx} className="flex-row justify-between items-center bg-white p-sm rounded-xl border border-gray-100 gap-sm">
                              {itImg ? (
                                <Image source={{ uri: itImg }} className="w-11 h-11 rounded-lg bg-gray-50 border border-gray-100" />
                              ) : (
                                <View className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 items-center justify-center">
                                  <Ionicons name="basket-outline" size={18} color="#F4B400" />
                                </View>
                              )}
                              <View className="flex-1 pr-xs">
                                <Text className="text-xs font-extrabold text-gray-900" numberOfLines={1}>
                                  {it.productName}
                                </Text>
                                <View className="bg-amber-50 self-start px-2 py-0.5 rounded-md mt-1 border border-amber-200">
                                  <Text className="text-[10px] font-extrabold text-amber-800">
                                    Qty: {it.quantity}
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-sm font-extrabold text-gray-900">
                                ₹{it.priceAtOrder ? (it.priceAtOrder * it.quantity) : (item.subtotal || item.totalAmount)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View className="flex-row justify-between items-center bg-white p-sm rounded-xl border border-gray-100">
                        <Text className="text-xs text-gray-600 font-medium">Item Price</Text>
                        <Text className="text-sm font-extrabold text-gray-900">₹{item.subtotal || item.totalAmount}</Text>
                      </View>
                    )}

                    {/* Total & Payment Method (Detailed Breakdown) */}
                    <View className="mt-xs bg-white p-sm rounded-xl" style={{ borderWidth: 0.5, borderColor: '#EEE7DA' }}>
                      
                      {/* Breakdown Rows */}
                      <View className="gap-1.5 mb-2 pb-2" style={{ borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' }}>
                        <View className="flex-row justify-between">
                          <Text className="text-xs font-extrabold text-gray-700">Item Total</Text>
                          <Text className="text-xs font-black text-gray-900">₹{item.subtotal || item.totalAmount}</Text>
                        </View>
                        {!!item.deliveryFee && (
                          <View className="flex-row justify-between">
                            <Text className="text-xs font-extrabold text-gray-700">Delivery Fee</Text>
                            <Text className="text-xs font-black text-gray-900">₹{item.deliveryFee}</Text>
                          </View>
                        )}
                        {!!item.platformFee && (
                          <View className="flex-row justify-between">
                            <Text className="text-xs font-extrabold text-gray-700">Platform Fee</Text>
                            <Text className="text-xs font-black text-gray-900">₹{item.platformFee}</Text>
                          </View>
                        )}
                      </View>

                      {/* Final Total & Payment Type */}
                      <View className="flex-row justify-between items-end">
                        <View>
                          <Text className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-0.5">Grand Total</Text>
                          <Text className="text-xl font-black text-emerald-700">₹{item.totalAmount}</Text>
                        </View>
                        
                        <View className="items-end">
                          <Text className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-1">Payment</Text>
                          <View className={`px-2 py-0.5 rounded flex-row items-center gap-1 ${
                            isCod ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
                          }`}>
                            <Ionicons name={isCod ? 'cash' : 'card'} size={12} color={isCod ? '#E99A16' : '#3478C8'} />
                            <Text className={`text-[10px] font-bold uppercase ${isCod ? 'text-amber-800' : 'text-blue-800'}`}>
                              {item.paymentMethod || 'N/A'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Cancellation Explanation */}
                  {['CANCELLED', 'CANCELLED_BY_USER', 'SHOP_REJECTED', 'CANCELLED_NO_PARTNER_FOUND', 'CANCELLED_BY_SHOP', 'SHOP_TIMEOUT'].includes(status) && (
                    <View className="flex-row items-center gap-xs mt-3 bg-red-50 p-sm rounded-xl border border-red-200">
                      <Ionicons name="information-circle" size={16} color="#D94A4A" />
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
                    <View className="bg-amber-50 border border-amber-200 px-md py-xs rounded-xl mb-sm mt-sm">
                      <Text className="text-xs font-bold text-amber-800">⏰ {countdown}</Text>
                    </View>
                  )}

                  {/* Pending Actions */}
                  {isPending && (
                    <View className="flex-row gap-sm">
                      <TouchableOpacity
                        onPress={() => handleReject(item.id!)}
                        disabled={processing}
                        className="flex-1 border border-red-200 bg-red-50 rounded-xl py-md items-center justify-center"
                      >
                        <Text className="text-sm font-extrabold text-red-600">Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleAccept(item.id!)}
                        disabled={processing}
                        className="flex-[2] bg-[#FF7A00] rounded-xl py-md items-center justify-center flex-row gap-xs shadow-md active:opacity-90"
                        style={{ opacity: processing ? 0.7 : 1 }}
                      >
                        {processing
                          ? <ActivityIndicator color="#FFFFFF" size="small" />
                          : <>
                              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                              <Text className="text-sm font-black text-white">Accept Order</Text>
                            </>
                        }
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* Assigned Action */}
                  {status === 'DELIVERY_ASSIGNED' && (
                    <View className="mt-md gap-sm">
                      <Button
                        variant="primary"
                        onPress={() => item.id && handleGeneratePickupOtp(item.id)}
                        disabled={processing}
                      >
                        {processing ? <ActivityIndicator color="#171A1F" size="small" /> : 'Generate Handover OTP'}
                      </Button>
                      <Text className="text-[10px] text-gray-500 text-center">
                        Generate and share this 6-digit OTP to confirm order pickup.
                      </Text>
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
                              <Ionicons name="radio-outline" size={20} color="#3478C8" />
                            </View>
                            <Text className="text-xs font-black text-blue-800 uppercase tracking-widest mt-1 mb-0.5">
                              Finding Rider
                            </Text>
                            <Text className="text-xl font-black text-blue-700 font-mono tracking-widest">
                              {broadcast.text}
                            </Text>
                            <Text className="text-[9px] text-blue-600 font-bold mt-0.5 mb-1">
                              Broadcasting to online partners
                            </Text>
                            
                            {/* Live Active Request Info */}
                            {liveBroadcastData && liveBroadcastData.status === 'PENDING' && (
                              <Animated.View entering={FadeIn.duration(400)} className="bg-white px-md py-xs rounded-lg border border-blue-200 mb-2 items-center">
                                <Text className="text-[10px] text-gray-500 font-bold mb-0.5">Currently Asking:</Text>
                                <Text className="text-sm font-black text-gray-900">{liveBroadcastData.partnerName || 'Partner'}</Text>
                                {liveBroadcastData.distanceKm != null && (
                                  <Text className="text-[9px] text-blue-600 font-bold mt-0.5">{liveBroadcastData.distanceKm} km away</Text>
                                )}
                              </Animated.View>
                            )}

                            {liveBroadcastData && liveBroadcastData.status === 'NONE' && (
                              <View className="bg-amber-50 px-md py-xs rounded-lg border border-amber-200 mb-2 items-center">
                                <Text className="text-[10px] font-bold text-amber-800">No partner in range</Text>
                                <Text className="text-[9px] text-amber-700">Retrying...</Text>
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
                          <Ionicons name="radio-outline" size={18} color="#3478C8" />
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
                      <Text className="text-[10px] text-gray-500 text-center">
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
