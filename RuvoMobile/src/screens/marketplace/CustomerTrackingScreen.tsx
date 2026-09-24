import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  Dimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

import { getOrder, getPartnerDetails, cancelOrder, payCodOnline, verifyPayment } from '../../services/orderService';
import { Order } from '../../types/order';

import { API_BASE_URL, RAZORPAY_KEY_ID } from '../../config/api';

import Constants from 'expo-constants';

import MapView, {
  Marker,
  Polyline,
  UrlTile,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

// Expo Go does not inject the Google Maps API key from app.json into the native layer,
// so using PROVIDER_GOOGLE in Expo Go results in a black screen.
// We fall back to the default provider when running inside Expo Go.
const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
const MAP_PROVIDER = isExpoGo ? undefined : PROVIDER_GOOGLE;

import { Client } from '@stomp/stompjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

import {
  TrackingMode,
  PartnerLocation,
  PartnerInfo,
  CANCELLED_STATUSES,
  TRACKING_STEPS,
  PROMO_BANNERS,
  isCancelledStatus,
  getTrackingStage,
  isLiveStatus,
  getStatusText,
  formatProductImageUrl
} from '../../utils/orderTrackingUtils';


// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomerTrackingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const {
    colors,
    typography,
    radius,
    shadows,
    spacing,
  } = useTheme();

  const { token, user } = useAuth();

  const orderId = route.params?.orderId;

  // ───────────────────────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────────────────────

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [cancelling, setCancelling] =
    useState(false);

  const [trackingMode, setTrackingMode] =
    useState<TrackingMode>('MAP');

  const [partnerLocation, setPartnerLocation] =
    useState<PartnerLocation | null>(null);

  const [partnerInfo, setPartnerInfo] =
    useState<PartnerInfo | null>(null);

  const [promoIndex, setPromoIndex] =
    useState(0);

  const [payingOnline, setPayingOnline] =
    useState(false);

  const pulseAnim =
    useRef(new Animated.Value(1)).current;

  const stompClient =
    useRef<Client | null>(null);

  const mapRef =
    useRef<MapView | null>(null);


  // ───────────────────────────────────────────────────────────────────────────
  // PULSE
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 700,
          useNativeDriver: true,
        }),

        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);


  // ───────────────────────────────────────────────────────────────────────────
  // FETCH PARTNER
  // ───────────────────────────────────────────────────────────────────────────

  const fetchPartnerDetails = useCallback(
    async (partnerId: number) => {
      if (!orderId || !token) return;

      try {
        const data = await getPartnerDetails(orderId, token);

        if (!data.assigned) {
          setPartnerInfo(null);
          return;
        }

        setPartnerInfo({
          id: data.id,
          name: data.name,
          phone: data.phone,
          locationName: data.locationName,
          latitude: data.latitude,
          longitude: data.longitude,
        });

        if (
          typeof data.latitude === 'number' &&
          typeof data.longitude === 'number'
        ) {
          setPartnerLocation({
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      } catch {
        // silent
      }
    },
    [orderId, token],
  );


  // ───────────────────────────────────────────────────────────────────────────
  // FETCH ORDER
  // ───────────────────────────────────────────────────────────────────────────

  const fetchOrder = useCallback(async () => {
    if (!orderId || !token) {
      setLoading(false);
      return;
    }

    try {
      const fetched = await getOrder(
        orderId,
        token,
      );

      setOrder(fetched);

      if (fetched.deliveryPartnerId) {
        await fetchPartnerDetails(
          fetched.deliveryPartnerId,
        );
      }
    } catch {
      Alert.alert(
        'Error',
        'Failed to fetch order details',
      );
    } finally {
      setLoading(false);
    }
  }, [
    orderId,
    token,
    fetchPartnerDetails,
  ]);


  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);


  // ───────────────────────────────────────────────────────────────────────────
  // REFRESH
  // ───────────────────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    await fetchOrder();

    setRefreshing(false);
  }, [fetchOrder]);


  // ───────────────────────────────────────────────────────────────────────────
  // LOCATION POLLING FALLBACK
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!order?.deliveryPartnerId) return;

    if (
      order.orderStatus === 'DELIVERED' ||
      isCancelledStatus(order.orderStatus)
    ) {
      return;
    }

    const interval = setInterval(() => {
      fetchPartnerDetails(
        order.deliveryPartnerId!,
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [
    order?.deliveryPartnerId,
    order?.orderStatus,
    fetchPartnerDetails,
  ]);


  // ───────────────────────────────────────────────────────────────────────────
  // WEBSOCKET
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!order?.deliveryPartnerId) return;

    if (
      order.orderStatus === 'DELIVERED' ||
      isCancelledStatus(order.orderStatus)
    ) {
      return;
    }

    const wsUrl =
      API_BASE_URL.replace(/^http/, 'ws') +
      '/ws';

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.webSocketFactory = () =>
      new WebSocket(wsUrl) as any;

    client.onConnect = () => {
      client.subscribe(
        `/topic/delivery/${order.deliveryPartnerId}`,
        message => {
          if (!message.body) return;

          try {
            const location =
              JSON.parse(message.body);

            if (
              typeof location.latitude ===
                'number' &&
              typeof location.longitude ===
                'number'
            ) {
              setPartnerLocation({
                latitude: location.latitude,
                longitude: location.longitude,
              });
            }
          } catch {
            // invalid websocket message
          }
        },
      );
    };

    client.activate();

    stompClient.current = client;

    return () => {
      client.deactivate();
      stompClient.current = null;
    };
  }, [
    order?.deliveryPartnerId,
    order?.orderStatus,
  ]);


  // ───────────────────────────────────────────────────────────────────────────
  // DERIVED LOCATION
  // ───────────────────────────────────────────────────────────────────────────

  const destination = {
    latitude:
      Number(order?.deliveryLatitude) || 28.6139,

    longitude:
      Number(order?.deliveryLongitude) || 77.2090,
  };

  const shopLocation =
    order &&
    Number(order.shopLatitude) &&
    Number(order.shopLongitude)
      ? {
          latitude: Number(order.shopLatitude),
          longitude: Number(order.shopLongitude),
        }
      : undefined;


  // ───────────────────────────────────────────────────────────────────────────
  // AUTO FIT MAP
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (trackingMode !== 'MAP') return;

    const coordinates = [
      destination,
      shopLocation,
      partnerLocation || undefined,
    ].filter(Boolean) as PartnerLocation[];

    if (!coordinates.length) return;

    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        coordinates,
        {
          edgePadding: {
            top: 110,
            right: 60,
            bottom: 120,
            left: 60,
          },
          animated: true,
        },
      );
    }, 400);

    return () => clearTimeout(timeout);
  }, [
    trackingMode,
    partnerLocation,
    destination.latitude,
    destination.longitude,
  ]);


  // ───────────────────────────────────────────────────────────────────────────
  // CANCEL
  // ───────────────────────────────────────────────────────────────────────────

  const handleCancelOrder = () => {
    if (!orderId || !token || !order) return;

    const online =
      order.paymentMethod === 'ONLINE' ||
      order.paymentMethod === 'RAZORPAY';

    Alert.alert(
      'Cancel Order',
      online
        ? 'Are you sure you want to cancel this order? Refund eligibility will depend on the order stage and payment policy.'
        : 'Are you sure you want to cancel this order?',
      [
        {
          text: 'Keep Order',
          style: 'cancel',
        },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);

            try {
              const data = await cancelOrder(orderId, token);

              setOrder(previous =>
                previous
                  ? {
                      ...previous,
                      orderStatus:
                        'CANCELLED_BY_USER',
                    }
                  : null,
              );

              Alert.alert(
                'Order Cancelled',
                'Your order has been cancelled successfully.',
              );
            } catch (error: any) {
              Alert.alert(
                'Cannot Cancel',
                error?.message ||
                  'Failed to cancel order.',
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };


  // ───────────────────────────────────────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.loader,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loaderText,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          Loading your order...
        </Text>
      </SafeAreaView>
    );
  }


  if (!order) {
    return (
      <SafeAreaView
        style={[
          styles.loader,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={52}
          color={colors.error}
        />

        <Text
          style={[
            styles.notFound,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          Order not found
        </Text>

        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }


  // ───────────────────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ───────────────────────────────────────────────────────────────────────────

  const cancelled =
    isCancelledStatus(
      order.orderStatus,
    );

  const live =
    isLiveStatus(
      order.orderStatus,
    );

  const statusPresentation =
    getStatusText(
      order.orderStatus,
    );

  const currentStage =
    getTrackingStage(
      order.orderStatus,
    );

  const productImage =
    formatProductImageUrl(
      order.productImageUrl,
    );

  const etaMinutes =
    (order as any).deliveryEtaMinutes ??
    (order as any).etaMinutes ??
    null;


  // ───────────────────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  // PAY ONLINE (COD ONLY)
  // ───────────────────────────────────────────────────────────────────────────

  const handlePayOnline = async () => {
    if (!orderId || !token || !order) return;
    setPayingOnline(true);
    try {
      const userId = String(user?.id || (user as any)?.userId);
      const data = await payCodOnline(orderId, userId, token);
      
      const RazorpayCheckout = require('react-native-razorpay').default;
      const options = {
        description: 'Online Payment for COD Order',
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: data.currency || 'INR',
        key: RAZORPAY_KEY_ID,
        amount: data.amount * 100,
        name: 'RuVo',
        order_id: data.razorpayOrderId,
        prefill: {
          email: user?.email || '',
          contact: user?.mobileNumber || (user as any)?.phone || '',
          name: user?.name || ''
        },
        theme: { color: '#FF7A00' }
      };

      RazorpayCheckout.open(options).then((rzpData: any) => {
         verifyPayment({
           orderId,
           razorpayPaymentId: rzpData.razorpay_payment_id,
           razorpayOrderId: data.razorpayOrderId,
           razorpaySignature: rzpData.razorpay_signature
         }, token).then(() => {
            Alert.alert('Payment Successful', 'Your order is now paid online!');
            handleRefresh();
         });
      }).catch((err: any) => {
         Alert.alert('Payment Failed', 'You cancelled the payment or it failed.');
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPayingOnline(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────

  const canCancel = !cancelled && !['OUT_FOR_DELIVERY', 'PICKED_UP', 'DELIVERED', 'DELIVERY_ASSIGNED', 'DELIVERY_ASSIGNMENT', 'DELIVERY_BROADCASTED'].includes(order.orderStatus || '');
  const canPayOnline = (order.paymentMethod === 'COD' || order.paymentMethod === 'CASH') && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'SUCCESS';
  
  // Horizontal timeline logic
  const stages = [
    { key: 'PLACED', label: 'Placed' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'ON_THE_WAY', label: 'On way' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];
  
  let currentStepIndex = 0;
  const s = order.orderStatus || '';
  if (['DELIVERED'].includes(s)) currentStepIndex = 3;
  else if (['OUT_FOR_DELIVERY', 'PICKED_UP'].includes(s)) currentStepIndex = 2;
  else if (['SHOP_ACCEPTED', 'DELIVERY_ASSIGNMENT', 'BROADCASTED', 'WAITING_PARTNER', 'SEARCHING_PARTNER', 'DELIVERY_ASSIGNED'].includes(s)) currentStepIndex = 1;

  // Extract Delivery OTP Hash
  let rawHash = '';
  if (typeof (order as any).deliveryOtpHash === 'string') {
    rawHash = (order as any).deliveryOtpHash;
  } else if ((order as any).deliveryOtpHash && typeof (order as any).deliveryOtpHash.hash === 'string') {
    rawHash = (order as any).deliveryOtpHash.hash;
  }
  const showOtp = ['OUT_FOR_DELIVERY', 'PICKED_UP'].includes(s) && rawHash.length > 0;

  console.log('[DEBUG Map] Destination: ', destination);
  console.log('[DEBUG Map] Partner Location: ', partnerLocation);
  console.log('[DEBUG Map] Provider: ', MAP_PROVIDER);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* 40% Height Map at Top */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: destination.latitude,
            longitude: destination.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Static Route: Shop to Home */}
          {shopLocation && destination && (
            <Polyline
              coordinates={[shopLocation, destination]}
              strokeColor="#9CA3AF"
              strokeWidth={3}
              lineDashPattern={[5, 10]}
            />
          )}

          {/* Active Route: Partner to Home */}
          {partnerLocation && destination && (
            <Polyline
              coordinates={[
                { latitude: Number(partnerLocation.latitude), longitude: Number(partnerLocation.longitude) },
                destination
              ]}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
          )}

          {/* Shop Marker */}
          {shopLocation && (
            <Marker coordinate={shopLocation} zIndex={1}>
              <View style={[styles.markerCircle, { backgroundColor: '#F97316' }]}>
                <Ionicons name="storefront" size={16} color="#FFF" />
              </View>
            </Marker>
          )}

          {/* Home Destination Marker */}
          <Marker coordinate={destination} zIndex={2}>
            <View style={[styles.markerCircle, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="home" size={16} color="#FFF" />
            </View>
          </Marker>

          {/* Delivery Partner Marker */}
          {partnerLocation && (
            <Marker 
              coordinate={{ latitude: Number(partnerLocation.latitude), longitude: Number(partnerLocation.longitude) }}
              zIndex={3}
            >
              <View style={[styles.markerCircle, { backgroundColor: colors.primary, transform: [{ scale: 1.2 }] }]}>
                <Ionicons name="bicycle" size={18} color="#FFF" />
              </View>
            </Marker>
          )}
        </MapView>
        
        {/* Back Button Overlay */}
        <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonOverlay}>
            <Ionicons name="arrow-back" size={24} color="#171A1F" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* 60% Scrollable Content below the Map */}
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderIdText}>Order #{order.id}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusPresentation?.title || 'Unknown'}</Text>
            </View>
          </View>

          {/* Delivery OTP block if out for delivery */}
          {showOtp && (
            <View style={styles.otpBlock}>
              <View style={styles.otpHeaderRow}>
                <Ionicons name="shield-checkmark" size={20} color="#15803d" />
                <Text style={styles.otpTitle}>Delivery PIN</Text>
              </View>
              <Text style={styles.otpSubtitle}>Share this 4-digit PIN with the delivery executive.</Text>
              <Text style={styles.otpDisplay}>{rawHash}</Text>
            </View>
          )}

          {cancelled ? (
            <View style={styles.cancelledBlock}>
              <Ionicons name="close-circle" size={40} color="#EF4444" />
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledSubtitle}>This order has been cancelled.</Text>
              {(order.paymentMethod === 'ONLINE' || order.paymentMethod === 'RAZORPAY') && (
                 <Text style={[styles.cancelledSubtitle, { color: '#059669', marginTop: 8, fontWeight: '700' }]}>
                   Your refund has been initiated and will be credited to your account within 5-7 business days.
                 </Text>
              )}
            </View>
          ) : (
            <View style={styles.timelineBlock}>
              <Text style={styles.sectionTitle}>Order Status</Text>
              <View style={styles.horizontalTimeline}>
                {stages.map((stage, idx) => {
                  const isActive = idx <= currentStepIndex;
                  return (
                    <View key={stage.key} style={styles.timelineStep}>
                      <View style={[styles.timelineNode, isActive ? styles.timelineNodeActive : null]}>
                        {isActive ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
                      </View>
                      <Text style={[styles.timelineLabel, isActive ? styles.timelineLabelActive : null]}>{stage.label}</Text>
                      {idx < stages.length - 1 && (
                        <View style={[styles.timelineLine, idx < currentStepIndex ? styles.timelineLineActive : null]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Partner Info Block */}
          {!cancelled && partnerInfo && (
            <View style={styles.partnerBlock}>
              <Text style={styles.sectionTitle}>Delivery Partner</Text>
              <View style={styles.partnerCard}>
                <Image
                  source={{
                    uri: `https://randomuser.me/api/portraits/men/${(partnerInfo.id ?? 1) % 50}.jpg`,
                  }}
                  style={styles.partnerAvatar}
                />
                <View style={styles.partnerDetails}>
                  <Text style={styles.partnerName}>{partnerInfo.name || 'Delivery Partner'}</Text>
                  <Text style={styles.partnerRole}>{order.orderStatus === 'DELIVERED' ? 'Delivered your order' : 'On the way to you'}</Text>
                </View>
                {partnerInfo.phone ? (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:${partnerInfo.phone}`)}
                  >
                    <Ionicons name="call" size={20} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.callButton, { backgroundColor: '#9CA3AF' }]}>
                    <Ionicons name="call" size={20} color="#FFF" />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Items Summary */}
          <View style={styles.itemsBlock}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <View style={styles.itemRow}>
              {productImage ? (
                <Image
                  source={{ uri: productImage }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Ionicons name="image-outline" size={22} color="#9CA3AF" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.itemName}>{order.productName}</Text>
                <Text style={styles.itemQty}>Qty: {order.quantity || 1}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{order.subtotal}</Text>
            </View>
            
            <View style={styles.divider} />
            <View style={styles.billRow}><Text style={styles.billLabel}>Item Total</Text><Text style={styles.billValue}>₹{order.subtotal}</Text></View>
            <View style={styles.billRow}><Text style={styles.billLabel}>Delivery Fee</Text><Text style={styles.billValue}>₹{order.deliveryFee}</Text></View>
            <View style={styles.billRow}><Text style={styles.billLabel}>Platform Fee</Text><Text style={styles.billValue}>₹{order.platformFee}</Text></View>
            {(order.couponDiscount || 0) > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Discount</Text><Text style={styles.billValueGreen}>- ₹{order.couponDiscount}</Text></View>}
            <View style={styles.divider} />
            <View style={styles.billRow}><Text style={styles.billTotalLabel}>Grand Total</Text><Text style={styles.billTotalValue}>₹{order.totalAmount}</Text></View>
          </View>

          {/* Payment Method & Pay Online Button */}
          <View style={styles.paymentBlock}>
             <Text style={styles.sectionTitle}>Payment Method</Text>
             <View style={styles.paymentMethodRow}>
               <Ionicons name={order.paymentMethod === 'COD' ? 'cash' : 'card'} size={24} color="#171A1F" />
               <View style={{ marginLeft: 12, flex: 1 }}>
                 <Text style={styles.paymentMethodType}>{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid Online'}</Text>
                 <Text style={styles.paymentMethodStatus}>{order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'PAID' ? 'Payment Completed' : 'Pending Payment'}</Text>
               </View>
             </View>

             {canPayOnline && (
               <TouchableOpacity style={styles.payOnlineButton} onPress={handlePayOnline} disabled={payingOnline}>
                 {payingOnline ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.payOnlineButtonText}>Pay Online Instead</Text>}
               </TouchableOpacity>
             )}
          </View>

          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelOrder} disabled={cancelling}>
              {cancelling ? <ActivityIndicator color="#EF4444" /> : <Text style={styles.cancelBtnText}>Cancel Order</Text>}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF'
  },
  loaderText: {
    fontFamily: 'Poppins_500Medium',
    marginTop: 12,
    fontSize: 16
  },
  mapContainer: {
    height: '40%',
    width: '100%',
    backgroundColor: '#E5E7EB',
    position: 'relative'
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  markerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0, left: 0, right: 0
  },
  backButtonOverlay: {
    marginTop: 16,
    marginLeft: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10
  },
  scrollPadding: {
    padding: 24,
    paddingBottom: 60
  },
  orderNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  orderIdText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#111827'
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  statusBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#92400E'
  },
  otpBlock: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  otpTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#166534',
    marginLeft: 8
  },
  otpSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#15803D',
    textAlign: 'center',
    marginBottom: 12
  },
  otpDisplay: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 32,
    letterSpacing: 8,
    color: '#166534'
  },
  cancelledBlock: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20
  },
  cancelledTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#991B1B',
    marginTop: 12
  },
  cancelledSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#DC2626'
  },
  timelineBlock: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 16
  },
  horizontalTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10
  },
  timelineStep: {
    alignItems: 'center',
    position: 'relative',
    width: 60
  },
  timelineNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    zIndex: 2
  },
  timelineNodeActive: {
    backgroundColor: '#10B981'
  },
  timelineLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  timelineLabelActive: {
    color: '#10B981',
    fontFamily: 'Poppins_600SemiBold'
  },
  timelineLine: {
    position: 'absolute',
    top: 14, // Half of node height
    left: 40,
    width: '100%',
    height: 3,
    backgroundColor: '#E5E7EB',
    zIndex: 1
  },
  timelineLineActive: {
    backgroundColor: '#10B981'
  },
  partnerBlock: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  partnerDetails: {
    flex: 1
  },
  partnerName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#111827'
  },
  partnerRole: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#6B7280'
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  itemsBlock: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  itemImagePlaceholder: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#111827'
  },
  itemQty: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#6B7280'
  },
  itemPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#111827'
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  billLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#4B5563'
  },
  billValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#111827'
  },
  billValueGreen: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#10B981'
  },
  billTotalLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#111827'
  },
  billTotalValue: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 18,
    color: '#111827'
  },
  paymentBlock: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  paymentMethodType: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#111827'
  },
  paymentMethodStatus: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#6B7280'
  },
  payOnlineButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16
  },
  payOnlineButtonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#FFF'
  },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#DC2626'
  },
  notFound: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFF',
    fontSize: 16,
  }
});
