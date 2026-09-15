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

  const handleForceAssign = (partnerId: number) => {
    if (!orderId || !token) return;
    Alert.alert(
      'Force Assign Partner',
      'Are you sure you want to bypass the broadcast queue and force-assign this delivery partner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Assign',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/assign-partner?partnerId=${partnerId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                Alert.alert('Success', 'Partner has been forcefully assigned!');
                setPartnersModalVisible(false);
                fetchCurrentRequest();
              } else {
                throw new Error('Failed to force assign. Ensure partner is online.');
              }
            } catch {
              Alert.alert('Error', 'Failed to assign partner. They might be offline or busy.');
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
        <ActivityIndicator size="large" color="#F4B400" />
        <Text className="text-[13px] text-warm-600 font-medium mt-4">Getting latest assignment status…</Text>
      </SafeAreaView>
    );
  }

  const PartnerCard = ({ item, isModal = false }: { item: ShopDeliveryPartner, isModal?: boolean }) => {
    return (
      <View className="bg-ruvo-surface border border-warm-200 rounded-[20px] p-4 mb-3 flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center gap-4 flex-1">
          <View className="w-12 h-12 bg-ruvo-yellow/15 rounded-full items-center justify-center">
            <Ionicons name="bicycle" size={22} color="#D97706" />
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-[15px] font-black text-ruvo-ink">{item.name}</Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Text className="text-[12px] text-warm-600 font-medium">{item.phone}</Text>
              {item.distanceKm != null && (
                <>
                  <Text className="text-[10px] text-warm-400">•</Text>
                  <Text className="text-[12px] text-ruvo-yellow-dark font-bold">{Math.round(item.distanceKm * 10) / 10} km</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View className="items-end pl-2">
          <View className={`px-2 py-1 rounded-full flex-row items-center gap-1 border ${item.available ? 'bg-green-50 border-green-200' : 'bg-warm-50 border-warm-200'} ${isModal && !viewPartnersOnly && orderId ? 'mb-2' : ''}`}>
            <View className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-green-600' : 'bg-warm-400'}`} />
            <Text className={`text-[11px] font-extrabold ${item.available ? 'text-green-700' : 'text-warm-500'}`}>
              {item.available ? 'Online' : 'Offline'}
            </Text>
          </View>
          
          {isModal && !viewPartnersOnly && orderId && (
            <TouchableOpacity
              onPress={() => handleForceAssign(item.id)}
              className="bg-ruvo-bg border border-ruvo-yellow px-3 py-1.5 rounded-[10px] flex-row items-center gap-1 shadow-xs"
            >
              <Ionicons name="flash" size={12} color="#D97706" />
              <Text className="text-[11px] font-black text-ruvo-yellow-dark">ASSIGN</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-200 shadow-sm z-10 px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 bg-warm-50 rounded-[12px] border border-warm-200 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#171A1F" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-ruvo-ink tracking-tight">Delivery Partners</Text>
          <Text className="text-[12px] font-bold text-warm-600">
            {viewPartnersOnly ? 'Manage people delivering your orders' : 'Delivery Assignment'}
          </Text>
        </View>
        {shopId && (
          <TouchableOpacity
            onPress={() => { setPartnersModalVisible(true); fetchShopPartners(); }}
            className="w-10 h-10 bg-ruvo-yellow/20 rounded-[12px] border border-ruvo-yellow/30 items-center justify-center"
          >
            <Ionicons name="people" size={18} color="#D97706" />
          </TouchableOpacity>
        )}
      </View>

      {!viewPartnersOnly && orderId ? (
        <View className="flex-1 items-center justify-center px-5">
          {/* Order Tag */}
          <AnimatedRN.View entering={FadeIn.duration(400)} className="bg-ruvo-yellow/15 border border-ruvo-yellow/30 px-4 py-1.5 rounded-full flex-row items-center gap-2 mb-8">
            <Ionicons name="receipt" size={14} color="#D97706" />
            <Text className="text-[14px] font-black text-ruvo-yellow-dark tracking-tight">Order #{orderId}</Text>
          </AnimatedRN.View>

          {request?.status === 'PENDING' ? (
            <AnimatedRN.View entering={FadeInUp.duration(400)} className="w-full items-center">
              <Text className="text-[12px] font-black text-warm-500 uppercase tracking-widest mb-6">
                Waiting for partner
              </Text>

              {/* Countdown circle */}
              <View className="w-32 h-32 rounded-full items-center justify-center mb-8"
                style={{ borderWidth: 8, borderColor: '#E5E7EB' }}>
                <Text className="text-4xl font-black" style={{ color: ringColor }}>{secondsLeft}</Text>
                <Text className="text-[12px] font-extrabold text-warm-500">sec</Text>
              </View>

              {/* Progress bar */}
              <View className="w-full h-2 bg-warm-200 rounded-full mb-8 overflow-hidden">
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
              <View className="w-full bg-ruvo-surface border border-warm-200 rounded-[20px] p-5 flex-row items-center gap-4 mb-6 shadow-sm">
                <View className="w-12 h-12 bg-ruvo-yellow/15 rounded-full items-center justify-center border border-ruvo-yellow/20">
                  <Ionicons name="person" size={22} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-black text-ruvo-ink">
                    {request.partnerName ?? 'Delivery Partner'}
                  </Text>
                  {request.partnerPhone && (
                    <Text className="text-[13px] text-warm-600 font-medium mt-1">📞 {request.partnerPhone}</Text>
                  )}
                  {(request.distanceKm != null || request.locationName) && (
                    <Text className="text-[12px] text-ruvo-yellow-dark font-extrabold mt-1">
                      {request.distanceKm != null ? `${(Math.round(request.distanceKm * 10) / 10).toFixed(1)} km away` : 'Nearby'}
                    </Text>
                  )}
                </View>
                <View className="bg-orange-50 border border-orange-200 px-2 py-1.5 rounded-[10px] items-center gap-1">
                  <ActivityIndicator size="small" color="#D97706" />
                  <Text className="text-[10px] font-black text-orange-700">WAITING</Text>
                </View>
              </View>

              <Text className="text-[13px] text-warm-600 font-medium text-center leading-[20px] mb-8">
                Request will automatically route to the next partner if they don't accept in time.
              </Text>
            </AnimatedRN.View>
          ) : (
            <AnimatedRN.View entering={FadeInUp.duration(400)} className="w-full items-center">
              <View className="w-24 h-24 bg-ruvo-yellow/15 border border-ruvo-yellow/30 rounded-full items-center justify-center mb-6">
                <ActivityIndicator size="large" color="#D97706" />
              </View>
              <Text className="text-xl font-black text-ruvo-ink mb-2 text-center tracking-tight">
                Broadcasting…
              </Text>
              <Text className="text-[14px] font-medium text-warm-600 text-center leading-[22px] mb-8">
                Searching for nearby active delivery partners associated with your shop.
              </Text>
            </AnimatedRN.View>
          )}

          {/* Action Buttons: Cancel Broadcast & Refresh */}
          <View className="flex-row gap-3 w-full mt-4">
            <TouchableOpacity
              onPress={handleCancelBroadcast}
              disabled={cancelling}
              className="flex-1 bg-red-50 border border-red-200 py-[16px] rounded-[18px] items-center justify-center flex-row gap-2 shadow-sm"
            >
              {cancelling ? (
                <ActivityIndicator color="#DC2626" size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#DC2626" />
                  <Text className="text-[14px] font-black text-red-700">Cancel</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setLoading(true); fetchCurrentRequest(); }}
              className="flex-1 bg-ruvo-surface border border-warm-200 py-[16px] rounded-[18px] items-center justify-center flex-row gap-2 shadow-sm"
            >
              <Ionicons name="refresh" size={18} color="#6B5E52" />
              <Text className="text-[14px] font-black text-warm-700">Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <View className="px-4 pt-5 pb-2 border-b border-warm-100 flex-row justify-between items-end">
            <Text className="text-[14px] font-black text-warm-600 uppercase tracking-widest">
              Associated Riders
            </Text>
            <Text className="text-[13px] font-bold text-ruvo-yellow-dark">
              {shopPartners.length} total
            </Text>
          </View>
          {loadingPartners ? (
            <ActivityIndicator size="large" color="#F4B400" className="my-8" />
          ) : shopPartners.length === 0 ? (
            <View className="flex-1 items-center justify-center px-4">
              <View className="w-16 h-16 bg-warm-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="people-outline" size={32} color="#A79E92" />
              </View>
              <Text className="text-[15px] text-warm-600 font-bold text-center">No associated riders found.</Text>
            </View>
          ) : (
            <FlatList
              data={shopPartners}
              contentContainerClassName="p-4"
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => <PartnerCard item={item} />}
            />
          )}
        </View>
      )}

      {/* Associated Delivery Partners Modal */}
      <Modal visible={partnersModalVisible && !viewPartnersOnly} animationType="slide" transparent>
        <View className="flex-1 bg-ruvo-ink/60 justify-end">
          <View className="bg-ruvo-bg rounded-t-[32px] max-h-[85%] overflow-hidden shadow-xl">
            <View className="bg-ruvo-surface p-5 border-b border-warm-200 flex-row justify-between items-center z-10 shadow-sm">
              <View>
                <Text className="text-xl font-black text-ruvo-ink">Available Riders</Text>
                <Text className="text-[12px] font-bold text-warm-600">Force assign to an online partner</Text>
              </View>
              <TouchableOpacity onPress={() => setPartnersModalVisible(false)} className="w-10 h-10 bg-warm-100 rounded-full items-center justify-center">
                <Ionicons name="close" size={20} color="#171A1F" />
              </TouchableOpacity>
            </View>

            {loadingPartners ? (
              <ActivityIndicator size="large" color="#F4B400" className="my-10" />
            ) : shopPartners.length === 0 ? (
              <View className="p-8 items-center">
                <Ionicons name="people-outline" size={48} color="#D1C7BA" className="mb-4" />
                <Text className="text-[15px] font-bold text-warm-600 text-center">No associated riders are currently available.</Text>
              </View>
            ) : (
              <FlatList
                data={shopPartners}
                contentContainerClassName="p-4 pb-10"
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => <PartnerCard item={item} isModal={true} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
