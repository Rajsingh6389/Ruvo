/**
 * DeliveryPartnerAssignmentScreen - RuvoShop (Redesigned)
 * Full NativeWind + Reanimated premium UI.
 * Polling, countdown (1min per delivery partner), cancel broadcast, and partner listing.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AnimatedRN, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

type AssignmentStatus = 'PENDING' | 'NONE' | 'ASSIGNED';

interface CurrentRequest {
  requestId: number | null;
  partnerId: number | null;
  partnerName: string | null;
  partnerPhone: string | null;
  distanceKm: number | null;
  locationName?: string | null;
  expiresAt: string | null;
  status: AssignmentStatus;
}

interface ShopDeliveryPartner {
  id: number;
  name: string;
  phone: string;
  available: boolean;
  lastActiveAt: string | null;
  locationName: string;
  distanceKm: number | null;
}

const TOTAL_SECONDS = 60;
const CIRCUMFERENCE = 2 * Math.PI * ((120 - 8) / 2);

export default function DeliveryPartnerAssignmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();

  const orderId: number | undefined = route.params?.orderId;
  const shopId: number | undefined = route.params?.shopId;
  const viewPartnersOnly: boolean = route.params?.viewPartnersOnly ?? false;

  const [request, setRequest] = useState<CurrentRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(TOTAL_SECONDS);
  const [loading, setLoading] = useState(!viewPartnersOnly);
  const [cancelling, setCancelling] = useState(false);

  // Shop delivery partners modal state
  const [partnersModalVisible, setPartnersModalVisible] = useState(viewPartnersOnly);
  const [shopPartners, setShopPartners] = useState<ShopDeliveryPartner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  const strokeAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtRef = useRef<string | null>(null);

  const stopCountdown = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const startCountdown = (expiresAt: string) => {
    stopCountdown();
    expiresAtRef.current = expiresAt;
    const tick = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.ceil((expiry - now) / 1000));
      setSecondsLeft(remaining);
      const progress = 1 - remaining / TOTAL_SECONDS;
      Animated.timing(strokeAnim, {
        toValue: progress * CIRCUMFERENCE,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  };

  const fetchCurrentRequest = useCallback(async () => {
    if (!token || !orderId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders/${orderId}/current-request`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: CurrentRequest = await res.json();
      setRequest(data);
      setLoading(false);

      if (data.status === 'ASSIGNED') {
        stopCountdown();
        Alert.alert('Partner Assigned!', `${data.partnerName || 'Delivery Partner'} has accepted the order.`);
        navigation.goBack();
        return;
      }

      if (data.status === 'PENDING' && data.expiresAt) {
        if (data.expiresAt !== expiresAtRef.current) {
          startCountdown(data.expiresAt);
        }
      } else {
        stopCountdown();
        setSecondsLeft(TOTAL_SECONDS);
        strokeAnim.setValue(0);
        expiresAtRef.current = null;
      }
    } catch {}
  }, [token, orderId, navigation]);

  const fetchShopPartners = useCallback(async () => {
    if (!token || !shopId) return;
    setLoadingPartners(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/delivery-partners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setShopPartners(Array.isArray(data) ? data : []);
      }
    } catch {}
    finally {
      setLoadingPartners(false);
    }
  }, [token, shopId]);

  useEffect(() => {
    if (orderId) {
      fetchCurrentRequest();
      pollRef.current = setInterval(fetchCurrentRequest, 4000);
    }
    if (shopId) {
      fetchShopPartners();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      stopCountdown();
    };
  }, [fetchCurrentRequest, fetchShopPartners, orderId, shopId]);

  const handleCancelBroadcast = () => {
    if (!orderId || !token) return;
    Alert.alert(
      'Cancel Delivery Broadcast',
      'Are you sure you want to cancel broadcasting and cancel this order request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const res = await fetch(`${API_BASE_URL}/api/delivery/orders/${orderId}/cancel-by-shop`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                Alert.alert('Broadcast Cancelled', 'Delivery assignment request cancelled successfully.');
                navigation.goBack();
              } else {
                throw new Error('Failed to cancel');
              }
            } catch {
              Alert.alert('Error', 'Failed to cancel broadcast. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const ringColor = secondsLeft > 30 ? '#16A34A' : secondsLeft > 10 ? '#F59E0B' : '#DC2626';

  if (loading && !viewPartnersOnly) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#EA580C" />
        <Text className="text-sm text-warm-600 font-medium mt-md">Searching for delivery partners…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center gap-md">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 bg-warm-200 rounded-lg items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#231C10" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-extrabold text-ruvo-ink">
          {viewPartnersOnly ? 'Shop Delivery Partners' : 'Delivery Assignment'}
        </Text>
        {shopId && (
          <TouchableOpacity
            onPress={() => { setPartnersModalVisible(true); fetchShopPartners(); }}
            className="px-md py-xs bg-orange-100 rounded-lg flex-row items-center gap-xs"
          >
            <Ionicons name="people-outline" size={16} color="#EA580C" />
            <Text className="text-xs font-bold text-orange-700">Associated Riders</Text>
          </TouchableOpacity>
        )}
      </View>

      {!viewPartnersOnly && orderId ? (
        <View className="flex-1 items-center justify-center px-xl">
          {/* Order Tag */}
          <AnimatedRN.View entering={FadeIn.duration(400)} className="bg-orange-100 px-md py-xs rounded-full flex-row items-center gap-xs mb-2xl">
            <Ionicons name="receipt-outline" size={14} color="#EA580C" />
            <Text className="text-sm font-extrabold text-orange-700">Order #{orderId}</Text>
          </AnimatedRN.View>

          {request?.status === 'PENDING' ? (
            <AnimatedRN.View entering={FadeInUp.duration(500)} className="w-full items-center">
              <Text className="text-xs font-extrabold text-warm-600 uppercase tracking-wider mb-xl">
                Checking with partner (1 Min Countdown)
              </Text>

              {/* Countdown circle */}
              <View className="w-32 h-32 rounded-full items-center justify-center mb-xl"
                style={{ borderWidth: 8, borderColor: '#E5E7EB' }}>
                <Text className="text-4xl font-extrabold" style={{ color: ringColor }}>{secondsLeft}</Text>
                <Text className="text-xs text-warm-600 font-semibold">sec</Text>
              </View>

              {/* Progress bar */}
              <View className="w-full h-2 bg-warm-200 rounded-full mb-xl overflow-hidden">
                <Animated.View
                  className="h-2 rounded-full"
                  style={{
                    backgroundColor: ringColor,
                    width: strokeAnim.interpolate({
                      inputRange: [0, CIRCUMFERENCE],
                      outputRange: ['100%', '0%'],
                    }),
                  }}
                />
              </View>

              {/* Partner card */}
              <View className="w-full bg-ruvo-surface border border-warm-300 rounded-xl p-lg flex-row items-center gap-md mb-lg"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                <View className="w-14 h-14 bg-orange-100 rounded-full items-center justify-center">
                  <Ionicons name="person" size={28} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-extrabold text-ruvo-ink">
                    {request.partnerName ?? 'Delivery Partner'}
                  </Text>
                  {request.partnerPhone && (
                    <Text className="text-sm text-warm-600 font-medium mt-xs">📞 {request.partnerPhone}</Text>
                  )}
                  {(request.distanceKm != null || request.locationName) && (
                    <Text className="text-sm text-orange-600 font-semibold mt-xs">
                      📍 {request.locationName ? `${request.locationName} ` : ''}
                      {request.distanceKm != null ? `(${(Math.round(request.distanceKm * 10) / 10).toFixed(1)} km away)` : ''}
                    </Text>
                  )}
                </View>
                <View className="bg-orange-100 px-sm py-xs rounded-lg flex-row items-center gap-xs">
                  <ActivityIndicator size="small" color="#EA580C" />
                  <Text className="text-xs font-bold text-orange-700">Waiting</Text>
                </View>
              </View>

              <Text className="text-sm text-warm-600 text-center leading-5 mb-xl">
                Each partner gets 1 minute to accept. If they don't respond, request will automatically route to the next partner.
              </Text>
            </AnimatedRN.View>
          ) : (
            <AnimatedRN.View entering={FadeInUp.duration(500)} className="w-full items-center">
              <View className="w-24 h-24 bg-orange-100 rounded-full items-center justify-center mb-lg">
                <ActivityIndicator size="large" color="#EA580C" />
              </View>
              <Text className="text-xl font-extrabold text-ruvo-ink mb-sm text-center">
                Broadcasting to Online Partners…
              </Text>
              <Text className="text-sm text-warm-600 text-center leading-5 mb-xl">
                Searching for nearby active delivery partners associated with your shop.
              </Text>
            </AnimatedRN.View>
          )}

          {/* Action Buttons: Cancel Broadcast & Refresh */}
          <View className="flex-row gap-md w-full mt-lg">
            <TouchableOpacity
              onPress={handleCancelBroadcast}
              disabled={cancelling}
              className="flex-1 bg-red-100 border border-red-300 py-md rounded-xl items-center justify-center flex-row gap-xs"
            >
              {cancelling ? (
                <ActivityIndicator color="#DC2626" size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                  <Text className="text-sm font-bold text-red-600">Cancel Request</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setLoading(true); fetchCurrentRequest(); }}
              className="flex-1 bg-orange-100 py-md rounded-xl items-center justify-center flex-row gap-xs"
            >
              <Ionicons name="refresh" size={18} color="#EA580C" />
              <Text className="text-sm font-bold text-orange-700">Refresh Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-1 p-lg">
          <Text className="text-lg font-extrabold text-ruvo-ink mb-md">Associated Delivery Partners</Text>
          {loadingPartners ? (
            <ActivityIndicator size="large" color="#EA580C" className="my-xl" />
          ) : shopPartners.length === 0 ? (
            <Text className="text-warm-600 text-center mt-xl">No delivery partners found for this shop.</Text>
          ) : (
            <FlatList
              data={shopPartners}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-md mb-sm flex-row items-center justify-between">
                  <View className="flex-row items-center gap-md">
                    <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center">
                      <Ionicons name="bicycle" size={20} color="#EA580C" />
                    </View>
                    <View>
                      <Text className="text-base font-extrabold text-ruvo-ink">{item.name}</Text>
                      <Text className="text-xs text-warm-600">📞 {item.phone}</Text>
                      {item.distanceKm != null && (
                        <Text className="text-xs text-orange-600">📍 {item.distanceKm} km away</Text>
                      )}
                    </View>
                  </View>
                  <View className={`px-sm py-xs rounded-full ${item.available ? 'bg-green-100' : 'bg-warm-200'}`}>
                    <Text className={`text-xs font-bold ${item.available ? 'text-green-700' : 'text-warm-600'}`}>
                      {item.available ? '● Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Associated Delivery Partners Modal */}
      <Modal visible={partnersModalVisible && !viewPartnersOnly} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-ruvo-surface rounded-t-3xl p-xl max-h-[80%]">
            <View className="flex-row justify-between items-center mb-lg">
              <Text className="text-xl font-extrabold text-ruvo-ink">Associated Delivery Partners</Text>
              <TouchableOpacity onPress={() => setPartnersModalVisible(false)} className="w-8 h-8 bg-warm-200 rounded-full items-center justify-center">
                <Ionicons name="close" size={20} color="#231C10" />
              </TouchableOpacity>
            </View>

            {loadingPartners ? (
              <ActivityIndicator size="large" color="#EA580C" className="my-xl" />
            ) : shopPartners.length === 0 ? (
              <Text className="text-warm-600 text-center my-xl">No delivery partners associated with this shop yet.</Text>
            ) : (
              <FlatList
                data={shopPartners}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                  <View className="bg-warm-100 border border-warm-300 rounded-xl p-md mb-sm flex-row items-center justify-between">
                    <View className="flex-row items-center gap-md">
                      <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center">
                        <Ionicons name="bicycle" size={20} color="#EA580C" />
                      </View>
                      <View>
                        <Text className="text-base font-extrabold text-ruvo-ink">{item.name}</Text>
                        <Text className="text-xs text-warm-600">📞 {item.phone}</Text>
                        {item.distanceKm != null && (
                          <Text className="text-xs text-orange-600">📍 {item.distanceKm} km away</Text>
                        )}
                      </View>
                    </View>
                    <View className={`px-sm py-xs rounded-full ${item.available ? 'bg-green-100' : 'bg-warm-200'}`}>
                      <Text className={`text-xs font-bold ${item.available ? 'text-green-700' : 'text-warm-600'}`}>
                        {item.available ? '● Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
