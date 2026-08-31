/**
 * DeliveryPartnerAssignmentScreen - RuvoShop (Redesigned)
 * Full NativeWind + Reanimated premium UI.
 * All polling, countdown, and assignment status logic preserved.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
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

const TOTAL_SECONDS = 60;
const CIRCUMFERENCE = 2 * Math.PI * ((120 - 8) / 2);

export default function DeliveryPartnerAssignmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();

  const orderId: number = route.params?.orderId;

  const [request, setRequest] = useState<CurrentRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(TOTAL_SECONDS);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchCurrentRequest();
    pollRef.current = setInterval(fetchCurrentRequest, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      stopCountdown();
    };
  }, [fetchCurrentRequest]);

  const ringColor = secondsLeft > 30 ? '#16A34A' : secondsLeft > 10 ? '#F59E0B' : '#DC2626';

  if (loading) {
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
        <Text className="flex-1 text-xl font-extrabold text-ruvo-ink">Delivery Assignment</Text>
      </View>

      <View className="flex-1 items-center justify-center px-xl">
        {/* Order Tag */}
        <AnimatedRN.View entering={FadeIn.duration(400)} className="bg-orange-100 px-md py-xs rounded-full flex-row items-center gap-xs mb-2xl">
          <Ionicons name="receipt-outline" size={14} color="#EA580C" />
          <Text className="text-sm font-extrabold text-orange-700">Order #{orderId}</Text>
        </AnimatedRN.View>

        {request?.status === 'PENDING' ? (
          <AnimatedRN.View entering={FadeInUp.duration(500)} className="w-full items-center">
            <Text className="text-xs font-extrabold text-warm-600 uppercase tracking-wider mb-xl">
              Checking with partner
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

            <Text className="text-sm text-warm-600 text-center leading-5">
              If the partner doesn't respond within 1 minute, the next nearest partner will be automatically notified.
            </Text>
          </AnimatedRN.View>
        ) : (
          <AnimatedRN.View entering={FadeInUp.duration(500)} className="w-full items-center">
            <View className="w-24 h-24 bg-orange-100 rounded-full items-center justify-center mb-lg">
              <ActivityIndicator size="large" color="#EA580C" />
            </View>
            <Text className="text-xl font-extrabold text-ruvo-ink mb-sm text-center">
              Searching for the next partner…
            </Text>
            <Text className="text-sm text-warm-600 text-center leading-5 mb-xl">
              The previous partner didn't respond. Looking for someone nearby.
            </Text>
            <Text className="text-xs text-warm-500 text-center leading-4">
              This happens automatically. You can leave this screen — the order will update in real time.
            </Text>
          </AnimatedRN.View>
        )}

        {/* Manual refresh */}
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchCurrentRequest(); }}
          className="mt-xl flex-row items-center gap-xs bg-orange-100 px-lg py-md rounded-xl"
        >
          <Ionicons name="refresh" size={18} color="#EA580C" />
          <Text className="text-sm font-bold text-orange-700">Refresh status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
