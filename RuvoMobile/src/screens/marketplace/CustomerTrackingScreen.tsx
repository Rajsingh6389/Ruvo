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
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── MAP HERO (Top 45% of Screen) ─────────────────────────────────── */}
      <View style={styles.heroMap}>
        {(!isCancelled && order.orderStatus !== 'DELIVERED') ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ ...destination, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
            showsUserLocation={false}
          >
            <Marker coordinate={destination} title="Drop Location">
              <View style={[styles.markerBase, { backgroundColor: '#111827' }]}>
                <Ionicons name="home" size={16} color="#FFF" />
              </View>
            </Marker>
            {validDestLat !== shopLat && (
              <Marker coordinate={{ latitude: shopLat, longitude: shopLng }} title="Shop">
                <View style={[styles.markerBase, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="storefront" size={16} color="#FFF" />
                </View>
              </Marker>
            )}
            {partnerLocation && (
              <Marker coordinate={partnerLocation} title="Rider">
                <View style={[styles.riderMarker, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="bicycle" size={20} color="#FFF" />
                </View>
              </Marker>
            )}
            {partnerLocation ? (
              <Polyline coordinates={[partnerLocation, destination]} strokeColor="#10B981" strokeWidth={5} />
            ) : (shopLat && shopLng) ? (
              <Polyline coordinates={[{ latitude: shopLat, longitude: shopLng }, destination]} strokeColor="#9CA3AF" strokeWidth={4} lineDashPattern={[8, 8]} />
            ) : null}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name={isCancelled ? "close-circle" : "checkmark-circle"} size={64} color={isCancelled ? '#EF4444' : '#10B981'} />
            <Text style={styles.mapPlaceholderText}>
              {isCancelled ? 'Order Cancelled' : 'Order Delivered Successfully'}
            </Text>
          </View>
        )}
        <View style={styles.liveBadgeOverlay}>
          <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }], marginRight: 6 }]} />
          <Text style={styles.liveBadgeText}>LIVE TRACKING</Text>
        </View>
      </View>

      {/* ── FLOATING HEADER ──────────────────────────────────────────────── */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.floatBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatBtn}>
          <Text style={styles.helpBtnText}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* ── OVERLAPPING BOTTOM SHEET CONTENT ─────────────────────────────── */}
      <ScrollView
        style={styles.sheetContainer}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF7A00" />}
      >
        <View style={styles.mainCard}>
          {/* Status Header */}
          <View style={styles.statusHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusMainText}>{formatETA()}</Text>
              <Text style={styles.statusSubText}>{formatSubtitle()}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Swiggy-like Horizontal Timeline */}
          {!isCancelled && order.orderStatus !== 'DELIVERED' && (
            <View style={styles.horizontalTimeline}>
              {TIMELINE_STEPS.map((step, index) => {
                const active = isStepActive(step.key, order.orderStatus || '');
                const isLast = index === TIMELINE_STEPS.length - 1;
                const activeColor = active ? '#FF7A00' : '#E5E7EB';
                return (
                  <View key={step.key} style={styles.timelineHItem}>
                    <View style={styles.timelineHLineWrap}>
                      <View style={[styles.timelineHDot, { borderColor: activeColor, backgroundColor: active ? '#FF7A00' : '#FFF' }]} />
                      {!isLast && <View style={[styles.timelineHLine, { backgroundColor: activeColor }]} />}
                    </View>
                    <Text style={[styles.timelineHLabel, active && { color: '#111827', fontFamily: 'Poppins_700Bold' }]} numberOfLines={2}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* OTP Box */}
          {order.orderStatus === 'OUT_FOR_DELIVERY' && order.deliveryOtpHash && (
            <View style={styles.otpCard}>
              <View style={styles.otpIconWrap}>
                <Ionicons name="shield-checkmark" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.otpTitle}>Delivery PIN</Text>
                <Text style={styles.otpSubtitle}>Share this with rider</Text>
              </View>
              <Text style={styles.otpHashCode}>{order.deliveryOtpHash}</Text>
            </View>
          )}

          {/* Rider Box */}
          {partnerInfo && (
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <Ionicons name="bicycle" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.riderName}>{partnerInfo.name}</Text>
                <Text style={styles.riderRole}>Delivery Partner • 4.8 ★</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.callRiderBtn} onPress={() => Linking.openURL(`tel:${partnerInfo.phone}`)}>
                  <Ionicons name="call" size={18} color="#FFF" />
                  <Text style={styles.callRiderText}>Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>



        {/* Bill Box */}
        <View style={styles.billBox}>
          <Text style={styles.billTitle}>Order Summary</Text>
          
          <View style={styles.billItemsWrapper}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => {
                const price = item.price ?? Math.round((order.subtotal || order.totalAmount) / order.items!.length);
                const itImg = item.productImageUrl ? (item.productImageUrl.startsWith('http') ? item.productImageUrl : `${API_BASE_URL}${item.productImageUrl}`) : null;
                return (
                  <View key={item.id || index} style={styles.billItemRowExpanded}>
                    {itImg ? (
                      <Image source={{ uri: itImg }} style={styles.billItemImage} />
                    ) : (
                      <View style={styles.billItemImagePlaceholder}>
                        <Ionicons name="fast-food-outline" size={16} color="#9CA3AF" />
                      </View>
                    )}
                    <View style={styles.billItemInfo}>
                      <Text style={styles.billItemNameExpanded} numberOfLines={1}>{item.productName}</Text>
                      <Text style={styles.billItemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.billItemPriceExpanded}>₹{price * item.quantity}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.billItemRowExpanded}>
                {order.productImageUrl ? (
                    <Image source={{ uri: order.productImageUrl.startsWith('http') ? order.productImageUrl : `${API_BASE_URL}${order.productImageUrl}` }} style={styles.billItemImage} />
                ) : (
                    <View style={styles.billItemImagePlaceholder}>
                      <Ionicons name="fast-food-outline" size={16} color="#9CA3AF" />
                    </View>
                )}
                <View style={styles.billItemInfo}>
                  <Text style={styles.billItemNameExpanded} numberOfLines={1}>{order.productName || 'Order Items'}</Text>
                  <Text style={styles.billItemQty}>Qty: {order.quantity}</Text>
                </View>
                <Text style={styles.billItemPriceExpanded}>₹{order.subtotal || order.totalAmount}</Text>
              </View>
            )}
          </View>

          {/* Breakdown List */}
          <View style={styles.breakdownBox}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>₹{order.subtotal || order.totalAmount}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Delivery Fee</Text>
              <Text style={styles.breakdownValue}>₹{order.deliveryFee || 0}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Fee</Text>
              <Text style={styles.breakdownValue}>₹{order.platformFee || 0}</Text>
            </View>
            {order.couponDiscount && order.couponDiscount > 0 ? (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Discount</Text>
                <Text style={styles.breakdownValueDiscount}>-₹{order.couponDiscount}</Text>
              </View>
            ) : null}
            <View style={styles.dividerDashed} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <Text style={styles.billTotalTitle}>Grand Total</Text>
              <Text style={styles.billTotalValue}>₹{order.totalAmount}</Text>
            </View>
          </View>

          {/* Cancel Logic */}
          {!isCancelled && order.orderStatus !== 'PICKED_UP' && order.orderStatus !== 'OUT_FOR_DELIVERY' && order.orderStatus !== 'DELIVERED' && (
            <TouchableOpacity style={styles.cancelLink} onPress={handleCancelOrder} disabled={cancelling}>
              <Text style={styles.cancelLinkText}>{cancelling ? 'Cancelling...' : 'Cancel Order'}</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  
  heroMap: {
    height: '45%',
    width: '100%',
    backgroundColor: '#E5E7EB',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  markerBase: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4 },
  riderMarker: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF', elevation: 8, shadowColor: '#10B981', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  mapPlaceholderText: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#374151', marginTop: 12 },
  
  liveBadgeOverlay: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
  },
  liveBadgeText: { fontSize: 10, fontFamily: 'Poppins_800ExtraBold', color: '#111827', letterSpacing: 0.5 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },

  floatingHeader: {
    position: 'absolute',
    top: 45,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  floatBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', 
    alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  helpBtnText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#111827' },

  sheetContainer: {
    flex: 1,
    marginTop: '68%',
  },
  sheetContent: {
    paddingBottom: 40,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 12,
  },
  statusHeaderRow: { marginBottom: 16 },
  statusMainText: { fontSize: 22, fontFamily: 'Poppins_900Black', color: '#111827', letterSpacing: -0.5 },
  statusSubText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  dividerThick: { height: 2, backgroundColor: '#E5E7EB', marginVertical: 16 },

  horizontalTimeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 4 },
  timelineHItem: { flex: 1, alignItems: 'center' },
  timelineHLineWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 12 },
  timelineHDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, zIndex: 2 },
  timelineHLine: { flex: 1, height: 3, marginLeft: -2, zIndex: 1, borderRadius: 2 },
  timelineHLabel: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', color: '#9CA3AF', textAlign: 'center', marginTop: 8, paddingHorizontal: 2 },

  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF7A00', alignItems: 'center', justifyContent: 'center' },
  riderName: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold', color: '#111827' },
  riderRole: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#6B7280', marginTop: 1 },
  callRiderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  callRiderText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#FFF' },

  otpCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#FDE68A' },
  otpIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  otpTitle: { fontSize: 14, fontFamily: 'Poppins_800ExtraBold', color: '#92400E' },
  otpSubtitle: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#B45309' },
  otpHashCode: { fontSize: 24, fontFamily: 'Poppins_900Black', color: '#D97706', letterSpacing: 4 },

  upsellBlock: { backgroundColor: '#FFFFFF', paddingVertical: 20, marginTop: 12, borderRadius: 24 },
  upsellRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  upsellMainTitle: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#111827' },
  upsellSubTitle: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#6B7280' },
  upsellTimerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  upsellTimerTxt: { fontSize: 12, fontFamily: 'Poppins_800ExtraBold', color: '#D97706' },
  upsellItemCard: { width: 140, backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginRight: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  upsellIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  upsellItemName: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#111827', marginBottom: 6 },
  upsellBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upsellItemPrice: { fontSize: 14, fontFamily: 'Poppins_800ExtraBold', color: '#111827' },
  upsellAddBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  upsellAddText: { fontSize: 11, fontFamily: 'Poppins_800ExtraBold', color: '#EF4444' },

  billBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginTop: 12,
    borderRadius: 24,
    marginHorizontal: 0,
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

  billItemRowExpanded: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  billItemImage: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3F4F6' },
  billItemImagePlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  billItemInfo: { flex: 1, paddingHorizontal: 12 },
  billItemNameExpanded: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#111827' },
  billItemQty: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#6B7280', marginTop: 2 },
  billItemPriceExpanded: { fontSize: 14, fontFamily: 'Poppins_800ExtraBold', color: '#111827' },
  breakdownBox: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginTop: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#4B5563' },
  breakdownValue: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#111827' },
  breakdownValueDiscount: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#10B981' },
  dividerDashed: { height: 1.5, backgroundColor: '#E5E7EB', marginVertical: 12 },
});
