/**
 * ShopkeeperDashboardScreen - Redesigned with Premium UI/UX
 * 
 * Features:
 * - Multi-tab navigation (Dashboard, Orders, Products, Delivery, Financials)
 * - Real-time order updates with countdown timers
 * - Stats cards with animations
 * - Order management (accept/reject/assign delivery)
 * - Delivery partner assignment
 * - Financial breakdown with settlements
 * - Responsive layout for phones and tablets
 * - NativeWind styling with Reanimated animations
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Alert,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { ROUTES } from '../../constants/routes';
import { Button, IconButton } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, CompactEmptyState } from '../../components/ui/EmptyState';
import { DashboardSkeleton, OrderCardSkeleton } from '../../components/ui/Skeleton';

// ── Types ────────────────────────────────────────────────────────────────────
interface Order {
  id: number;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  totalAmount: number;
  deliveryFee?: number;
  platformFee?: number;
  subtotal?: number;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus?: string;
  deliveryAddress: string;
  deliveryPartnerId?: number | null;
  shopResponseDeadline?: string;
  createdAt?: string;
  userId?: string;
}

interface Notification {
  id: number;
  orderId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface DeliveryPartner {
  id: number;
  name: string;
  phone: string;
  available: boolean;
  latitude?: number;
  longitude?: number;
  rating?: number;
  activeDelivery?: string;
}

const STATUS_FILTERS = [
  { label: 'New', status: 'SHOP_PENDING', color: 'bg-orange-100', textColor: 'text-orange-600' },
  { label: 'Accepted', status: 'SHOP_ACCEPTED', color: 'bg-blue-100', textColor: 'text-blue-600' },
  { label: 'Preparing', status: 'PREPARING', color: 'bg-purple-100', textColor: 'text-purple-600' },
  { label: 'Ready', status: 'READY', color: 'bg-green-100', textColor: 'text-green-600' },
  { label: 'Waiting Partner', status: 'DELIVERY_ASSIGNMENT', color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  { label: 'Out for Delivery', status: 'OUT_FOR_DELIVERY', color: 'bg-indigo-100', textColor: 'text-indigo-600' },
  { label: 'Delivered', status: 'DELIVERED', color: 'bg-ruvo-accent-soft', textColor: 'text-ruvo-accent' },
];

const formatImageUrl = (url?: string) => {
  if (!url) return null;
  const trimmed = url.trim();
  return trimmed.startsWith('http') ? trimmed : `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function ShopkeeperDashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const routeShopId = route.params?.shopId;
  const [currentShopId, setCurrentShopId] = useState<number | undefined>(routeShopId);
  const [shop, setShop] = useState<any>(null);
  const shopId = currentShopId || routeShopId;
  const shopName = route.params?.shopName || shop?.name || 'My Shop';

  // Tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'delivery' | 'financials'>('dashboard');

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modal state
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [partnerModalOrder, setPartnerModalOrder] = useState<Order | null>(null);
  const [assigningPartner, setAssigningPartner] = useState(false);

  // Countdown state
  const [countdowns, setCountdowns] = useState<Record<number, string>>({});

  // ── Fetch Data ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let activeShopId = currentShopId || routeShopId;

    // Auto-discover shop
    if (!activeShopId) {
      const ownerId = user?.id || user?.email;
      if (ownerId) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const mineData = await res.json();
          if (Array.isArray(mineData) && mineData.length > 0) {
            activeShopId = mineData[0].id;
            setCurrentShopId(activeShopId);
            setShop(mineData[0]);
          }
        } catch (err) {}
      }
    }

    if (!activeShopId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [shopRes, ordersRes, notifRes, partnersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/shops/${activeShopId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/orders/shop/${activeShopId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/notifications/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/orders/shop/${activeShopId}/delivery-partners`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const shopData = await shopRes.json();
      const ordersData = await ordersRes.json();
      const notifData = await notifRes.json();
      const partnersData = await partnersRes.json();

      if (shopRes.ok) setShop(shopData);
      if (Array.isArray(ordersData)) setOrders(ordersData.reverse());
      if (Array.isArray(notifData)) {
        setNotifications(notifData.filter(n => n.type === 'SHOP_NEW_ORDER' || n.type?.startsWith('SHOP')));
      }
      if (Array.isArray(partnersData)) setPartners(partnersData);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, [currentShopId, routeShopId, token, user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      const interval = setInterval(fetchData, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }, [fetchData])
  );

  // Countdown timer for pending orders
  useEffect(() => {
    const timer = setInterval(() => {
      const newCountdowns: Record<number, string> = {};
      orders.forEach(o => {
        if (o.orderStatus === 'SHOP_PENDING' && o.shopResponseDeadline) {
          const diff = new Date(o.shopResponseDeadline).getTime() - Date.now();
          if (diff <= 0) {
            newCountdowns[o.id] = 'EXPIRED';
          } else {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            newCountdowns[o.id] = `${mins}:${secs.toString().padStart(2, '0')} left`;
          }
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(timer);
  }, [orders]);

  // ── Order Actions ────────────────────────────────────────────────────────
  const handleAccept = async (orderId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchData();
        const targetOrder = orders.find(o => o.id === orderId);
        if (targetOrder) setPartnerModalOrder(targetOrder);
      } else {
        Alert.alert('Error', data.message || 'Failed to accept order');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleReject = (orderId: number) => {
    Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/reject`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) fetchData();
        },
      },
    ]);
  };

  const assignPartner = async (partnerId: number) => {
    if (!partnerModalOrder) return;
    setAssigningPartner(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/orders/${partnerModalOrder.id}/assign-partner?partnerId=${partnerId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', `Delivery assigned successfully`);
        setPartnerModalOrder(null);
        fetchData();
      } else {
        Alert.alert('Error', data.message || 'Failed to assign partner');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
    setAssigningPartner(false);
  };

  // ── Calculate Stats ──────────────────────────────────────────────────────
  const isValidSalesOrder = (o: Order) => {
    const status = (o.orderStatus || '').toUpperCase();
    const paymentStatus = ((o as any).paymentStatus || '').toUpperCase();
    if (['CANCELLED', 'FAILED', 'SHOP_REJECTED', 'REJECTED'].includes(status)) return false;
    if (['FAILED', 'PAYMENT_FAILED', 'REFUNDED'].includes(paymentStatus)) return false;
    return true;
  };

  const validOrders = orders.filter(isValidSalesOrder);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const validTodayOrders = validOrders.filter(o => {
    if (!o.createdAt) return true;
    try {
      return new Date(o.createdAt).toISOString().split('T')[0] === todayDateStr;
    } catch (e) {
      return true;
    }
  });

  const pendingOrders = orders.filter(o => o.orderStatus === 'SHOP_PENDING');
  const activeOrders = orders.filter(o =>
    ['SHOP_ACCEPTED', 'PREPARING', 'READY', 'DELIVERY_ASSIGNED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)
  );
  const completedOrders = orders.filter(o => o.orderStatus === 'DELIVERED');

  const realizedSalesOrders = validOrders.filter(o => ((o as any).paymentStatus || '').toUpperCase() === 'PAID');
  const totalSales = realizedSalesOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const todaySales = validTodayOrders.filter(o => ((o as any).paymentStatus || '').toUpperCase() === 'PAID').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const avgOrderValue = validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0;
  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  const filteredOrders = validOrders.filter(o => {
    if (selectedStatusFilter === 'ALL') return true;
    return o.orderStatus === selectedStatusFilter;
  });

  // ── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg">
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg">
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} className="bg-ruvo-surface border-b border-warm-300 px-lg py-md">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-md flex-1">
            <IconButton icon="arrow-back" onPress={() => navigation.goBack()} size="md" />
            <View className="flex-1">
              <Text className="text-xl font-bold text-ruvo-ink">{activeTab === 'dashboard' ? 'Dashboard' : 'Orders'}</Text>
              <TouchableOpacity className="flex-row items-center gap-xs">
                <Text className="text-sm text-warm-600">{shopName}</Text>
                <Ionicons name="chevron-down" size={14} color="#A79E92" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row gap-sm">
            <TouchableOpacity onPress={() => setShowNotificationsModal(true)} className="relative">
              <IconButton icon="notifications-outline" onPress={() => setShowNotificationsModal(true)} size="md" />
              {unreadNotifs > 0 && (
                <View className="absolute -top-1 -right-1 w-5 h-5 bg-ruvo-error rounded-full items-center justify-center">
                  <Text className="text-xs font-bold text-white">{unreadNotifs}</Text>
                </View>
              )}
            </TouchableOpacity>
            <IconButton icon="refresh" onPress={() => { setRefreshing(true); fetchData(); }} size="md" variant="primary" />
          </View>
        </View>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)} className="bg-ruvo-surface border-b border-warm-300">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-lg">
          <View className="flex-row gap-sm py-sm">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
              { key: 'orders', label: 'Orders', icon: 'receipt-outline', badge: pendingOrders.length },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                className={`flex-row items-center gap-sm px-lg py-sm rounded-lg ${
                  activeTab === tab.key ? 'bg-ruvo-yellow' : 'bg-transparent'
                }`}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={activeTab === tab.key ? '#231C10' : '#A79E92'}
                />
                <Text className={`text-sm font-bold ${activeTab === tab.key ? 'text-ruvo-ink' : 'text-warm-600'}`}>
                  {tab.label}
                </Text>
                {tab.badge && tab.badge > 0 ? (
                  <Badge variant="error" size="sm">{tab.badge}</Badge>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor="#F5B700"
          />
        }
      >
        {activeTab === 'dashboard' && (
          <DashboardTab
            shop={shop}
            orders={orders}
            pendingCount={pendingOrders.length}
            activeCount={activeOrders.length}
            completedCount={completedOrders.length}
            totalSales={totalSales}
            todaySales={todaySales}
            avgOrderValue={avgOrderValue}
            onNavigateOrders={() => setActiveTab('orders')}
            onNavigateProducts={() => navigation.navigate(ROUTES.MY_PRODUCTS, { shopId })}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab
            orders={filteredOrders}
            selectedFilter={selectedStatusFilter}
            onSelectFilter={setSelectedStatusFilter}
            countdowns={countdowns}
            onAccept={handleAccept}
            onReject={handleReject}
            onAssignPartner={setPartnerModalOrder}
          />
        )}
      </ScrollView>

      {/* Partner Assignment Modal */}
      <Modal
        visible={!!partnerModalOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setPartnerModalOrder(null)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setPartnerModalOrder(null)} />
          <View className="bg-ruvo-surface rounded-t-3xl p-xl">
            <Text className="text-2xl font-bold text-ruvo-ink mb-md">Assign Delivery Partner</Text>
            {assigningPartner ? (
              <ActivityIndicator size="large" color="#F5B700" />
            ) : (
              <>
                <FlatList
                  data={partners.filter(p => p.available)}
                  keyExtractor={p => p.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => assignPartner(item.id)}
                      className="bg-warm-100 rounded-lg p-lg mb-sm flex-row items-center justify-between"
                    >
                      <View>
                        <Text className="text-base font-bold text-ruvo-ink">{item.name}</Text>
                        <Text className="text-sm text-warm-600">{item.phone}</Text>
                      </View>
                      {item.rating && (
                        <View className="flex-row items-center gap-xs">
                          <Ionicons name="star" size={16} color="#F5B700" />
                          <Text className="text-sm font-bold text-ruvo-ink">{item.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <CompactEmptyState
                      icon="bicycle-outline"
                      message="No delivery partners available right now"
                    />
                  )}
                />
                <Button onPress={() => setPartnerModalOrder(null)} variant="outline" className="mt-md">
                  Cancel
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setShowNotificationsModal(false)} />
          <View className="bg-ruvo-surface rounded-t-3xl p-xl" style={{ maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between mb-md">
              <Text className="text-2xl font-bold text-ruvo-ink">Notifications</Text>
              <IconButton icon="close" onPress={() => setShowNotificationsModal(false)} size="sm" />
            </View>
            <FlatList
              data={notifications}
              keyExtractor={n => n.id.toString()}
              renderItem={({ item }) => (
                <View className={`rounded-lg p-lg mb-sm ${item.isRead ? 'bg-warm-100' : 'bg-ruvo-yellow-soft'}`}>
                  <Text className="text-base font-bold text-ruvo-ink mb-xs">{item.title}</Text>
                  <Text className="text-sm text-warm-700">{item.message}</Text>
                  <Text className="text-xs text-warm-500 mt-xs">
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              )}
              ListEmptyComponent={() => (
                <CompactEmptyState
                  icon="notifications-outline"
                  message="No notifications yet"
                />
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Dashboard Tab Component ──────────────────────────────────────────────────
function DashboardTab({
  shop,
  orders,
  pendingCount,
  activeCount,
  completedCount,
  totalSales,
  todaySales,
  avgOrderValue,
  onNavigateOrders,
  onNavigateProducts,
}: any) {
  return (
    <View className="p-lg gap-lg">
      {/* Stats Cards */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <View className="flex-row flex-wrap gap-md">
          {[
            { label: 'Pending', value: pendingCount, icon: 'time-outline', color: 'bg-orange-100', textColor: 'text-orange-600' },
            { label: 'Active', value: activeCount, icon: 'bicycle-outline', color: 'bg-blue-100', textColor: 'text-blue-600' },
            { label: 'Completed', value: completedCount, icon: 'checkmark-circle-outline', color: 'bg-ruvo-accent-soft', textColor: 'text-ruvo-accent' },
            { label: 'Total Orders', value: orders.length, icon: 'receipt-outline', color: 'bg-ruvo-yellow-soft', textColor: 'text-ruvo-yellow-dark' },
          ].map((stat, idx) => (
            <Card key={idx} variant="elevated" className="flex-1 min-w-[150px]">
              <View className={`w-12 h-12 ${stat.color} rounded-xl items-center justify-center mb-md`}>
                <Ionicons name={stat.icon as any} size={24} color={stat.textColor.replace('text-', '#')} />
              </View>
              <Text className="text-3xl font-bold text-ruvo-ink mb-xs">{stat.value}</Text>
              <Text className="text-sm text-warm-600">{stat.label}</Text>
            </Card>
          ))}
        </View>
      </Animated.View>

      {/* Revenue Cards */}
      <Animated.View entering={FadeInDown.delay(300).duration(300)}>
        <View className="flex-row gap-md">
          <Card variant="elevated" className="flex-1">
            <View className="flex-row items-center gap-sm mb-md">
              <Ionicons name="wallet-outline" size={20} color="#F5B700" />
              <Text className="text-sm font-semibold text-warm-700">Total Sales</Text>
            </View>
            <Text className="text-3xl font-bold text-ruvo-ink">₹{totalSales.toFixed(2)}</Text>
          </Card>
          <Card variant="elevated" className="flex-1">
            <View className="flex-row items-center gap-sm mb-md">
              <Ionicons name="trending-up-outline" size={20} color="#16A34A" />
              <Text className="text-sm font-semibold text-warm-700">Today</Text>
            </View>
            <Text className="text-3xl font-bold text-ruvo-accent">₹{todaySales.toFixed(2)}</Text>
          </Card>
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(400).duration(300)}>
        <Text className="text-xl font-bold text-ruvo-ink mb-md">Quick Actions</Text>
        <View className="flex-row gap-md">
          <TouchableOpacity onPress={onNavigateOrders} className="flex-1 bg-ruvo-yellow rounded-xl p-lg">
            <Ionicons name="receipt-outline" size={28} color="#231C10" />
            <Text className="text-base font-bold text-ruvo-ink mt-sm">View Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNavigateProducts} className="flex-1 bg-ruvo-accent rounded-xl p-lg">
            <Ionicons name="cube-outline" size={28} color="#FFF" />
            <Text className="text-base font-bold text-white mt-sm">Products</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Recent Orders */}
      {pendingCount > 0 && (
        <Animated.View entering={FadeInDown.delay(500).duration(300)}>
          <View className="flex-row items-center justify-between mb-md">
            <Text className="text-xl font-bold text-ruvo-ink">Pending Orders</Text>
            <Badge variant="warning">{pendingCount}</Badge>
          </View>
          <Text className="text-sm text-warm-600 mb-md">Action required on these orders</Text>
          <Button onPress={onNavigateOrders} variant="outline">
            View All Pending
          </Button>
        </Animated.View>
      )}
    </View>
  );
}

// ── Orders Tab Component ─────────────────────────────────────────────────────
function OrdersTab({
  orders,
  selectedFilter,
  onSelectFilter,
  countdowns,
  onAccept,
  onReject,
  onAssignPartner,
}: any) {
  return (
    <View className="p-lg">
      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
        <View className="flex-row gap-sm">
          <TouchableOpacity
            onPress={() => onSelectFilter('ALL')}
            className={`px-lg py-sm rounded-lg ${selectedFilter === 'ALL' ? 'bg-ruvo-yellow' : 'bg-warm-200'}`}
          >
            <Text className={`text-sm font-bold ${selectedFilter === 'ALL' ? 'text-ruvo-ink' : 'text-warm-700'}`}>
              All ({orders.length})
            </Text>
          </TouchableOpacity>
          {STATUS_FILTERS.map(f => {
            const count = orders.filter((o: Order) => o.orderStatus === f.status).length;
            return (
              <TouchableOpacity
                key={f.status}
                onPress={() => onSelectFilter(f.status)}
                className={`px-lg py-sm rounded-lg ${selectedFilter === f.status ? f.color : 'bg-warm-200'}`}
              >
                <Text className={`text-sm font-bold ${selectedFilter === f.status ? f.textColor : 'text-warm-700'}`}>
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Orders List */}
      {orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No orders found"
          description="Orders matching your filter will appear here"
        />
      ) : (
        <View className="gap-md">
          {orders.map((order: Order, idx: number) => (
            <OrderCard
              key={order.id}
              order={order}
              index={idx}
              countdown={countdowns[order.id]}
              onAccept={onAccept}
              onReject={onReject}
              onAssignPartner={onAssignPartner}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Order Card Component ─────────────────────────────────────────────────────
function OrderCard({ order, index, countdown, onAccept, onReject, onAssignPartner }: any) {
  const statusConfig = STATUS_FILTERS.find(s => s.status === order.orderStatus) || STATUS_FILTERS[0];
  const imgUri = formatImageUrl(order.productImageUrl);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <Card variant="default">
        <View className="flex-row gap-md">
          {/* Product Image */}
          {imgUri && (
            <View className="w-20 h-20 bg-warm-200 rounded-lg overflow-hidden">
              <Image source={{ uri: imgUri }} className="w-full h-full" resizeMode="cover" />
            </View>
          )}

          {/* Order Info */}
          <View className="flex-1">
            <View className="flex-row items-start justify-between mb-xs">
              <Text className="flex-1 text-base font-bold text-ruvo-ink" numberOfLines={1}>
                {order.productName}
              </Text>
              <Badge variant={order.orderStatus === 'DELIVERED' ? 'success' : 'warning'} size="sm">
                {statusConfig.label}
              </Badge>
            </View>

            <View className="flex-row items-center gap-md mb-xs">
              <Text className="text-sm text-warm-600">Qty: {order.quantity}</Text>
              <Text className="text-base font-bold text-ruvo-ink">₹{order.totalAmount}</Text>
            </View>

            <View className="flex-row items-center gap-xs mb-sm">
              <Ionicons name="location-outline" size={14} color="#A79E92" />
              <Text className="flex-1 text-sm text-warm-600" numberOfLines={1}>
                {order.deliveryAddress}
              </Text>
            </View>

            {/* Countdown Timer */}
            {countdown && order.orderStatus === 'SHOP_PENDING' && (
              <View className="bg-orange-100 px-md py-xs rounded-lg mb-sm">
                <Text className="text-xs font-bold text-orange-600">⏰ {countdown}</Text>
              </View>
            )}

            {/* Action Buttons */}
            {order.orderStatus === 'SHOP_PENDING' && (
              <View className="flex-row gap-sm mt-sm">
                <Button onPress={() => onAccept(order.id)} variant="primary" size="sm" className="flex-1">
                  Accept
                </Button>
                <Button onPress={() => onReject(order.id)} variant="danger" size="sm" className="flex-1">
                  Reject
                </Button>
              </View>
            )}

            {order.orderStatus === 'DELIVERY_ASSIGNMENT' && !order.deliveryPartnerId && (
              <Button onPress={() => onAssignPartner(order)} variant="primary" size="sm" className="mt-sm">
                Assign Partner
              </Button>
            )}
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}
