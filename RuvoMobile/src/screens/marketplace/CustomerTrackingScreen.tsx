import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getOrder } from '../../services/orderService';
import { Order } from '../../types/order';
import { API_BASE_URL } from '../../config/api';

import MapView, { Marker, Polyline } from 'react-native-maps';
import { Client } from '@stomp/stompjs';
// @ts-ignore – sockjs-client has no type declarations
import SockJS from 'sockjs-client';
import 'text-encoding';

export default function CustomerTrackingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { token, userId } = useAuth();
  
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<{ name: string; phone: string } | null>(null);

  const stompClient = useRef<Client | null>(null);

  useEffect(() => {
    if (!orderId || !token) {
      setLoading(false);
      return;
    }
    
    // Fetch initial order details
    getOrder(orderId, token)
      .then(fetched => {
        setOrder(fetched);
        setLoading(false);
        // Fetch partner details if assigned
        if (fetched.deliveryPartnerId) {
          fetch(`${API_BASE_URL}/api/orders/${orderId}/partner`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(r => r.json())
            .then(d => { if (d.assigned) setPartnerInfo({ name: d.name, phone: d.phone }); })
            .catch(() => {});
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to fetch order details');
        setLoading(false);
      });
  }, [orderId, token]);

  useEffect(() => {
    if (!order || !order.deliveryPartnerId || order.orderStatus === 'DELIVERED' || order.orderStatus === 'CANCELLED') {
      return;
    }

    // Connect WebSocket for live tracking
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws';
    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {},
      debug: function (str) {
        console.log('[STOMP]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    // Fallback to SockJS if running locally without raw WS proxy, 
    // but typically Expo prefers raw websocket. 
    // client.webSocketFactory = () => new SockJS(API_BASE_URL + '/ws');
    
    // Some setups require modifying brokerURL to ws:// for React Native WebSocket polyfill.
    client.webSocketFactory = () => {
      return new WebSocket(wsUrl) as any;
    };

    client.onConnect = () => {
      console.log('Connected to WebSocket Tracking channel');
      // Subscribe to the specific partner's location channel
      client.subscribe(`/topic/delivery/${order.deliveryPartnerId}`, (msg) => {
        if (msg.body) {
          try {
            const loc = JSON.parse(msg.body);
            setPartnerLocation({ latitude: loc.latitude, longitude: loc.longitude });
          } catch (e) {
            console.error('Invalid location payload', e);
          }
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [order]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textPrimary }}>Order not found</Text>
      </SafeAreaView>
    );
  }

  const isLive = order.orderStatus === 'PICKED_UP' || order.orderStatus === 'OUT_FOR_DELIVERY';

  let destination = { latitude: 28.6139, longitude: 77.2090 }; // Default new delhi backup
  if (order.deliveryLatitude && order.deliveryLongitude) {
    destination = { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude };
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Track Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapContainer}>
        {isLive ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: destination.latitude,
              longitude: destination.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {partnerLocation && (
              <Marker
                coordinate={partnerLocation}
                title="Delivery Partner"
                pinColor="blue"
              >
                <Ionicons name="bicycle" size={32} color="blue" />
              </Marker>
            )}
            <Marker coordinate={destination} title="Drop Location" pinColor="green" />
            
            {partnerLocation && (
              <Polyline
                coordinates={[partnerLocation, destination]}
                strokeColor={colors.primary}
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}
          </MapView>
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: colors.card }]}>
            <Ionicons name="map-outline" size={48} color="#D1D5DB" />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              Map will activate when order is out for delivery
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.panel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Text style={[styles.orderNumber, { color: colors.textPrimary }]}>Order #{order.id}</Text>
        
        <View style={styles.statusBox}>
          <Text style={[styles.statusText, { color: colors.primary }]}>{order.orderStatus?.replace(/_/g, ' ')}</Text>
        </View>

        {partnerInfo && (
          <View style={styles.partnerCard}>
            <View style={styles.partnerIcon}>
              <Ionicons name="bicycle" size={22} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerName}>{partnerInfo.name}</Text>
              <Text style={styles.partnerPhone}>{partnerInfo.phone}</Text>
            </View>
          </View>
        )}

        {order.orderStatus === 'OUT_FOR_DELIVERY' && order.deliveryOtpHash && (
          <View style={styles.otpBox}>
            <Text style={styles.otpLabel}>Your Delivery OTP</Text>
            <Text style={styles.otpCode}>{order.deliveryOtpHash}</Text>
            <Text style={styles.otpSub}>Share this code with the delivery partner.</Text>
          </View>
        )}

        <View style={styles.timeline}>
          <TimelineItem title="Order Placed" active={true} />
          <TimelineItem 
            title="Shop Accepted" 
            active={['SHOP_ACCEPTED', 'DELIVERY_ASSIGNMENT', 'DELIVERY_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus || '')} 
          />
          <TimelineItem 
            title="Picked Up" 
            active={['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus || '')} 
          />
          <TimelineItem 
            title="Out for Delivery" 
            active={['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus || '')} 
            isLast={false}
          />
          <TimelineItem 
            title="Delivered" 
            active={order.orderStatus === 'DELIVERED'} 
            isLast={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function TimelineItem({ title, active, isLast = false }: { title: string, active: boolean, isLast?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDotColumn}>
        <View style={[styles.dot, { backgroundColor: active ? colors.primary : '#E5E7EB' }]} />
        {!isLast && <View style={[styles.line, { backgroundColor: active ? colors.primary : '#E5E7EB' }]} />}
      </View>
      <Text style={[styles.timelineText, { color: active ? colors.textPrimary : '#9CA3AF', fontWeight: active ? '600' : '400' }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    padding: 20,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBox: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 13,
  },
  otpBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  otpCode: {
    fontSize: 32,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 8,
    marginVertical: 4,
  },
  otpSub: {
    fontSize: 12,
    color: '#B45309',
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 46,
  },
  timelineDotColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineText: {
    fontSize: 15,
    marginTop: 1,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  partnerIcon: {
    width: 42,
    height: 42,
    backgroundColor: '#DBEAFE',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  partnerPhone: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
  },
});
