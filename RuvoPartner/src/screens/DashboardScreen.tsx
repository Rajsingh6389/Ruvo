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

export const DashboardScreen = () => {
  const { user, token, refreshProfile } = useAuth();
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
        Alert.alert('Location Permission Required', 'Please grant location permissions to go online and receive delivery runs.');
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
      Alert.alert('Location Error', 'Could not obtain your current location. Please turn on GPS.');
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
        setActive(deliveries.length > 0 ? deliveries[0] : null);
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
      if (Array.isArray(activeDeliveries) && activeDeliveries.length > 0) {
        const currentActive = activeDeliveries[0];
        setActive(currentActive);
        navigation.navigate('ActiveDelivery', { deliveryId: currentActive.id });
      } else {
        await load();
      }
    } catch (e: any) {
      Alert.alert('Request Expired', e.message || 'This request is no longer available.');
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
      Alert.alert(
        'Active Delivery in Progress',
        'Finish or resolve your active delivery before going offline.'
      );
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
    } catch (e: any) {
      let message = 'Availability could not be updated.';
      if (e instanceof ApiError) {
        if (e.status === 401) {
          Alert.alert('Session Expired', 'Your session has expired. Please log out and log back in.');
          return;
        }
        if (e.status === 403) {
          Alert.alert('Permission Denied', 'Your account does not have partner access.');
          return;
        }
        message = e.message;
      }
      Alert.alert('Status Change Failed', message);
    } finally {
      setChanging(false);
    }
  };

  const phoneDigits = user?.mobileNumber?.replace(/[^0-9]/g, '').slice(-10) || '';

  return (
    <View className="flex-1 bg-ruvo-bg">
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" translucent />
      <NotificationPopup
        visible={showPopup}
        message={popupMessage}
        subtitle="Tap to accept or decline"
        onDismiss={dismissPopup}
      />
      <OfflineBar />

      {/* Auto-Offline Banner */}
      {autoOfflineBanner && (
        <Animated.View entering={FadeIn.duration(300)} className="bg-warm-900 px-lg py-md flex-row items-center gap-sm">
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16A34A"
            colors={['#16A34A']}
          />
        }
      >
        {/* Hero Header */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          className="bg-ruvo-accent px-lg pb-2xl"
          style={{ paddingTop: insets.top + 20 }}
        >
          <View className="flex-row items-center justify-between mb-lg">
            <View className="flex-1">
              <Text className="text-white/70 text-sm font-semibold mb-xs">Welcome back,</Text>
              <Text className="text-white text-2xl font-extrabold">{user?.name || 'Delivery Partner'}</Text>
              {user?.vehicle?.vehicleType && (
                <Text className="text-white/60 text-xs font-medium mt-xs">
                  🛵 {user.vehicle.vehicleType} • {user.vehicle.vehicleNumber}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={onRefresh}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="refresh" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Status Toggle */}
          <View className="flex-row items-center justify-between bg-white/10 rounded-xl px-lg py-md">
            <View className="flex-row items-center gap-md">
              <View className={`w-3 h-3 rounded-full ${online ? 'bg-green-300' : 'bg-warm-400'}`} />
              <Text className={`text-base font-extrabold ${online ? 'text-green-100' : 'text-white/70'}`}>
                {online ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
            <Switch
              value={online}
              disabled={changing}
              onValueChange={changeAvailability}
              trackColor={{ false: '#64748B', true: '#10B981' }}
              thumbColor="#FFF"
            />
          </View>
        </Animated.View>

        <View className="px-lg" style={{ marginTop: -24 }}>
          {/* GO ONLINE/OFFLINE Button */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
            <TouchableOpacity
              disabled={changing}
              onPress={() => changeAvailability(!online)}
              activeOpacity={0.85}
              className={`rounded-xl py-lg px-xl flex-row items-center justify-center gap-md ${
                online ? 'bg-ruvo-accent-soft border-2 border-ruvo-accent' : 'bg-ruvo-accent'
              }`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: online ? 0.08 : 0.2,
                shadowRadius: 12,
                elevation: online ? 2 : 6,
              }}
            >
              <Ionicons
                name={online ? 'radio-button-on' : 'power'}
                size={24}
                color={online ? '#16A34A' : '#FFF'}
              />
              <Text className={`text-lg font-extrabold ${online ? 'text-ruvo-accent' : 'text-white'}`}>
                {online ? 'GO OFFLINE' : 'GO ONLINE'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Live Location Card */}
          {online && (
            <Animated.View entering={FadeInUp.delay(200).duration(500)} className="mt-lg">
              <Card className="bg-green-50 border-green-300">
                <View className="flex-row items-center gap-md">
                  <View className="w-10 h-10 bg-green-200 rounded-lg items-center justify-center">
                    <Ionicons name="location" size={20} color="#16A34A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-extrabold text-green-700 uppercase tracking-wider mb-xs">
                      Live Location
                    </Text>
                    <Text className="text-sm text-ruvo-ink font-semibold" numberOfLines={2}>
                      {currentLocationName || 'Fetching location...'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={getAndUpdateLiveLocation}
                    className="w-9 h-9 bg-white rounded-lg border border-green-300 items-center justify-center"
                  >
                    <Ionicons name="refresh" size={16} color="#16A34A" />
                  </TouchableOpacity>
                </View>
              </Card>
            </Animated.View>
          )}

          {loading ? (
            <View className="py-3xl items-center">
              <ActivityIndicator size="large" color="#16A34A" />
            </View>
          ) : (
            <>
              {/* Active Delivery Card */}
              <Animated.View entering={FadeInUp.delay(300).duration(500)} className="mt-lg">
                <TouchableOpacity
                  onPress={() => active && navigation.navigate('ActiveDelivery', { deliveryId: active.id })}
                  activeOpacity={0.9}
                >
                  <Card className={active ? 'bg-orange-50 border-orange-300' : 'bg-ruvo-surface border-warm-300'}>
                    <View className="flex-row items-center gap-md">
                      <View className={`w-12 h-12 rounded-xl items-center justify-center ${
                        active ? 'bg-orange-200' : 'bg-green-100'
                      }`}>
                        <Ionicons
                          name={active ? 'bicycle' : 'checkmark-circle'}
                          size={24}
                          color={active ? '#F97316' : '#16A34A'}
                        />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center gap-sm mb-xs">
                          <Text className="text-base font-extrabold text-ruvo-ink">
                            {active ? 'Active Delivery Run' : 'Ready for Deliveries'}
                          </Text>
                          {active && (
                            <Badge variant="warning" size="sm">IN PROGRESS</Badge>
                          )}
                        </View>
                        <Text className="text-xs text-warm-600 font-medium leading-5">
                          {active
                            ? `Order #${active.orderId} • ${active.status.replaceAll('_', ' ')}`
                            : 'Stay online to receive automated delivery assignments.'}
                        </Text>
                      </View>

                      {active && (
                        <Ionicons name="chevron-forward" size={20} color="#A79E92" />
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              </Animated.View>

              {/* Earnings Section */}
              <Animated.View entering={FadeInUp.delay(400).duration(500)} className="mt-xl">
                <Text className="text-lg font-extrabold text-ruvo-ink mb-md">Today's Earnings & Balance</Text>
                <View className={`flex-row gap-sm ${isTablet ? 'flex-wrap' : ''}`}>
                  <View className="flex-1 min-w-[100px]">
                    <Card className="items-start">
                      <View className="w-9 h-9 bg-green-100 rounded-lg items-center justify-center mb-sm">
                        <Ionicons name="today-outline" size={18} color="#16A34A" />
                      </View>
                      <Text className="text-2xl font-extrabold text-ruvo-ink">₹{earnings?.todayEarnings ?? 0}</Text>
                      <Text className="text-xs text-warm-600 font-semibold mt-xs">Today</Text>
                    </Card>
                  </View>

                  <View className="flex-1 min-w-[100px]">
                    <Card className="items-start">
                      <View className="w-9 h-9 bg-blue-100 rounded-lg items-center justify-center mb-sm">
                        <Ionicons name="wallet-outline" size={18} color="#3B82F6" />
                      </View>
                      <Text className="text-2xl font-extrabold text-ruvo-ink">₹{earnings?.walletBalance ?? 0}</Text>
                      <Text className="text-xs text-warm-600 font-semibold mt-xs">Wallet</Text>
                    </Card>
                  </View>

                  <View className="flex-1 min-w-[100px]">
                    <Card className="items-start">
                      <View className="w-9 h-9 bg-purple-100 rounded-lg items-center justify-center mb-sm">
                        <Ionicons name="trending-up-outline" size={18} color="#8B5CF6" />
                      </View>
                      <Text className="text-2xl font-extrabold text-ruvo-ink">₹{earnings?.totalEarnings ?? 0}</Text>
                      <Text className="text-xs text-warm-600 font-semibold mt-xs">All Time</Text>
                    </Card>
                  </View>
                </View>
              </Animated.View>

              {/* Quick Actions */}
              <Animated.View entering={FadeInUp.delay(500).duration(500)} className="mt-xl mb-xl">
                <Text className="text-lg font-extrabold text-ruvo-ink mb-md">Quick Actions</Text>
                <View className="flex-row gap-sm">
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AvailableDeliveries')}
                    className="flex-1"
                  >
                    <Card className="items-center py-lg">
                      <Ionicons name="list-outline" size={24} color="#16A34A" />
                      <Text className="text-xs font-bold text-ruvo-ink mt-sm">Available</Text>
                    </Card>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('History')}
                    className="flex-1"
                  >
                    <Card className="items-center py-lg">
                      <Ionicons name="time-outline" size={24} color="#3B82F6" />
                      <Text className="text-xs font-bold text-ruvo-ink mt-sm">History</Text>
                    </Card>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('Earnings')}
                    className="flex-1"
                  >
                    <Card className="items-center py-lg">
                      <Ionicons name="cash-outline" size={24} color="#F59E0B" />
                      <Text className="text-xs font-bold text-ruvo-ink mt-sm">Earnings</Text>
                    </Card>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('Profile')}
                    className="flex-1"
                  >
                    <Card className="items-center py-lg">
                      <Ionicons name="person-outline" size={24} color="#8B5CF6" />
                      <Text className="text-xs font-bold text-ruvo-ink mt-sm">Profile</Text>
                    </Card>
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
        <View className="flex-1 bg-warm-900/75 justify-end">
          <Animated.View
            entering={FadeInUp.duration(400)}
            className="bg-ruvo-surface rounded-t-3xl p-xl"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-lg">
              <Badge variant="warning" size="lg">
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="notifications" size={16} color="#EA580C" />
                  <Text className="font-extrabold">NEW DELIVERY REQUEST</Text>
                </View>
              </Badge>
              <View className="bg-red-100 px-md py-xs rounded-lg flex-row items-center gap-xs">
                <Ionicons name="time" size={14} color="#DC2626" />
                <Text className="text-red-600 font-extrabold text-sm">{requestSecondsLeft}s</Text>
              </View>
            </View>

            {/* Order Details */}
            <Text className="text-2xl font-extrabold text-ruvo-ink mb-md">
              Order #{incomingRequest?.orderId}
            </Text>

            {incomingRequest?.distanceKm != null && (
              <View className="flex-row items-center gap-md bg-warm-100 rounded-lg p-md mb-sm">
                <Ionicons name="navigate" size={18} color="#16A34A" />
                <Text className="flex-1 text-sm font-semibold text-ruvo-ink">
                  Distance: {(Math.round((incomingRequest.distanceKm ?? 0) * 10) / 10).toFixed(1)} km to pickup
                </Text>
              </View>
            )}

            {incomingRequest?.deliveryAddress && (
              <View className="flex-row items-center gap-md bg-warm-100 rounded-lg p-md mb-sm">
                <Ionicons name="location" size={18} color="#3B82F6" />
                <Text className="flex-1 text-sm font-semibold text-ruvo-ink" numberOfLines={2}>
                  Drop: {incomingRequest.deliveryAddress}
                </Text>
              </View>
            )}

            {incomingRequest?.totalAmount != null && (
              <View className="flex-row items-center gap-md bg-warm-100 rounded-lg p-md mb-md">
                <Ionicons name="cash" size={18} color="#16A34A" />
                <Text className="flex-1 text-sm font-semibold text-ruvo-ink">
                  Order Total: ₹{incomingRequest.totalAmount} ({incomingRequest.paymentMethod || 'COD'})
                </Text>
              </View>
            )}

            {incomingRequest?.deliveryFee != null && (
              <View className="bg-green-50 border-2 border-green-300 rounded-xl p-lg items-center mb-lg">
                <Text className="text-xs font-extrabold text-green-700 uppercase tracking-wider">
                  ESTIMATED EARNING
                </Text>
                <Text className="text-3xl font-extrabold text-ruvo-accent mt-xs">
                  +₹{incomingRequest.deliveryFee}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View className="flex-row gap-md">
              <Button
                variant="outline"
                onPress={() => incomingRequest && handleRejectRequest(incomingRequest.requestId)}
                disabled={actionBusy}
                className="flex-1"
              >
                Decline
              </Button>

              <Button
                variant="primary"
                onPress={() => incomingRequest && handleAcceptRequest(incomingRequest.requestId)}
                loading={actionBusy}
                icon="checkmark-circle"
                className="flex-[2]"
              >
                ACCEPT RUN
              </Button>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};
