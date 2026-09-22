import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { Delivery, DeliveryRequest, Earnings, partnerService } from '../services/partnerService';
import { OfflineBar } from '../components/OfflineBar';
import { NotificationPopup } from '../components/NotificationPopup';
import { useDeliveryRequestSound } from '../hooks/useNotificationSound';

import { useToast } from '../context/ToastContext';
import { getTabBarTotalHeight } from '../constants/layout';

export const DashboardScreen = ({ navigation }: any) => {
  const { user, token, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const totalTabBarHeight = getTabBarTotalHeight(insets.bottom);
  const [online, setOnline] = useState(false);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [active, setActive] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [currentLocationName, setCurrentLocationName] = useState<string>('');
  const [incomingRequest, setIncomingRequest] = useState<DeliveryRequest | null>(null);
  const [requestSecondsLeft, setRequestSecondsLeft] = useState<number>(60);
  const [actionBusy, setActionBusy] = useState(false);
  const [autoOfflineBanner, setAutoOfflineBanner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { showPopup, popupMessage, dismissPopup } = useDeliveryRequestSound(Boolean(incomingRequest));

  const fetchAddressName = async (lat: number, lng: number): Promise<string> => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const item = results[0];
        const parts = [item.name, item.street, item.subregion || item.district, item.city].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch {}
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { 'User-Agent': 'RuvoPartnerApp/1.0' }
      });
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const shortName = [addr.road || addr.suburb, addr.city || addr.town || addr.county, addr.state]
          .filter(Boolean)
          .join(', ');
        return shortName || data.display_name.split(',').slice(0, 3).join(',');
      }
    } catch {}
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  };

  const getAndUpdateLiveLocation = async (): Promise<{ lat: number; lng: number; name: string } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Please grant location permissions to go online', 'warning');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const name = await fetchAddressName(lat, lng);

      setCurrentLocationName(name);
      return { lat, lng, name };
    } catch {
      showToast('Could not obtain current location. Turn on GPS.', 'warning');
      return null;
    }
  };

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [income, deliveries] = await Promise.all([
        partnerService.earnings(token),
        partnerService.activeDeliveries(token),
      ]);
      setEarnings(income);
      if (Array.isArray(deliveries)) {
        const activeOnly = deliveries.filter(d => ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(d.status));
        setActive(activeOnly.length > 0 ? activeOnly[0] : null);
      }
      await refreshProfile();
    } catch {} finally {
      setLoading(false);
    }
  }, [token, refreshProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener('focus', () => {
      load();
    });
    return unsubscribe;
  }, [navigation, load]);

  useEffect(() => {
    setOnline(Boolean(user?.isAvailable));
  }, [user?.isAvailable]);

  // Poll for incoming requests
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (online && token && !active) {
      const checkRequests = async () => {
        try {
          const reqs = await partnerService.requests(token);
          if (Array.isArray(reqs) && reqs.length > 0) {
            const first = reqs[0];
            setIncomingRequest(first);
            if (first.expiresAt) {
              const now = Date.now();
              const exp = new Date(first.expiresAt).getTime();
              const left = Math.max(0, Math.ceil((exp - now) / 1000));
              setRequestSecondsLeft(left);
            }
          } else {
            setIncomingRequest(null);
          }
        } catch {}
      };
      checkRequests();
      interval = setInterval(checkRequests, 3000);
    } else {
      setIncomingRequest(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [online, token, active]);

  // Poll for active delivery cancellations
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (token && active) {
      const checkActive = async () => {
        try {
          const deliveries = await partnerService.activeDeliveries(token);
          if (Array.isArray(deliveries)) {
            const activeOnly = deliveries.filter((d: any) => ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(d.status));
            if (activeOnly.length === 0) {
              setActive(null);
              showToast('Active delivery was cancelled or removed.', 'warning');
            } else {
              setActive(activeOnly[0]);
            }
          }
        } catch {}
      };
      interval = setInterval(checkActive, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, active, showToast]);

  // Countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (incomingRequest && incomingRequest.expiresAt) {
      timer = setInterval(() => {
        const now = Date.now();
        const exp = new Date(incomingRequest.expiresAt).getTime();
        const left = Math.max(0, Math.ceil((exp - now) / 1000));
        setRequestSecondsLeft(left);
        if (left <= 0) {
          setIncomingRequest(null);
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [incomingRequest]);

  const handleAcceptRequest = async (requestId: number) => {
    if (!token) return;
    setActionBusy(true);
    try {
      await partnerService.acceptRequest(token, requestId);
      setIncomingRequest(null);
      const activeDeliveries = await partnerService.activeDeliveries(token);
      if (Array.isArray(activeDeliveries)) {
        const activeOnly = activeDeliveries.filter(d => ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(d.status));
        if (activeOnly.length > 0) {
          const currentActive = activeOnly[0];
          setActive(currentActive);
          navigation.navigate('ActiveDelivery', { deliveryId: currentActive.id });
          return;
        }
      }
      await load();
    } catch (e: any) {
      showToast(e.message || 'This request is no longer available.', 'error');
      setIncomingRequest(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!token) return;
    setActionBusy(true);
    try {
      await partnerService.rejectRequest(token, requestId);
    } catch {} finally {
      setIncomingRequest(null);
      setActionBusy(false);
    }
  };

  // Periodic location sync
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (online && token) {
      interval = setInterval(async () => {
        const loc = await getAndUpdateLiveLocation();
        if (loc) {
          partnerService.updateLocation(token, loc.lat, loc.lng, loc.name).catch(() => {});
        }
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [online, token]);

  // Auto-offline at midnight
  useEffect(() => {
    if (!online) return;
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0, 0
    );
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timer = setTimeout(async () => {
      if (active) return;
      try {
        await partnerService.availability(token!, false);
        setOnline(false);
        setAutoOfflineBanner(true);
        setTimeout(() => setAutoOfflineBanner(false), 8000);
      } catch {}
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [online, active, token]);

  const changeAvailability = async (value: boolean) => {
    if (!token) return;
    if (active && !value) {
      showToast('Finish or resolve active delivery before going offline', 'warning');
      return;
    }

    setChanging(true);
    try {
      let locData: { lat: number; lng: number; name: string } | null = null;
      if (value) {
        locData = await getAndUpdateLiveLocation();
        if (!locData) {
          setChanging(false);
          return;
        }
      }

      await partnerService.availability(
        token,
        value,
        locData?.lat,
        locData?.lng,
        locData?.name
      );
      setOnline(value);
      showToast(value ? 'You are now ONLINE' : 'You are now OFFLINE', value ? 'success' : 'info');
    } catch (e: any) {
      let message = 'Availability could not be updated.';
      if (e instanceof ApiError) {
        if (e.status === 401) {
          showToast('Session expired. Please log in again.', 'error');
          return;
        }
        if (e.status === 403) {
          showToast('Account does not have partner access.', 'error');
          return;
        }
        message = e.message;
      }
      showToast(message, 'error');
    } finally {
      setChanging(false);
    }
  };

  return (
    <View className="flex-1 bg-[#13161C]">
      <StatusBar barStyle="light-content" backgroundColor="#13161C" translucent />
      <NotificationPopup
        visible={showPopup}
        message={popupMessage}
        subtitle="Tap to accept or decline"
        onDismiss={dismissPopup}
      />
      <OfflineBar />

      {/* Auto-Offline Banner */}
      {autoOfflineBanner && (
        <Animated.View entering={FadeIn.duration(300)} className="bg-[#FF7A00] px-lg py-md flex-row items-center gap-sm">
          <Ionicons name="moon" size={16} color="#FFF" />
          <Text className="text-white text-sm font-bold flex-1">
            You were automatically taken offline at midnight.
          </Text>
          <TouchableOpacity onPress={() => setAutoOfflineBanner(false)}>
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: totalTabBarHeight + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF7A00"
            colors={['#FF7A00']}
          />
        }
      >
        {/* Dynamic Header & Hero Toggle */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          className="pb-xl"
          style={{ paddingTop: insets.top + 16 }}
        >
          {/* Header Bar */}
          <View className="px-lg flex-row items-center justify-between mb-lg mt-2">
            <View className="flex-1">
              <View className="flex-row items-center gap-xs mb-1">
                <Text className="text-[#FF7A00] text-[10px] uppercase tracking-widest" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                  RUVO PARTNER PRO
                </Text>
              </View>
              <Text className="text-white text-3xl tracking-tight" style={{ fontFamily: 'Poppins_700Bold' }}>{user?.name || 'Partner'}</Text>
              <Text className="text-gray-400 text-xs mt-0.5" style={{ fontFamily: 'Poppins_600SemiBold' }}>
                🛵 {user?.vehicle?.vehicleType || 'Bike'} • {user?.vehicle?.vehicleNumber || 'NOT REQUIRED'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={0.7}
              className="w-12 h-12 bg-[#1C2026] rounded-full items-center justify-center border border-gray-800"
              style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 }}
            >
              <Ionicons name="refresh" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Premium Hero Action Area */}
          <View className="px-lg">
            <Animated.View entering={FadeInUp.delay(100).duration(500)}>
              <LinearGradient
                colors={online ? ['#10B981', '#047857'] : ['#1F2937', '#111827']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                className="rounded-[32px] p-6 flex-row items-center justify-between border border-white/10"
                style={{ shadowColor: online ? '#10B981' : '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 }}
              >
                <View>
                  <Text className="text-white text-3xl tracking-tight mb-1" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                    {online ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                  <Text className={`text-xs uppercase tracking-widest ${online ? 'text-emerald-100' : 'text-gray-400'}`} style={{ fontFamily: 'Poppins_600SemiBold' }}>
                    {online ? 'Ready for orders' : 'Currently Resting'}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => changeAvailability(!online)}
                  disabled={changing}
                  className={`w-28 h-14 rounded-full p-1 flex-row items-center border ${online ? 'bg-[#047857] border-white/30' : 'bg-[#111827] border-gray-700'}`}
                >
                  {changing ? (
                    <View className="w-full items-center">
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  ) : (
                    <View className={`w-12 h-12 bg-white rounded-full items-center justify-center shadow-md ${online ? 'ml-auto' : 'mr-auto'}`}>
                      <Ionicons name="power" size={24} color={online ? '#10B981' : '#9CA3AF'} />
                    </View>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </View>
        </Animated.View>

        <View className="px-lg pb-3xl">
          {online && (
            <Animated.View entering={FadeInUp.delay(150).duration(500)} className="mb-lg">
              <View className="bg-[#1C2026] rounded-[24px] p-4 flex-row items-center gap-3 border border-gray-800" style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.4, shadowRadius: 16, elevation: 3 }}>
                <View className="w-12 h-12 bg-[#FF7A00]/10 rounded-full items-center justify-center">
                  <Ionicons name="navigate-circle" size={26} color="#FF7A00" />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">
                    BROADCASTING LOCATION
                  </Text>
                  <Text className="text-sm text-white font-bold leading-tight" numberOfLines={2}>
                    {currentLocationName || 'Acquiring GPS signal...'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {loading ? (
            <View className="py-3xl items-center">
              <ActivityIndicator size="large" color="#FF7A00" />
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {/* Active Delivery Focus */}
              {active ? (
                <Animated.View entering={FadeInUp.delay(200).duration(500)} className="w-full mb-lg">
                  <TouchableOpacity
                    onPress={() => active && navigation.navigate('ActiveDelivery', { deliveryId: active.id })}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#FF7A00', '#E56D00']}
                      className="rounded-[24px] p-5 shadow-lg shadow-[#FF7A00]/30 border border-[#FF7A00]/80"
                    >
                      <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-row items-center gap-3">
                          <View className="w-12 h-12 bg-white/20 blur-md rounded-[18px] items-center justify-center border border-white/30">
                            <Ionicons name="bicycle" size={26} color="#FFF" />
                          </View>
                          <View>
                            <Text className="text-xs font-black text-white/80 uppercase tracking-widest">RUNNING</Text>
                            <Text className="text-xl font-black text-white">Order #{active.orderId}</Text>
                          </View>
                        </View>
                        <View className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30">
                          <Text className="text-[10px] font-extrabold text-white uppercase">{active.status.replace(/_/g, ' ')}</Text>
                        </View>
                      </View>
                      <View className="h-[1px] bg-white/20 w-full mb-4" />
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-white">View live route & details</Text>
                        <Ionicons name="arrow-forward-circle" size={28} color="#FFF" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ) : null}

              {/* Earnings Hero Bento */}
              <Animated.View entering={FadeInUp.delay(250).duration(500)} className="w-full mb-lg">
                <View className="bg-[#1C2026] rounded-[32px] p-6 border border-gray-800 shadow-lg shadow-black/40">
                  <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">YOUR PERFORMANCE</Text>
                  
                  <View className="flex-row items-end justify-between mb-5">
                    <View>
                      <Text className="text-[42px] text-white leading-tight" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                        ₹{earnings?.todayEarnings ?? 0}
                      </Text>
                      <Text className="text-sm text-emerald-400" style={{ fontFamily: 'Poppins_600SemiBold' }}>Earned Today</Text>
                    </View>
                    <View className="w-12 h-12 bg-emerald-500/10 rounded-2xl items-center justify-center border border-emerald-500/20">
                      <Ionicons name="trending-up" size={24} color="#10B981" />
                    </View>
                  </View>

                  <View className="h-[1px] bg-gray-800 w-full mb-5" />

                  <View className="flex-row justify-between">
                    <View className="flex-1 border-r border-gray-800 pr-2">
                      <Text className="text-[10px] font-bold text-gray-400 mb-1">Available Wallet</Text>
                      <Text className="text-xl font-black text-white">₹{earnings?.walletBalance ?? 0}</Text>
                    </View>
                    <View className="flex-1 border-r border-gray-800 px-2">
                      <Text className="text-[10px] font-bold text-gray-400 mb-1">Lifetime Total</Text>
                      <Text className="text-xl font-black text-white">₹{earnings?.totalEarnings ?? 0}</Text>
                    </View>
                    <View className="flex-[1.2] pl-2">
                       <Text className="text-[10px] font-black text-rose-500 mb-1 tracking-widest uppercase">Pay To Shop</Text>
                       <Text className="text-xl font-black text-rose-400">₹{earnings?.shopDues ?? 0}</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* Quick Action Bento Grid (2x2) */}
              <View className="w-full">
                <Text className="text-sm text-white mb-3 tracking-wide ml-2" style={{ fontFamily: 'Poppins_700Bold' }}>Quick Actions</Text>
                
                <View className="flex-row justify-between mb-sm gap-sm">
                  <Animated.View entering={FadeInUp.delay(300).duration(500)} className="flex-1">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Deliveries')}
                      activeOpacity={0.8}
                      className="bg-[#1C2026] rounded-[24px] p-5 items-center justify-center border border-gray-800 h-[110px] shadow-lg shadow-black/30"
                    >
                      <View className="w-12 h-12 bg-[#FF7A00]/10 rounded-[18px] items-center justify-center mb-3">
                        <Ionicons name="list" size={24} color="#FF7A00" />
                      </View>
                      <Text className="text-xs text-white" style={{ fontFamily: 'Poppins_600SemiBold' }}>Deliveries</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View entering={FadeInUp.delay(350).duration(500)} className="flex-1">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('History')}
                      activeOpacity={0.8}
                      className="bg-[#1C2026] rounded-[24px] p-5 items-center justify-center border border-gray-800 h-[110px] shadow-lg shadow-black/30"
                    >
                      <View className="w-12 h-12 bg-blue-500/10 rounded-[18px] items-center justify-center mb-3">
                        <Ionicons name="time" size={24} color="#3B82F6" />
                      </View>
                      <Text className="text-xs text-white" style={{ fontFamily: 'Poppins_600SemiBold' }}>History</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                <View className="flex-row justify-between gap-sm">
                  <Animated.View entering={FadeInUp.delay(400).duration(500)} className="flex-1">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Earnings')}
                      activeOpacity={0.8}
                      className="bg-[#1C2026] rounded-[24px] p-5 items-center justify-center border border-gray-800 h-[110px] shadow-lg shadow-black/30"
                    >
                      <View className="w-12 h-12 bg-emerald-500/10 rounded-[18px] items-center justify-center mb-3">
                        <Ionicons name="wallet" size={24} color="#10B981" />
                      </View>
                      <Text className="text-xs text-white" style={{ fontFamily: 'Poppins_600SemiBold' }}>Payouts</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View entering={FadeInUp.delay(450).duration(500)} className="flex-1">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Profile')}
                      activeOpacity={0.8}
                      className="bg-[#1C2026] rounded-[24px] p-5 items-center justify-center border border-gray-800 h-[110px] shadow-lg shadow-black/30"
                    >
                      <View className="w-12 h-12 bg-purple-500/10 rounded-[18px] items-center justify-center mb-3">
                        <Ionicons name="person" size={24} color="#8B5CF6" />
                      </View>
                      <Text className="text-xs text-white" style={{ fontFamily: 'Poppins_600SemiBold' }}>Profile</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Incoming Delivery Request Modal (Redesigned for Premium Dark) */}
      <Modal
        visible={Boolean(incomingRequest)}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View className="flex-1 bg-ruvo-ink/90 justify-end">
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="bg-[#1C2026] rounded-t-[32px] p-xl border-t border-gray-800"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 24 }}
          >
            {/* Header: Bright and Alert */}
            <View className="flex-row items-center justify-between mb-lg">
              <View className="bg-[#FF7A00]/10 px-4 py-2 rounded-full flex-row items-center gap-2 border border-[#FF7A00]/30">
                <View className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
                <Text className="font-black text-[#FF7A00] tracking-widest text-xs">NEW ORDER</Text>
              </View>
              
              <View className="bg-red-500/10 border border-red-500/30 px-lg py-xs rounded-full flex-row items-center gap-xs">
                <Ionicons name="timer" size={16} color="#EF4444" />
                <Text className="text-red-500 font-black text-lg">{requestSecondsLeft}s</Text>
              </View>
            </View>

            {/* Order Route */}
            <View className="bg-white/5 rounded-[24px] p-4 mb-lg border border-white/10">
              {incomingRequest?.shopName && (
                <View className="flex-row mb-xl relative">
                  <View className="w-12 h-12 bg-gray-800 rounded-full items-center justify-center mr-md border border-gray-700 z-10">
                    <Ionicons name="storefront" size={20} color="#FF7A00" />
                  </View>
                  {/* Connecting Line */}
                  <View className="absolute left-6 top-12 bottom-[-24px] w-[2px] bg-gray-800 rounded-full" />
                  
                  <View className="flex-1 justify-center pt-1">
                    <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                      PICKUP
                    </Text>
                    <Text className="text-lg font-black text-white">
                      {incomingRequest.shopName}
                    </Text>
                    {incomingRequest.shopAddress && (
                      <Text className="text-sm text-gray-400 mt-1 leading-5">
                        {incomingRequest.shopAddress}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {incomingRequest?.deliveryAddress && (
                <View className="flex-row mt-2">
                  <View className="w-12 h-12 bg-[#FF7A00] rounded-full items-center justify-center mr-md border border-[#FF7A00]/50 z-10 shadow-sm shadow-[#FF7A00]/20">
                    <Ionicons name="location" size={20} color="#FFF" />
                  </View>
                  <View className="flex-1 justify-center pt-1">
                    <Text className="text-[10px] font-black text-[#FF7A00] uppercase tracking-widest mb-1">
                      DROP-OFF
                    </Text>
                    <Text className="text-base font-bold text-gray-300 mt-1 leading-5" numberOfLines={3}>
                      {incomingRequest.deliveryAddress}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Metrics */}
            <View className="flex-row gap-3 mb-xl">
              {incomingRequest?.distanceKm != null && (
                <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center">
                  <Ionicons name="navigate-outline" size={20} color="#9CA3AF" style={{ marginBottom: 4 }} />
                  <Text className="text-xs font-bold text-gray-400 mb-1">DIST</Text>
                  <Text className="text-lg font-black text-white">{(Math.round((incomingRequest.distanceKm ?? 0) * 10) / 10).toFixed(1)} km</Text>
                </View>
              )}
              {incomingRequest?.deliveryFee != null && (
                <View className="flex-1 bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-4 items-center relative overflow-hidden">
                  <View className="absolute top-0 right-0 p-1 opacity-20"><Ionicons name="cash" size={40} color="#10B981" /></View>
                  <Text className="text-xs font-black text-[#10B981] mb-1">EARNING</Text>
                  <Text className="text-2xl font-black text-white">₹{incomingRequest.deliveryFee}</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View className="flex-row gap-lg mt-2" style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
              <TouchableOpacity
                onPress={() => incomingRequest && handleRejectRequest(incomingRequest.requestId)}
                disabled={actionBusy}
                className="flex-1 bg-white/5 border border-white/10 rounded-[20px] py-4 items-center justify-center"
              >
                <Text className="font-extrabold text-gray-400 text-base">DECLINE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => incomingRequest && handleAcceptRequest(incomingRequest.requestId)}
                disabled={actionBusy}
                className="flex-[1.5] bg-[#FF7A00] rounded-[20px] py-4 items-center justify-center flex-row gap-2"
                style={{ shadowColor: '#FF7A00', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}
              >
                {actionBusy ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="bicycle" size={20} color="#FFF" />
                    <Text className="font-black text-white text-lg tracking-widest flex-shrink-0">ACCEPT ORDER</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};
