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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getOrder } from '../../services/orderService';
import { Order } from '../../types/order';
import { API_BASE_URL } from '../../config/api';

import MapView, { Marker, Polyline } from 'react-native-maps';
import { Client } from '@stomp/stompjs';

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
const PROMO_BANNERS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    title: 'Fresh Groceries Daily',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800',
    title: 'Local Farm Produce',
  },
];

const RUVO_FACTS = [
  {
    id: '1',
    icon: 'flash-outline' as const,
    title: 'RuVo Express Promise ⚡',
    subtitle: '10 to 15 mins direct delivery straight from your closest neighborhood shopkeeper!',
    badge: '10-15 MINS',
    bg: '#FFF2EC',
    border: '#FFE0D3',
    iconBg: '#FF7A00',
  },
  {
    id: '2',
    icon: 'storefront-outline' as const,
    title: 'Support Local Sellers 🏪',
    subtitle: 'Every order directly empowers real shopkeepers in your own colony & city.',
    badge: 'LOCAL FIRST',
    bg: '#FFF8EB',
    border: '#FEE5B3',
    iconBg: '#F4B400',
  },
  {
    id: '3',
    icon: 'shield-checkmark-outline' as const,
    title: 'Zero Surge Pricing Ever 🛡️',
    subtitle: 'No rain fees or unexpected surge price hikes. Fair & honest delivery charges always.',
    badge: 'FAIR PRICE',
    bg: '#F8F9FA',
    border: '#E5E7EB',
    iconBg: '#171A1F',
  },
  {
    id: '4',
    icon: 'leaf-outline' as const,
    title: '100% Fresh Guaranteed 🌿',
    subtitle: 'Fresh dairy, fruits, vegetables and essentials packed right before dispatch.',
    badge: 'SUPER FRESH',
    bg: '#FFF7ED',
    border: '#FFEDD5',
    iconBg: '#EA580C',
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CustomerTrackingScreen() {
  const insets      = useSafeAreaInsets();
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
  const [upsellTimeLeft, setUpsellTimeLeft] = useState(14 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setUpsellTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF7A00" />}
      >
        {/* ── EXPANDABLE MAP SECTION (Blinkit Style) ────────────────── */}
        <View style={{ height: isMapExpanded ? 340 : 190, marginHorizontal: 16, marginTop: 14, borderRadius: 24, overflow: 'hidden', elevation: 4 }} className="shadow-sm relative">
          {(!isCancelled && order.orderStatus !== 'DELIVERED') ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{ ...destination, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
            >
              {/* User Location Marker */}
              <Marker coordinate={destination} title="Delivery Address" pinColor="#059669" />

              {/* Shop Location Marker */}
              {order.shopLatitude && order.shopLongitude && (
                <Marker
                  coordinate={{ latitude: order.shopLatitude, longitude: order.shopLongitude }}
                  title={order.shopName || "Store"}
                >
                  <View style={[styles.partnerMarker, { backgroundColor: '#FF6B35' }]}>
                    <Ionicons name="storefront" size={18} color="#FFF" />
                  </View>
                </Marker>
              )}

              {/* Delivery Partner Marker */}
              {partnerLocation && (
                <Marker coordinate={partnerLocation} title="Delivery Partner">
                  <View style={styles.partnerMarker}>
                    <Ionicons name="bicycle" size={20} color="#FFF" />
                  </View>
                </Marker>
              )}

              {/* Polyline Route */}
              {partnerLocation ? (
                <Polyline
                  coordinates={[partnerLocation, destination]}
                  strokeColor="#059669"
                  strokeWidth={4}
                  lineDashPattern={[6, 4]}
                />
              ) : (order.shopLatitude && order.shopLongitude) ? (
                <Polyline
                  coordinates={[
                    { latitude: order.shopLatitude, longitude: order.shopLongitude },
                    destination,
                  ]}
                  strokeColor="#FF6B35"
                  strokeWidth={3.5}
                  lineDashPattern={[8, 5]}
                />
              ) : null}
            </MapView>
          ) : (
            <View style={[styles.mapPlaceholder, { backgroundColor: colors.card }]}>
              <Ionicons name="map" size={48} color={isCancelled ? '#FCA5A5' : '#D1D5DB'} />
              <Text style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center', paddingHorizontal: 24, fontWeight: '700' }}>
                {isCancelled
                  ? 'Order was cancelled. No delivery in progress.'
                  : 'Order delivered successfully.'}
              </Text>
            </View>
          )}

          {/* Floating Map Toggle Button */}
          <TouchableOpacity
            onPress={() => setIsMapExpanded(!isMapExpanded)}
            style={{ backgroundColor: 'rgba(23, 26, 31, 0.85)' }}
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full flex-row items-center gap-1.5 shadow-md"
          >
            <Ionicons name={isMapExpanded ? "contract" : "expand"} size={14} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
              {isMapExpanded ? 'Minimize Map' : 'Tap to Expand'}
            </Text>
          </TouchableOpacity>

          {isLive && (
            <Animated.View style={[styles.liveBadge, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </Animated.View>
          )}
        </View>

        {/* ── PROMOTIONAL CAROUSEL ─────────── */}
        {!isMapExpanded && (
          <View className="mt-4 px-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 8 }}
            >
              {PROMO_BANNERS.map((banner) => (
                <View
                  key={banner.id}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    width: 300,
                    elevation: 2,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <Image source={{ uri: banner.image }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
                  <View style={{ padding: 12 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 8 }}>
                      {banner.title}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <TouchableOpacity style={{ backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Enquire Now</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setIsMapExpanded(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="map-outline" size={16} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>View Map</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {/* Pagination dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 }}>
              {PROMO_BANNERS.map((_, idx) => (
                <View key={idx} style={{ width: idx === 0 ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: idx === 0 ? '#FF6B35' : colors.border }} />
              ))}
            </View>
          </View>
        )}

        {/* ── UPSELL BANNER (Forgot to add something?) ─────────── */}
        {!isCancelled && order.orderStatus === 'SHOP_ACCEPTED' && upsellTimeLeft > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFF2EC', borderRadius: 12, padding: 16, elevation: 1, borderWidth: 1, borderColor: '#FFE0D3', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ backgroundColor: '#FF6B35', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>🧙</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#171A1F', fontSize: 14, fontWeight: '800' }}>Forgot to add something?</Text>
              <Text style={{ color: '#555149', fontSize: 12, marginTop: 2 }}>Add now at no extra fee</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={{ color: '#EF4444', fontWeight: '900', fontSize: 14 }}>
                {String(Math.floor(upsellTimeLeft / 60)).padStart(2, '0')}:{String(upsellTimeLeft % 60).padStart(2, '0')}
              </Text>
              <TouchableOpacity style={{ backgroundColor: '#FF6B35', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>Add Items</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Product & Shop Details Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.sm]}>
          {/* Shop Info Header with Real Logo */}
          {order.shopName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              {/* Shop Logo */}
              {formatProductImageUrl(order.shopLogoUrl) ? (
                <Image
                  source={{ uri: formatProductImageUrl(order.shopLogoUrl)! }}
                  style={{ width: 48, height: 48, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{
                  width: 48, height: 48, borderRadius: 12,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 0.5, borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>
                    {(order.shopName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>
                  {order.shopName}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  🛒 RuVo Partner Store
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={[typography.headingM, styles.cardTitle, { color: colors.textPrimary }]}>
            Order Items ({order.items && order.items.length > 0 ? order.items.length : order.quantity || 1})
          </Text>

          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => {
              const itemImg = formatProductImageUrl(item.productImageUrl) || productImgUri;
              const itemPrice = item.price ?? Math.round(order.totalAmount / order.items!.length);

              return (
                <View key={item.id || item.productId || index} style={[styles.productRow, { marginBottom: index === order.items!.length - 1 ? 0 : 12 }]}>
                  {itemImg ? (
                    <Image source={{ uri: itemImg }} style={styles.productImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.productImgBox, { backgroundColor: colors.background }]}>
                      <Ionicons name="basket-outline" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                      ₹{itemPrice} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={[typography.bodyStrong, styles.productPrice, { color: colors.textPrimary }]}>
                    ₹{itemPrice * item.quantity}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.productRow}>
              {productImgUri ? (
                <Image source={{ uri: productImgUri }} style={styles.productImg} resizeMode="cover" />
              ) : (
                <View style={[styles.productImgBox, { backgroundColor: colors.background }]}>
                  <Ionicons name="basket-outline" size={24} color={colors.textSecondary} />
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
              <Text style={[typography.bodyStrong, styles.productPrice, { color: colors.textPrimary }]}>
                ₹{order.subtotal || order.totalAmount}
              </Text>
            </View>
          )}

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

        {/* Delivery Verification OTP Card */}
        {!isCancelled && order.orderStatus !== 'DELIVERED' && Boolean(order.deliveryOtpHash) && (
          <View style={styles.otpBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="key-outline" size={18} color="#171A1F" />
              <Text style={styles.otpLabel}>Delivery Verification OTP</Text>
            </View>
            <Text style={styles.otpCode}>
              {order.deliveryOtpHash || '...'}
            </Text>
            <Text style={styles.otpSub}>
              Give this {order.deliveryOtpHash?.length || 4}-digit OTP code to your delivery partner when receiving your order.
            </Text>
          </View>
        )}

        {/* Delivered & Verified Badge */}
        {order.orderStatus === 'DELIVERED' && (
          <>
            <View style={styles.deliveredBox}>
              <Ionicons name="checkmark-circle" size={24} color="#18A957" />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusMainText}>{formatETA()}</Text>
                <Text style={styles.statusSubText}>{formatSubtitle()}</Text>
              </View>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* ── Delivery Partner Card (Premium) ─────────────────────── */}
        {partnerInfo && (
          <View style={[
            styles.partnerCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
            {/* Avatar */}
            <View style={styles.partnerAvatar}>
              <Text style={styles.partnerAvatarLetter}>
                {(partnerInfo.name ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              {/* Name + badge row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.partnerName, { color: colors.textPrimary }]}>
                  {partnerInfo.name}
                </Text>
                <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: '#1D4ED8', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>RIDER</Text>
                </View>
              </View>

              {/* Phone */}
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>📞 {partnerInfo.phone}</Text>

              {/* Live tracking indicator */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <Animated.View style={[
                  styles.livePulseDot,
                  { transform: [{ scale: pulseAnim }] },
                ]} />
                <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '700' }}>Live Tracking Active</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={[styles.partnerActionBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
                onPress={() => Linking.openURL(`tel:${partnerInfo.phone}`)}
              >
                <Ionicons name="call" size={18} color="#16A34A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.partnerActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                onPress={() => Linking.openURL(`sms:${partnerInfo.phone}`)}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Animated Timeline or Red Cancel Card */}
        {!isCancelled ? (
          <View style={[styles.card, { backgroundColor: '#FFF', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: 24, alignItems: 'center', marginRight: 16, marginTop: 4 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: isStepActive('accepted', order.orderStatus || '') ? '#059669' : '#D1D5DB' }} />
                <View style={{ width: 2, height: 38, backgroundColor: isStepActive('accepted', order.orderStatus || '') ? '#059669' : '#E5E7EB', marginVertical: 4 }} />
                
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: (order.deliveryPartnerId) ? '#059669' : '#D1D5DB' }} />
                <View style={{ width: 2, height: 38, backgroundColor: (order.deliveryPartnerId) ? '#059669' : '#E5E7EB', marginVertical: 4 }} />

                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: isStepActive('pickedup', order.orderStatus || '') ? '#059669' : '#F59E0B' }} />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: isStepActive('accepted', order.orderStatus || '') ? '#171A1F' : '#9CA3AF', height: 52 }}>shop accepted</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: (order.deliveryPartnerId) ? '#171A1F' : '#9CA3AF', height: 52 }}>delivery partner assigned</Text>
                
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#171A1F' }}>
                    {isStepActive('pickedup', order.orderStatus || '') ? 'Order picked up 🚴' : 'Your order is getting packed'}
                  </Text>
                  {!isStepActive('pickedup', order.orderStatus || '') && (
                    <Text style={{ fontSize: 24, position: 'absolute', right: 0, top: -4 }}>🎁</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.cancelCard}>
            <Ionicons name="close-circle" size={40} color="#D94A4A" />
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
        <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFF', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 13, color: '#555149', fontWeight: '600' }}>
            You can pay online now or at delivery.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <View>
              <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '800', letterSpacing: 0.5 }}>PAYING VIA ▼</Text>
              <Text style={{ fontSize: 16, color: '#171A1F', fontWeight: '900', marginTop: 4 }}>
                {order.paymentMethod === 'ONLINE' ? 'BHIM UPI' : 'Cash on Delivery'}
              </Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: '#171A1F', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>Pay ₹{order.totalAmount}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  cancelCard: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#FECACA' },
  cancelCardTitle: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#991B1B' },
  cancelCardSub: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#B91C1C', marginTop: 4 },
  deliveredBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#D1FAE5', gap: 12 },
  partnerMarker: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4 },
  liveBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveText: { fontSize: 10, fontFamily: 'Poppins_800ExtraBold', color: '#FFF' },
  card: { padding: 16, marginTop: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: '#111827', marginBottom: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  productImg: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  productImgBox: { width: 50, height: 50, borderRadius: 8, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  productPrice: { fontSize: 14, fontFamily: 'Poppins_800ExtraBold' },
  billingBox: { backgroundColor: '#F9FAFB', padding: 16, marginTop: 16, borderRadius: 16 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  billingLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#6B7280' },
  billingValue: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#111827' },
  otpBox: { padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1 },
  otpLabel: { fontSize: 12, fontFamily: 'Poppins_800ExtraBold' },
  otpCode: { fontSize: 20, fontFamily: 'Poppins_900Black', marginVertical: 4 },
  otpSub: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  partnerCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1 },
  partnerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  partnerAvatarLetter: { fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: '#FFF' },
  partnerName: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold', color: '#111827' },
  livePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  partnerActionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
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
