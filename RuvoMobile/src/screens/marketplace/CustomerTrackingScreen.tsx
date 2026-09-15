import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Animated,
  Linking,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getOrder } from '../../services/orderService';
import { Order } from '../../types/order';
import { API_BASE_URL } from '../../config/api';

import MapView, { Marker, Polyline } from 'react-native-maps';
import { Client } from '@stomp/stompjs';
// @ts-ignore
import SockJS from 'sockjs-client';
import 'text-encoding';

// ─── Constants ────────────────────────────────────────────────────────────────
const CANCELLED_STATUSES = [
  'SHOP_REJECTED',
  'CANCELLED',
  'SHOP_CANCELLED',
  'SHOP_TIMEOUT',
  'CANCELLED_SHOP_TIMEOUT',
  'CANCELLED_BY_SHOP',
  'CANCELLED_NO_PARTNER_FOUND',
  'FAILED',
  'PAYMENT_FAILED',
];

const TIMELINE_STEPS = [
  { key: 'placed',    label: 'Order Placed',    icon: 'receipt-outline' as const },
  { key: 'accepted',  label: 'Shop Accepted',   icon: 'storefront-outline' as const },
  { key: 'pickedup',  label: 'Picked Up',       icon: 'bag-check-outline' as const },
  { key: 'outgoing',  label: 'Out for Delivery',icon: 'bicycle-outline' as const },
  { key: 'delivered', label: 'Delivered',        icon: 'checkmark-circle-outline' as const },
];

function isStepActive(step: string, status: string): boolean {
  const s = status || '';
  switch (step) {
    case 'placed':    return true;
    case 'accepted':  return ['SHOP_ACCEPTED','DELIVERY_ASSIGNMENT','DELIVERY_ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED'].indexOf(s) >= 0;
    case 'pickedup':  return ['PICKED_UP','OUT_FOR_DELIVERY','DELIVERED'].indexOf(s) >= 0;
    case 'outgoing':  return ['OUT_FOR_DELIVERY','DELIVERED'].indexOf(s) >= 0;
    case 'delivered': return s === 'DELIVERED';
    default: return false;
  }
}

function formatProductImageUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}
// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CustomerTrackingScreen() {
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const { colors, typography, radius, shadows, spacing }  = useTheme();
  const { token }   = useAuth();

  const orderId = route.params?.orderId;

  const [order, setOrder]             = useState<Order | null>(null);
  const [loading, setLoading]         = useState(true);
  const [cancelling, setCancelling]   = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<{ id?: number; name: string; phone: string; locationName?: string; latitude?: number; longitude?: number } | null>(null);

  // Map expansion toggle state
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const stepAnims = useRef(TIMELINE_STEPS.map(() => new Animated.Value(0))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const stompClient = useRef<Client | null>(null);

  const handleCancelOrder = () => {
    if (!orderId || !token) return;
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No, Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();
              if (res.ok) {
                Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
                setOrder(prev => prev ? { ...prev, orderStatus: 'CANCELLED_BY_USER' } : null);
              } else {
                Alert.alert('Cannot Cancel', data.message || 'Failed to cancel order.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while cancelling order.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  // Pulse animation for LIVE badge
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Fetch partner info helper
  const fetchPartnerDetails = (pId: number) => {
    if (!orderId || !token) return;
    fetch(`${API_BASE_URL}/api/orders/${orderId}/partner`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.assigned) {
          setPartnerInfo({
            id: d.id,
            name: d.name,
            phone: d.phone,
            locationName: d.locationName,
            latitude: d.latitude,
            longitude: d.longitude,
          });
          if (d.latitude && d.longitude) {
            setPartnerLocation({ latitude: d.latitude, longitude: d.longitude });
          }
        }
      })
      .catch(() => {});
  };

  // Fetch order details & initial partner info
  const fetchOrder = useCallback(() => {
    if (!orderId || !token) { setLoading(false); return; }

    getOrder(orderId, token)
      .then(fetched => {
        setOrder(fetched);
        setLoading(false);
        if (fetched.deliveryPartnerId) {
          fetchPartnerDetails(fetched.deliveryPartnerId);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to fetch order details');
        setLoading(false);
      });
  }, [orderId, token]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrder();
    setTimeout(() => setRefreshing(false), 1500);
  }, [fetchOrder]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Polling partner location every 5 seconds while active
  useEffect(() => {
    if (!order || !order.deliveryPartnerId) return;
    if (order.orderStatus === 'DELIVERED') return;
    if (CANCELLED_STATUSES.indexOf(order.orderStatus || '') >= 0) return;

    const interval = setInterval(() => {
      fetchPartnerDetails(order.deliveryPartnerId!);
    }, 5000);

    return () => clearInterval(interval);
  }, [order, orderId, token]);

  // Animate timeline on status change
  useEffect(() => {
    if (!order) return;
    TIMELINE_STEPS.forEach((step, i) => {
      const active = isStepActive(step.key, order.orderStatus || '');
      Animated.spring(stepAnims[i], {
        toValue: active ? 1 : 0,
        delay: i * 120,
        useNativeDriver: true,
        friction: 5,
      }).start();
    });
  }, [order && order.orderStatus]);

  // WebSocket live tracking
  useEffect(() => {
    if (!order || !order.deliveryPartnerId) return;
    if (order.orderStatus === 'DELIVERED') return;
    if (CANCELLED_STATUSES.indexOf(order.orderStatus || '') >= 0) return;

    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws';
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });
    client.webSocketFactory = () => new WebSocket(wsUrl) as any;
    client.onConnect = () => {
      client.subscribe(`/topic/delivery/${order.deliveryPartnerId}`, (msg) => {
        if (msg.body) {
          try {
            const loc = JSON.parse(msg.body);
            setPartnerLocation({ latitude: loc.latitude, longitude: loc.longitude });
          } catch {}
        }
      });
    };
    client.activate();
    stompClient.current = client;
    return () => { client.deactivate(); };
  }, [order]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.loaderBox, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: 'Poppins_700Bold' }}>Loading live tracking...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.loaderBox, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={52} color="#EF4444" />
        <Text style={{ color: colors.textPrimary, marginTop: 12, fontFamily: 'Poppins_800ExtraBold' }}>Order not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#FFF', fontFamily: 'Poppins_800ExtraBold' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isCancelled = CANCELLED_STATUSES.indexOf(order.orderStatus || '') >= 0;
  const isLive      = order.orderStatus === 'PICKED_UP' || order.orderStatus === 'OUT_FOR_DELIVERY';

  const destLat = Number(order.deliveryLatitude);
  const destLng = Number(order.deliveryLongitude);
  const shopLat = Number(order.shopLatitude);
  const shopLng = Number(order.shopLongitude);

  const validDestLat = (!isNaN(destLat) && destLat !== 0) ? destLat : (!isNaN(shopLat) && shopLat !== 0) ? shopLat : 28.6139;
  const validDestLng = (!isNaN(destLng) && destLng !== 0) ? destLng : (!isNaN(shopLng) && shopLng !== 0) ? shopLng : 77.2090;

  const destination = { latitude: validDestLat, longitude: validDestLng };

  const productImgUri = formatProductImageUrl(order.productImageUrl);

  const formatETA = () => {
    if (order.orderStatus === 'DELIVERED') return '✅ Delivered successfully';
    if (isLive) return '🚴 Arriving in 10-15 min';
    if (order.orderStatus === 'SHOP_ACCEPTED' || order.orderStatus === 'PREPARING' || order.orderStatus === 'READY') return '🧑‍🍳 Shop is preparing your order';
    if (order.orderStatus === 'ORDER_PLACED' || order.orderStatus === 'SHOP_PENDING') return '🛍️ Order placed successfully';
    if (order.orderStatus === 'CANCELLED' || isCancelled) return '❌ Order Cancelled';
    return '🚀 Processing your order';
  };

  const formatSubtitle = () => {
    if (order.orderStatus === 'DELIVERED') return 'Thank you for ordering with RuVo!';
    if (isLive) return 'Your order is on the way';
    if (isCancelled) return 'This order was cancelled and will not be delivered.';
    return 'We will notify you when it ships';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F9FAFB' }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* ── HEADER (Wireframe: [<] Track Order   Help) ───────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <TouchableOpacity style={styles.helpBtn}>
          <Text style={styles.helpBtnText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF7A00" />
        }
      >
        {/* ── STATUS BLOCK (Wireframe: Arriving in 12 min) ────────────────── */}
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>{formatETA()}</Text>
          <Text style={styles.statusSub}>{formatSubtitle()}</Text>
        </View>

        {/* ── LIVE MAP ───────────────────────────────────────────────────── */}
        <View style={styles.mapContainer}>
          {(!isCancelled && order.orderStatus !== 'DELIVERED') ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{ ...destination, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
            >
              {/* User Location Marker */}
              <Marker coordinate={destination} title="Home">
                <View style={[styles.markerBase, { backgroundColor: '#FF7A00' }]}>
                  <Ionicons name="home" size={16} color="#FFF" />
                </View>
              </Marker>

              {/* Shop Marker */}
              {validDestLat !== shopLat && (
                <Marker coordinate={{ latitude: shopLat, longitude: shopLng }} title="Store">
                  <View style={[styles.markerBase, { backgroundColor: '#111827' }]}>
                    <Ionicons name="storefront" size={16} color="#FFF" />
                  </View>
                </Marker>
              )}

              {/* Rider Marker */}
              {partnerLocation && (
                <Marker coordinate={partnerLocation} title="Rider">
                  <View style={[styles.markerBase, { backgroundColor: '#3478C8' }]}>
                    <Ionicons name="bicycle" size={18} color="#FFF" />
                  </View>
                </Marker>
              )}

              {/* Route */}
              {partnerLocation ? (
                <Polyline coordinates={[partnerLocation, destination]} strokeColor="#3478C8" strokeWidth={4} />
              ) : (shopLat && shopLng) ? (
                <Polyline coordinates={[{ latitude: shopLat, longitude: shopLng }, destination]} strokeColor="#D1D5DB" strokeWidth={4} lineDashPattern={[6, 4]} />
              ) : null}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons name={isCancelled ? "close-circle" : "checkmark-circle"} size={48} color={isCancelled ? '#F87171' : '#34D399'} />
              <Text style={styles.mapPlaceholderText}>
                {isCancelled ? 'Delivery Cancelled' : 'Delivery Completed'}
              </Text>
            </View>
          )}

          <View style={styles.liveMapOverlay}>
            <Text style={styles.liveMapLabel}>LIVE MAP</Text>
          </View>
        </View>

        {/* ── RIDER DETAILS (Wireframe: Rider is nearby) ──────────────────── */}
        {partnerInfo && (
          <View style={styles.riderBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.riderStatusLabel}>Rider is nearby</Text>
            </View>
            <View style={styles.riderInfoRow}>
              <View style={styles.riderAvatar}>
                <Ionicons name="person" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.riderName}>{partnerInfo.name} • ★ 4.8</Text>
                <Text style={styles.riderPhone}>{partnerInfo.phone}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.riderActionBtn} onPress={() => Linking.openURL(`tel:${partnerInfo.phone}`)}>
                  <Ionicons name="call" size={20} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── OTP VERIFICATION ───────────────────────────────────────────── */}
        {order.orderStatus === 'OUT_FOR_DELIVERY' && order.deliveryOtpHash && (
          <View style={styles.otpBox}>
            <Text style={styles.otpPrefix}>Share OTP to verify delivery</Text>
            <Text style={styles.otpHash}>{order.deliveryOtpHash}</Text>
          </View>
        )}

        {/* ── PROMO / AD BOX (Wireframe: SPECIAL FOR YOU) ────────────────── */}
        <View style={styles.promoBox}>
          <Text style={styles.promoBoxTitle}>🎁 SPECIAL FOR YOU</Text>
          <View style={styles.promoBoxInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTextMain}>10% OFF next order</Text>
              <Text style={styles.promoTextSub}>Use RUVO10</Text>
            </View>
            <TouchableOpacity style={styles.promoBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.promoBtnText}>Order</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── BILL DETAILS (Wireframe: Your Order) ────────────────────────── */}
        <View style={styles.billBox}>
          <Text style={styles.billTitle}>Your Order</Text>
          
          <View style={styles.billItemsWrapper}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => {
                const price = item.price ?? Math.round(order.totalAmount / order.items!.length);
                return (
                  <View key={item.id || index} style={styles.billItemRow}>
                    <Text style={styles.billItemName} numberOfLines={1}>{item.quantity} × {item.productName}</Text>
                    <Text style={styles.billItemPrice}>₹{price * item.quantity}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.billItemRow}>
                <Text style={styles.billItemName} numberOfLines={1}>{order.quantity} × {order.productName || 'Order Items'}</Text>
                <Text style={styles.billItemPrice}>₹{order.subtotal || order.totalAmount}</Text>
              </View>
            )}
          </View>

          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalTitle}>Total</Text>
            <Text style={styles.billTotalValue}>₹{order.totalAmount}</Text>
          </View>

          {/* Cancel Logic */}
          {!isCancelled && order.orderStatus !== 'PICKED_UP' && order.orderStatus !== 'OUT_FOR_DELIVERY' && order.orderStatus !== 'DELIVERED' && (
            <TouchableOpacity style={styles.cancelLink} onPress={handleCancelOrder} disabled={cancelling}>
              <Text style={styles.cancelLinkText}>{cancelling ? 'Cancelling...' : 'Cancel Order'}</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: '#111827', textAlign: 'center', marginRight: 0 },
  helpBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3F4F6', borderRadius: 20 },
  helpBtnText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#111827' },

  statusBox: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  statusTitle: { fontSize: 22, fontFamily: 'Poppins_900Black', color: '#111827', marginBottom: 4 },
  statusSub: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#6B7280' },

  mapContainer: {
    height: 250,
    width: '100%',
    backgroundColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
  },
  markerBase: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  mapPlaceholderText: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#6B7280', marginTop: 12 },
  liveMapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  liveMapLabel: { fontSize: 10, fontFamily: 'Poppins_800ExtraBold', color: '#374151', letterSpacing: 1 },

  riderBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  riderStatusLabel: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#059669' },
  riderInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  riderAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  riderName: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold', color: '#111827' },
  riderPhone: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#6B7280', marginTop: 2 },
  riderActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  otpBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FEF9C3',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
    alignItems: 'center',
  },
  otpPrefix: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#B45309', marginBottom: 4 },
  otpHash: { fontSize: 28, fontFamily: 'Poppins_900Black', color: '#D97706', letterSpacing: 4 },

  promoBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
  },
  promoBoxTitle: { fontSize: 11, fontFamily: 'Poppins_800ExtraBold', color: '#FF7A00', letterSpacing: 0.5, marginBottom: 12 },
  promoBoxInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF7ED', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5' },
  promoTextMain: { fontSize: 14, fontFamily: 'Poppins_800ExtraBold', color: '#9A3412', marginBottom: 2 },
  promoTextSub: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#C2410C' },
  promoBtn: { backgroundColor: '#FF7A00', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  promoBtnText: { fontSize: 12, fontFamily: 'Poppins_800ExtraBold', color: '#FFFFFF' },

  billBox: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  billTitle: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#111827', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12, marginBottom: 16 },
  billItemsWrapper: { gap: 12, marginBottom: 16 },
  billItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billItemName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#4B5563', flex: 1, paddingRight: 16 },
  billItemPrice: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#111827' },
  billTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16 },
  billTotalTitle: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#111827' },
  billTotalValue: { fontSize: 18, fontFamily: 'Poppins_900Black', color: '#111827' },

  cancelLink: { alignSelf: 'center', marginTop: 24, paddingVertical: 8 },
  cancelLinkText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#EF4444', textDecorationLine: 'underline' },
});
  container: { flex: 1 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  retryBtn: {
    marginTop: 16,
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 8, marginRight: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', flex: 1 },

  cancelBanner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cancelBannerTitle: { color: '#FFF', fontFamily: 'Poppins_800ExtraBold', fontSize: 15 },
  cancelBannerSub: { color: '#FEE2E2', fontSize: 12, marginTop: 2 },

  mapContainer: { height: 220, backgroundColor: '#F1F5F9' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  partnerMarker: {
    backgroundColor: '#059669',
    padding: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFF',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { color: '#FFF', fontSize: 11, fontFamily: 'Poppins_800ExtraBold' },

  card: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 0.5,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
  },
  cardTitle: { fontSize: 13, fontFamily: 'Poppins_800ExtraBold', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },

  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productImg: { width: 64, height: 64, borderRadius: 10 },
  productImgBox: { width: 64, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 15, fontFamily: 'Poppins_700Bold', flexShrink: 1 },
  productPrice: { fontSize: 17, fontFamily: 'Poppins_800ExtraBold' },
  billingBox: { marginTop: 14, borderTopWidth: 1, paddingTop: 12, gap: 4 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billingLabel: { fontSize: 13 },
  billingValue: { fontSize: 13 },

  otpBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    alignItems: 'center',
    gap: 4,
  },
  otpLabel: { fontSize: 13, color: '#92400E', fontFamily: 'Poppins_700Bold', marginTop: 4 },
  otpCode: { fontSize: 34, fontFamily: 'Poppins_800ExtraBold', color: '#D97706', letterSpacing: 10 },
  otpSub: { fontSize: 12, color: '#B45309', textAlign: 'center' },

  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderWidth: 0.5,
    gap: 14,
  },
  partnerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1D4ED8',
    alignItems: 'center', justifyContent: 'center',
  },
  partnerAvatarLetter: { fontSize: 22, fontFamily: 'Poppins_800ExtraBold', color: '#FFF' },
  livePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  partnerActionBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5,
  },
  partnerIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  partnerName: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold' },
  partnerPhone: { fontSize: 13, marginTop: 2 },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: '#A7F3D0',
  },

  timelineRow: { flexDirection: 'row', minHeight: 44 },
  timelineDotCol: { alignItems: 'center', width: 28, marginRight: 10 },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  timelineLine: { width: 2, flex: 1, marginTop: 4, borderRadius: 2 },
  timelineLabel: { fontSize: 15, marginTop: 1 },
  findingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  findingText: { color: '#D97706', fontSize: 10, fontFamily: 'Poppins_700Bold' },

  cancelCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 0.5,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  cancelCardTitle: { fontSize: 17, fontFamily: 'Poppins_800ExtraBold', color: '#EF4444' },
  cancelCardSub: { fontSize: 13, color: '#EF4444', textAlign: 'center', opacity: 0.85 },

  paymentRow: {
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 0.5,
    borderRadius: 12,
  },
  paymentText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  deliveredBox: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  deliveredTitle: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold', color: '#065F46' },
  deliveredSub: { fontSize: 12, color: '#047857', marginTop: 2 },

  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
});
