/**
 * DashboardScreen - RuvoPartner (Redesigned with Premium UI/UX)
 * 
 * Features:
 * - Online/Offline status toggle with live location
 * - Real-time earnings display
 * - Active delivery status card
 * - Incoming delivery request modal with countdown
 * - Auto-offline at midnight with banner
 * - Pull-to-refresh
 * - Smooth animations
 * - Responsive layout
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  RefreshControl,
  Switch,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Location from 'expo-location';

import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { Delivery, DeliveryRequest, Earnings, partnerService } from '../services/partnerService';
import { OfflineBar } from '../components/OfflineBar';
import { NotificationPopup } from '../components/NotificationPopup';
import { useDeliveryRequestSound } from '../hooks/useNotificationSound';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

import { useToast } from '../context/ToastContext';

export const DashboardScreen = () => {
  const { user, token, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [online, setOnline] = useState(false);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [active, setActive] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [currentLocationName, setCurrentLocationName] = useState<string>('');
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
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

      setCurrentCoords({ latitude: lat, longitude: lng });
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
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    setOnline(Boolean(user?.isAvailable));
  }, [user?.isAvailable]);

  // Poll for incoming requests
  useEffect(() => {
    let interval: any = null;
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

  // Countdown timer
  useEffect(() => {
    let timer: any = null;
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
    let interval: any = null;
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

  const phoneDigits = user?.mobileNumber?.replace(/[^0-9]/g, '').slice(-10) || '';

  return (
    <View className="flex-1 bg-ruvo-bg">
      <StatusBar barStyle="light-content" backgroundColor="#171A1F" translucent />
      <NotificationPopup
        visible={showPopup}
        message={popupMessage}
        subtitle="Tap to accept or decline"
        onDismiss={dismissPopup}
      />
      <OfflineBar />

      {/* Auto-Offline Banner */}
      {autoOfflineBanner && (
        <Animated.View entering={FadeIn.duration(300)} className="bg-ruvo-ink px-lg py-md flex-row items-center gap-sm">
          <Ionicons name="moon" size={16} color="#F4B400" />
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F4B400"
            colors={['#F4B400']}
          />
        }
      >
        {/* Hero Header */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          className="bg-[#171A1F] px-lg pb-3xl"
          style={{ paddingTop: insets.top + 12 }}
        >
          <View className="flex-row items-center justify-between mb-lg">
            <View className="flex-1">
              <View className="flex-row items-center gap-xs mb-1">
                <Text className="text-warm-400 text-[11px] font-extrabold uppercase tracking-widest">RUVO PARTNER</Text>
              </View>
              <Text className="text-white text-2xl font-black tracking-tight">{user?.name || 'Partner'}</Text>
              <Text className="text-warm-300 text-xs font-semibold mt-1">
                🛵 {user?.vehicle?.vehicleType || 'Bike'} • {user?.vehicle?.vehicleNumber || 'NOT_REQUIRED'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={0.7}
              className="w-11 h-11 bg-[#222731] rounded-full items-center justify-center border border-white/10 shadow-sm"
            >
              <Ionicons name="refresh" size={18} color="#F4B400" />
            </TouchableOpacity>
          </View>

          {/* Status Toggle Header Strip */}
          <View className="flex-row items-center justify-between bg-[#1E232D] rounded-2xl px-lg py-3.5 border border-stone-800">
            <View className="flex-row items-center gap-3">
              <View className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-stone-500'}`} />
              <Text className={`text-xs font-black tracking-wider ${online ? 'text-emerald-400' : 'text-stone-400'}`}>
                {online ? 'ONLINE • ACCEPTING ORDERS' : 'OFFLINE • RESTING'}
              </Text>
            </View>
            <Switch
              value={online}
              disabled={changing}
              onValueChange={changeAvailability}
              trackColor={{ false: '#3E4249', true: '#18A957' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Animated.View>

        <View className="px-lg" style={{ marginTop: -24 }}>
          {/* GO ONLINE/OFFLINE Action Button */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
            <TouchableOpacity
              disabled={changing}
              onPress={() => changeAvailability(!online)}
              activeOpacity={0.85}
              className={`rounded-full py-4 px-xl flex-row items-center justify-center gap-3 ${
                online
                  ? 'bg-white border-2 border-emerald-500 shadow-md'
                  : 'bg-ruvo-primary shadow-lg shadow-amber-500/25 border-2 border-amber-400'
              }`}
              style={{
                elevation: 4,
              }}
            >
              <Ionicons
                name={online ? 'radio-button-on' : 'power'}
                size={22}
                color={online ? '#18A957' : '#171A1F'}
              />
              <Text className={`text-base font-black tracking-wider ${online ? 'text-emerald-700' : 'text-ruvo-ink'}`}>
                {online ? 'GO OFFLINE' : 'GO ONLINE'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Live Location Card */}
          {online && (
            <Animated.View entering={FadeInUp.delay(200).duration(500)} className="mt-md">
              <View className="bg-white rounded-3xl p-4 border border-[#EDE7DE] shadow-sm flex-row items-center gap-3">
                <View className="w-11 h-11 bg-emerald-50 rounded-full items-center justify-center border border-emerald-100">
                  <Ionicons name="location" size={20} color="#18A957" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">
                    LIVE LOCATION
                  </Text>
                  <Text className="text-sm text-ruvo-ink font-bold leading-tight" numberOfLines={2}>
                    {currentLocationName || 'Fetching live location...'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={getAndUpdateLiveLocation}
                  className="w-10 h-10 bg-white rounded-full border border-warm-200 items-center justify-center shadow-xs"
                >
                  <Ionicons name="refresh" size={16} color="#171A1F" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {loading ? (
            <View className="py-3xl items-center">
              <ActivityIndicator size="large" color="#F4B400" />
            </View>
          ) : (
            <>
              {/* Active Delivery Card */}
              <Animated.View entering={FadeInUp.delay(300).duration(500)} className="mt-md">
                <TouchableOpacity
                  onPress={() => active && navigation.navigate('ActiveDelivery', { deliveryId: active.id })}
                  activeOpacity={0.9}
                >
                  <View className={`rounded-3xl p-4 border shadow-sm flex-row items-center gap-3.5 ${
                    active ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-[#EDE7DE]'
                  }`}>
                    <View className={`w-12 h-12 rounded-2xl items-center justify-center ${
                      active ? 'bg-amber-100' : 'bg-emerald-50 border border-emerald-100'
                    }`}>
                      <Ionicons
                        name={active ? 'bicycle' : 'checkmark-circle'}
                        size={24}
                        color={active ? '#D97706' : '#18A957'}
                      />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-0.5">
                        <Text className="text-base font-black text-ruvo-ink">
                          {active ? 'Active Delivery Run' : 'Ready for Deliveries'}
                        </Text>
                        {active && (
                          <View className="bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            <Text className="text-[10px] font-black text-amber-800 uppercase">IN PROGRESS</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-warm-600 font-medium leading-4">
                        {active
                          ? `Order #${active.orderId} • ${active.status.replaceAll('_', ' ')}`
                          : 'Stay online to receive automated delivery assignments.'}
                      </Text>
                    </View>

                    {active && (
                      <Ionicons name="chevron-forward" size={20} color="#A8A29E" />
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Earnings Section */}
              <Animated.View entering={FadeInUp.delay(400).duration(500)} className="mt-xl">
                <Text className="text-base font-black text-ruvo-ink mb-3 tracking-tight">Today's Earnings & Balance</Text>
                <View className={`flex-row gap-2.5 ${isTablet ? 'flex-wrap' : ''}`}>
                  <View className="flex-1 min-w-[95px]">
                    <View className="bg-white rounded-3xl p-3.5 border border-[#EDE7DE] shadow-sm items-start">
                      <View className="w-9 h-9 bg-amber-50 rounded-xl items-center justify-center mb-2.5 border border-amber-200">
                        <Ionicons name="today-outline" size={16} color="#F4B400" />
                      </View>
                      <Text className="text-xl font-black text-ruvo-ink">₹{earnings?.todayEarnings ?? 0}</Text>
                      <Text className="text-xs text-warm-500 font-semibold mt-1">Today</Text>
                    </View>
                  </View>

                  <View className="flex-1 min-w-[95px]">
                    <View className="bg-white rounded-3xl p-3.5 border border-[#EDE7DE] shadow-sm items-start">
                      <View className="w-9 h-9 bg-blue-50 rounded-xl items-center justify-center mb-2.5 border border-blue-200">
                        <Ionicons name="wallet-outline" size={16} color="#3478C8" />
                      </View>
                      <Text className="text-xl font-black text-ruvo-ink">₹{earnings?.walletBalance ?? 0}</Text>
                      <Text className="text-xs text-warm-500 font-semibold mt-1">Wallet</Text>
                    </View>
                  </View>

                  <View className="flex-1 min-w-[95px]">
                    <View className="bg-white rounded-3xl p-3.5 border border-[#EDE7DE] shadow-sm items-start">
                      <View className="w-9 h-9 bg-emerald-50 rounded-xl items-center justify-center mb-2.5 border border-emerald-200">
                        <Ionicons name="trending-up-outline" size={16} color="#18A957" />
                      </View>
                      <Text className="text-xl font-black text-ruvo-ink">₹{earnings?.totalEarnings ?? 0}</Text>
                      <Text className="text-xs text-warm-500 font-semibold mt-1">All Time</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* Quick Actions */}
              <Animated.View entering={FadeInUp.delay(500).duration(500)} className="mt-xl mb-xl">
                <Text className="text-base font-black text-ruvo-ink mb-3 tracking-tight">Quick Actions</Text>
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Deliveries')}
                    className="flex-1"
                    activeOpacity={0.8}
                  >
                    <View className="items-center py-3.5 px-2 bg-white rounded-2xl border border-[#EDE7DE] shadow-sm">
                      <Ionicons name="bicycle-outline" size={22} color="#171A1F" />
                      <Text className="text-xs font-bold text-ruvo-ink mt-2">Deliveries</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('History')}
                    className="flex-1"
                    activeOpacity={0.8}
                  >
                    <View className="items-center py-3.5 px-2 bg-white rounded-2xl border border-[#EDE7DE] shadow-sm">
                      <Ionicons name="time-outline" size={22} color="#171A1F" />
                      <Text className="text-xs font-bold text-ruvo-ink mt-2">History</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('Earnings')}
                    className="flex-1"
                    activeOpacity={0.8}
                  >
                    <View className="items-center py-3.5 px-2 bg-white rounded-2xl border border-[#EDE7DE] shadow-sm">
                      <Ionicons name="cash-outline" size={22} color="#171A1F" />
                      <Text className="text-xs font-bold text-ruvo-ink mt-2">Earnings</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('Profile')}
                    className="flex-1"
                    activeOpacity={0.8}
                  >
                    <View className="items-center py-3.5 px-2 bg-white rounded-2xl border border-[#EDE7DE] shadow-sm">
                      <Ionicons name="person-outline" size={22} color="#171A1F" />
                      <Text className="text-xs font-bold text-ruvo-ink mt-2">Profile</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Incoming Delivery Request Modal */}
      <Modal
        visible={Boolean(incomingRequest)}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View className="flex-1 bg-ruvo-ink/80 justify-end">
          <Animated.View
            entering={FadeInUp.duration(400)}
            className="bg-ruvo-surface rounded-t-3xl p-xl border-t border-ruvo-border"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-lg">
              <Badge variant="warning" size="lg">
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="notifications" size={16} color="#E99A16" />
                  <Text className="font-extrabold text-amber-800">NEW DELIVERY REQUEST</Text>
                </View>
              </Badge>
              <View className="bg-red-50 border border-red-200 px-md py-xs rounded-lg flex-row items-center gap-xs">
                <Ionicons name="time" size={14} color="#D94A4A" />
                <Text className="text-red-700 font-extrabold text-sm">{requestSecondsLeft}s</Text>
              </View>
            </View>

            {/* Order Route */}
            <View className="mb-lg">
              {incomingRequest?.shopName && (
                <View className="flex-row mb-sm">
                  <View className="w-10 h-10 bg-amber-50 rounded-xl items-center justify-center mr-md border border-amber-200">
                    <Ionicons name="storefront" size={20} color="#F4B400" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-xs font-extrabold text-amber-700 uppercase tracking-widest mb-xs">
                      PICKUP
                    </Text>
                    <Text className="text-base font-extrabold text-ruvo-ink">
                      {incomingRequest.shopName}
                    </Text>
                    {incomingRequest.shopAddress && (
                      <Text className="text-sm text-warm-600 mt-xs leading-5">
                        {incomingRequest.shopAddress}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {incomingRequest?.deliveryAddress && (
                <View className="flex-row">
                  <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-md border border-blue-200">
                    <Ionicons name="location" size={20} color="#3478C8" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-xs font-extrabold text-blue-700 uppercase tracking-widest mb-xs">
                      DROP-OFF
                    </Text>
                    <Text className="text-sm font-semibold text-ruvo-ink mt-xs leading-5" numberOfLines={3}>
                      {incomingRequest.deliveryAddress}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {incomingRequest?.distanceKm != null && (
              <View className="flex-row items-center justify-center gap-md bg-ruvo-bg border border-ruvo-border rounded-xl p-md mb-md">
                <Ionicons name="navigate" size={18} color="#F4B400" />
                <Text className="text-sm font-extrabold text-ruvo-ink uppercase tracking-wider">
                  {(Math.round((incomingRequest.distanceKm ?? 0) * 10) / 10).toFixed(1)} KM TOTAL DISTANCE
                </Text>
              </View>
            )}

            {incomingRequest?.totalAmount != null && (
              <View className="flex-row items-center gap-md bg-ruvo-bg border border-ruvo-border rounded-xl p-md mb-md">
                <Ionicons name="cash" size={18} color="#18A957" />
                <Text className="flex-1 text-sm font-semibold text-ruvo-ink">
                  Order Total: ₹{incomingRequest.totalAmount} ({incomingRequest.paymentMethod || 'COD'})
                </Text>
              </View>
            )}

            {incomingRequest?.deliveryFee != null && (
              <View className="bg-emerald-50 border border-emerald-300 rounded-xl p-lg items-center mb-lg">
                <Text className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                  ESTIMATED EARNING
                </Text>
                <Text className="text-3xl font-extrabold text-emerald-700 mt-xs">
                  +₹{incomingRequest.deliveryFee}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View className="flex-row gap-lg mt-sm">
              <TouchableOpacity
                onPress={() => incomingRequest && handleRejectRequest(incomingRequest.requestId)}
                disabled={actionBusy}
                className="flex-[0.8] bg-red-50 border border-red-200 rounded-xl py-lg items-center justify-center"
              >
                <Text className="font-extrabold text-red-600 text-base">DECLINE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => incomingRequest && handleAcceptRequest(incomingRequest.requestId)}
                disabled={actionBusy}
                className="flex-1 bg-emerald-600 rounded-xl py-lg items-center justify-center flex-row gap-sm shadow-md"
              >
                {actionBusy ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text className="font-black text-white text-base tracking-widest">ACCEPT</Text>
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
