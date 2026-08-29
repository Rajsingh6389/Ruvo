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
  if (trimmed.indexOf('http://') === 0 || trimmed.indexOf('https://') === 0) return trimmed;
  return `${API_BASE_URL}${trimmed.indexOf('/') === 0 ? '' : '/'}${trimmed}`;
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading order…</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.loaderBox, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={52} color="#EF4444" />
        <Text style={{ color: colors.textPrimary, marginTop: 12 }}>Order not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isCancelled = CANCELLED_STATUSES.indexOf(order.orderStatus || '') >= 0;
  const isLive      = order.orderStatus === 'PICKED_UP' || order.orderStatus === 'OUT_FOR_DELIVERY';
  const destination = order.deliveryLatitude && order.deliveryLongitude
    ? { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude }
    : { latitude: 28.6139, longitude: 77.2090 };

  const productImgUri = formatProductImageUrl(order.productImageUrl);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {/* ─ HEADER ────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.headingXL, styles.headerTitle, { color: colors.textPrimary }]}>Track Order</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Red Cancelled Banner */}
      {isCancelled && (
        <View style={styles.cancelBanner}>
          <Ionicons name="close-circle" size={26} color="#FFF" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cancelBannerTitle}>Order Cancelled</Text>
            <Text style={styles.cancelBannerSub}>
              {order.orderStatus === 'SHOP_TIMEOUT' || order.orderStatus === 'CANCELLED_SHOP_TIMEOUT'
                ? 'Shop did not accept the order within 10 minutes.'
                : order.orderStatus === 'SHOP_REJECTED'
                ? 'The shopkeeper rejected this order.'
                : order.orderStatus === 'CANCELLED_NO_PARTNER_FOUND'
                ? 'No delivery partner could be assigned.'
                : order.orderStatus === 'CANCELLED_BY_SHOP'
                ? 'Cancelled by the shopkeeper.'
                : 'This order has been cancelled.'}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ─ ORDER DETAILS ───────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card, padding: spacing.cardPad }, shadows.sm]}>
          <Text style={[typography.headingM, styles.cardTitle, { color: colors.textPrimary }]}>Order Details</Text>
          <View style={styles.billingRow}>
            <Text style={[typography.body, styles.billingLabel, { color: colors.textSecondary }]}>Items</Text>
            <Text style={[typography.bodyStrong, styles.billingValue, { color: colors.textPrimary }]}>{order.quantity || 1}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={[typography.body, styles.billingLabel, { color: colors.textSecondary }]}>Total</Text>
            <Text style={[typography.bodyStrong, styles.billingValue, { color: colors.textPrimary }]}>₹{order.totalAmount}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={[typography.body, styles.billingLabel, { color: colors.textSecondary }]}>Payment</Text>
            <Text style={[typography.bodyStrong, styles.billingValue, { color: colors.textPrimary }]}>{order.paymentMethod || 'COD'}</Text>
          </View>
        </View>

        {/* Map Section */}
        <View style={styles.mapContainer}>
          {isLive ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{ ...destination, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            >
              {partnerLocation && (
                <Marker coordinate={partnerLocation} title="Delivery Partner">
                  <View style={styles.partnerMarker}>
                    <Ionicons name="bicycle" size={20} color="#FFF" />
                  </View>
                </Marker>
              )}
              <Marker coordinate={destination} title="Your Location" pinColor="#059669" />
              {partnerLocation && (
                <Polyline
                  coordinates={[partnerLocation, destination]}
                  strokeColor="#059669"
                  strokeWidth={3}
                  lineDashPattern={[6, 4]}
                />
              )}
            </MapView>
          ) : (
            <View style={[styles.mapPlaceholder, { backgroundColor: colors.card }]}>
              <Ionicons name="map" size={48} color={isCancelled ? '#FCA5A5' : '#D1D5DB'} />
              <Text style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center', paddingHorizontal: 24 }}>
                {isCancelled
                  ? 'Order was cancelled. No delivery in progress.'
                  : 'Live map activates when partner picks up your order.'}
              </Text>
            </View>
          )}

          {isLive && (
            <Animated.View style={[styles.liveBadge, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </Animated.View>
          )}
        </View>

        {/* Product Details Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.sm]}>
          <Text style={[typography.headingM, styles.cardTitle, { color: colors.textPrimary }]}>Order Items</Text>
          <View style={styles.productRow}>
            {productImgUri ? (
              <Image source={{ uri: productImgUri }} style={styles.productImg} resizeMode="cover" />
            ) : (
              <View style={[styles.productImgBox, { backgroundColor: colors.background }]}>
                <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
                {order.productName || 'Your Order'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                Qty: {order.quantity}
              </Text>
            </View>
            <Text style={[typography.bodyStrong, styles.productPrice, { color: colors.primary }]}>
              ₹{order.totalAmount}
            </Text>
          </View>

          <View style={[styles.billingBox, { borderTopColor: colors.border, padding: spacing.cardPad }]}>
            {!!order.subtotal && (
              <View style={styles.billingRow}>
                <Text style={[typography.body, styles.billingLabel, { color: colors.textSecondary }]}>Item Total</Text>
                <Text style={[typography.bodyStrong, styles.billingValue, { color: colors.textPrimary }]}>₹{order.subtotal}</Text>
              </View>
            )}
            {!!order.deliveryFee && (
              <View style={styles.billingRow}>
                <Text style={[typography.body, styles.billingLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
                <Text style={[typography.bodyStrong, styles.billingValue, { color: colors.textPrimary }]}>₹{order.deliveryFee}</Text>
              </View>
            )}
            {!!order.platformFee && (
              <View style={styles.billingRow}>
                <Text style={[typography.body, styles.billingLabel, { color: colors.textSecondary }]}>Platform Fee</Text>
                <Text style={[typography.bodyStrong, styles.billingValue, { color: colors.textPrimary }]}>₹{order.platformFee}</Text>
              </View>
            )}
            <View style={[styles.billingRow, { marginTop: 6 }]}>
              <Text style={[typography.bodyStrong, styles.billingLabel, { color: colors.textPrimary, fontWeight: '700' }]}>Grand Total</Text>
              <Text style={[typography.bodyStrong, styles.billingValue, { color: colors.primary, fontWeight: '800' }]}>₹{order.totalAmount}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Verification OTP Card - Only shown when OUT_FOR_DELIVERY */}
        {!isCancelled && (order.orderStatus === 'OUT_FOR_DELIVERY' || order.orderStatus === 'PICKED_UP') && (
          <View style={styles.otpBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="key-outline" size={20} color="#D97706" />
              <Text style={styles.otpLabel}>Delivery Verification OTP</Text>
            </View>
            <Text style={styles.otpCode}>
              {order.deliveryOtpHash || '...'}
            </Text>
            <Text style={styles.otpSub}>Give this 6-digit OTP code to your delivery partner when receiving your order.</Text>
          </View>
        )}

        {/* Delivered & Verified Badge */}
        {order.orderStatus === 'DELIVERED' && (
          <View style={styles.deliveredBox}>
            <Ionicons name="checkmark-circle" size={24} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveredTitle}>Order Delivered & Verified</Text>
              <Text style={styles.deliveredSub}>OTP verified. Thank you for ordering with RuVo!</Text>
            </View>
          </View>
        )}

        {/* Delivery Partner Details Card */}
        {partnerInfo && (
          <View style={styles.partnerCard}>
            <View style={styles.partnerIconBox}>
              <Ionicons name="bicycle" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.partnerName}>{partnerInfo.name}</Text>
                <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#1D4ED8', fontSize: 10, fontWeight: '700' }}>DELIVERY PARTNER</Text>
                </View>
              </View>
              <Text style={styles.partnerPhone}> {partnerInfo.phone}</Text>
              {partnerInfo.locationName ? (
                <Text style={{ color: '#4B5563', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {partnerInfo.locationName}
                </Text>
              ) : (
                <Text style={{ color: '#059669', fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                  Live Tracking Active
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${partnerInfo.phone}`)}
            >
              <Ionicons name="call" size={18} color="#059669" />
            </TouchableOpacity>
          </View>
        )}

        {/* Animated Timeline or Red Cancel Card */}
        {!isCancelled ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.sm]}>
            <Text style={[typography.headingM, styles.cardTitle, { color: colors.textPrimary }]}>Delivery Progress</Text>
            {TIMELINE_STEPS.map((step, i) => {
              const active = isStepActive(step.key, order.orderStatus || '');
              const isLast = i === TIMELINE_STEPS.length - 1;
              const nextActive = !isLast && isStepActive(TIMELINE_STEPS[i + 1].key, order.orderStatus || '');

              const scale   = stepAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
              const opacity = stepAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineDotCol}>
                    <Animated.View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: active ? '#059669' : colors.border, transform: [{ scale }], opacity },
                      ]}
                    >
                      {active && <Ionicons name="checkmark" size={10} color="#FFF" />}
                    </Animated.View>
                    {!isLast && (
                      <Animated.View
                        style={[styles.timelineLine, { backgroundColor: nextActive ? '#059669' : colors.border }]}
                      />
                    )}
                  </View>
                  <Animated.View style={{ flex: 1, paddingBottom: isLast ? 0 : 18, opacity }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={step.icon} size={15} color={active ? '#059669' : colors.textSecondary} />
                      <Text style={[typography.bodyStrong, styles.timelineLabel, { color: active ? colors.textPrimary : colors.textSecondary, fontWeight: active ? '700' : '400' }]}>
                        {step.label}
                      </Text>
                      {i === 1 && active && (order.orderStatus === 'DELIVERY_ASSIGNMENT' || order.orderStatus === 'DELIVERY_ASSIGNED') && (
                        <View style={styles.findingBadge}>
                          <Text style={styles.findingText}>Finding Partner</Text>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.cancelCard}>
            <Ionicons name="close-circle" size={40} color="#EF4444" />
            <Text style={styles.cancelCardTitle}>
              {order.orderStatus === 'SHOP_TIMEOUT' || order.orderStatus === 'CANCELLED_SHOP_TIMEOUT'
                ? 'Order Timed Out'
                : 'Order Not Accepted'}
            </Text>
            <Text style={styles.cancelCardSub}>
              {order.orderStatus === 'SHOP_TIMEOUT' || order.orderStatus === 'CANCELLED_SHOP_TIMEOUT'
                ? 'The shopkeeper did not accept your order in time. Your order has been automatically cancelled.'
                : order.orderStatus === 'SHOP_REJECTED'
                ? 'The shopkeeper rejected this order. Any payment made will be refunded.'
                : order.orderStatus === 'CANCELLED_NO_PARTNER_FOUND'
                ? 'We could not find a delivery partner in time. Order cancelled.'
                : order.orderStatus === 'CANCELLED_BY_SHOP'
                ? 'The shopkeeper cancelled this order.'
                : order.orderStatus === 'CANCELLED_BY_USER'
                ? 'You cancelled this order.'
                : 'This order was cancelled.'}
            </Text>
          </View>
        )}

        {/* Payment Method */}
        <View style={[styles.paymentRow, { borderColor: colors.border, padding: spacing.cardPad }]}>
          <Ionicons
            name={order.paymentMethod === 'ONLINE' ? 'card-outline' : 'cash-outline'}
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[typography.body, styles.paymentText, { color: colors.textSecondary }]}>
            {order.paymentMethod === 'ONLINE' ? 'Paid Online' : 'Cash on Delivery'}
          </Text>
        </View>

        {/* Customer Cancel Order Button (Allowed if not picked up yet) */}
        {!isCancelled &&
         order.orderStatus !== 'PICKED_UP' &&
         order.orderStatus !== 'OUT_FOR_DELIVERY' &&
         order.orderStatus !== 'DELIVERED' && (
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: colors.error, borderRadius: radius.button }, shadows.sm]}
            onPress={handleCancelOrder}
          >
            <Text style={[typography.button, styles.cancelBtnText, { color: '#FFF' }]}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },

  cancelBanner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cancelBannerTitle: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  cancelBannerSub: { color: '#FEE2E2', fontSize: 12, marginTop: 2 },

  mapContainer: { height: 220, backgroundColor: '#F1F5F9' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  partnerMarker: {
    backgroundColor: '#059669',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
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
  liveText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  card: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },

  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productImg: { width: 64, height: 64, borderRadius: 10 },
  productImgBox: { width: 64, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  productPrice: { fontSize: 17, fontWeight: '800' },
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
  otpLabel: { fontSize: 13, color: '#92400E', fontWeight: '700', marginTop: 4 },
  otpCode: { fontSize: 34, fontWeight: '900', color: '#D97706', letterSpacing: 10 },
  otpSub: { fontSize: 12, color: '#B45309', textAlign: 'center' },

  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  partnerIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  partnerName: { fontSize: 15, fontWeight: '700', color: '#1D4ED8' },
  partnerPhone: { fontSize: 13, color: '#3B82F6', marginTop: 2 },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#A7F3D0',
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
  findingText: { color: '#D97706', fontSize: 10, fontWeight: '700' },

  cancelCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  cancelCardTitle: { fontSize: 17, fontWeight: '800', color: '#EF4444' },
  cancelCardSub: { fontSize: 13, color: '#EF4444', textAlign: 'center', opacity: 0.85 },

  paymentRow: {
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  paymentText: { fontSize: 13, fontWeight: '600' },

  deliveredBox: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  deliveredTitle: { fontSize: 15, fontWeight: '800', color: '#065F46' },
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
    fontWeight: '700',
  },
});
