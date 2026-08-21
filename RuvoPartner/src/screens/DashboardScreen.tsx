import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ApiError } from '../services/api';
import { Delivery, DeliveryRequest, Earnings, partnerService } from '../services/partnerService';

const PRIMARY_EMERALD = '#059669';
const EMERALD_LIGHT = '#ECFDF5';
const ACCENT_ORANGE = '#F97316';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';

export const DashboardScreen = () => {
  const { user, token, verificationStatus, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

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

  const fetchAddressName = async (lat: number, lng: number): Promise<string> => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const item = results[0];
        const parts = [item.name, item.street, item.subregion || item.district, item.city].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch (e) {
      console.warn('Expo reverse geocode failed, trying fallback...', e);
    }
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
    } catch (e) {
      console.warn('Fallback reverse geocode failed:', e);
    }
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
    } catch (e: any) {
      console.warn('Error fetching location:', e);
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
      // Show the first active delivery; the backend may return an empty list briefly
      // after accepting a request, so we keep the existing active state if list is empty
      if (Array.isArray(deliveries)) {
        setActive(deliveries.length > 0 ? deliveries[0] : null);
      }
      await refreshProfile();
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

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

  React.useEffect(() => {
    setOnline(Boolean(user?.isAvailable));
  }, [user?.isAvailable]);

  // Poll for incoming broadcast delivery requests every 3 seconds while online
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
        } catch (e) {
          // silent fail
        }
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

  // Countdown timer for incoming request
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
    } catch (e) {
      // ignore
    } finally {
      setIncomingRequest(null);
      setActionBusy(false);
    }
  };

  // Periodic location sync every 30 seconds while online
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

  // Auto-offline at midnight: schedule a timer that fires at the next 00:00:00 local time
  useEffect(() => {
    if (!online) return;
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // next day
      0, 0, 0, 0
    );
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timer = setTimeout(async () => {
      if (active) return; // Don't auto-offline if there is an active delivery in progress
      try {
        await partnerService.availability(token!, false);
        setOnline(false);
        setAutoOfflineBanner(true);
        // Hide banner after 8 seconds
        setTimeout(() => setAutoOfflineBanner(false), 8000);
      } catch { /* ignore — backend's midnight job will also handle it */ }
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
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log out and log back in.',
            [{ text: 'OK' }]
          );
          return;
        }
        if (e.status === 403) {
          Alert.alert(
            'Permission Denied',
            'Your account does not have partner access. Please log out and log in again with your partner mobile number.',
            [{ text: 'OK' }]
          );
          return;
        }
        message = e.message;
      }
      Alert.alert('Status Change Failed', message);
    } finally {
      setChanging(false);
    }
  };

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: '#F8FAFC' }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={PRIMARY_EMERALD}
          colors={[PRIMARY_EMERALD]}
        />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_EMERALD} />

      {/* Auto-Offline Banner */}
      {autoOfflineBanner && (
        <View style={styles.autoOfflineBanner}>
          <Ionicons name="moon" size={16} color="#FFF" />
          <Text style={styles.autoOfflineBannerText}>
            You were automatically taken offline at midnight.
          </Text>
        </View>
      )}

      {/* Hero Header */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.hello}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name || 'Delivery Partner'}</Text>
          <Text style={styles.vehicleSub}>
            {user?.vehicle?.vehicleType ? `🛵 ${user.vehicle.vehicleType} • ${user.vehicle.vehicleNumber}` : 'Partner Account'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 }}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={18} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.statusBox}>
            <Text style={[styles.statusText, { color: online ? '#86EFAC' : '#CBD5E1' }]}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </Text>
            <Switch
              value={online}
              disabled={changing}
              onValueChange={changeAvailability}
              trackColor={{ false: '#64748B', true: '#10B981' }}
              thumbColor="#FFF"
            />
          </View>
        </View>
      </View>

      {/* Duty Toggle Card */}
      <TouchableOpacity
        disabled={changing}
        onPress={() => changeAvailability(!online)}
        activeOpacity={0.85}
        style={[
          styles.dutyBtn,
          {
            backgroundColor: online ? EMERALD_LIGHT : PRIMARY_EMERALD,
            borderColor: online ? '#A7F3D0' : PRIMARY_EMERALD,
          },
        ]}
      >
        <Ionicons
          name={online ? 'radio-button-on' : 'power'}
          size={24}
          color={online ? PRIMARY_EMERALD : '#FFF'}
        />
        <Text
          style={[
            styles.dutyBtnText,
            { color: online ? PRIMARY_EMERALD : '#FFF' },
          ]}
        >
          {online ? 'GO OFFLINE' : 'GO ONLINE'}
        </Text>
      </TouchableOpacity>

      {/* Live Location Card */}
      {online && (
        <View style={styles.locationCard}>
          <Ionicons name="location" size={22} color={PRIMARY_EMERALD} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>Live Location (Reverse Geocoded)</Text>
            <Text style={styles.locationSubtitle} numberOfLines={2}>
              {currentLocationName || 'Fetching exact location name...'}
            </Text>
          </View>
          <TouchableOpacity onPress={getAndUpdateLiveLocation} style={styles.refreshLocBtn}>
            <Ionicons name="refresh" size={16} color={PRIMARY_EMERALD} />
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={PRIMARY_EMERALD} style={{ marginVertical: 32 }} />
      ) : (
        <>
          {/* Active Delivery Status Card */}
          <TouchableOpacity
            onPress={() =>
              active && navigation.navigate('ActiveDelivery', { deliveryId: active.id })
            }
            activeOpacity={0.9}
            style={[
              styles.activeCard,
              {
                backgroundColor: active ? '#FFF7ED' : CARD_BG,
                borderColor: active ? '#FFEDD5' : BORDER_COLOR,
              },
            ]}
          >
            <View
              style={[
                styles.activeIconCircle,
                { backgroundColor: active ? '#FFEDD5' : EMERALD_LIGHT },
              ]}
            >
              <Ionicons
                name={active ? 'bicycle' : 'checkmark-circle'}
                size={26}
                color={active ? ACCENT_ORANGE : PRIMARY_EMERALD}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.activeTitle}>
                  {active ? 'Active Delivery Run' : 'Ready for Deliveries'}
                </Text>
                {active && (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>IN PROGRESS</Text>
                  </View>
                )}
              </View>

              <Text style={styles.activeSub}>
                {active
                  ? `Order #${active.orderId} • ${active.status.replaceAll('_', ' ')}`
                  : 'Stay online to receive automated customer delivery assignments.'}
              </Text>
            </View>

            {active && (
              <Ionicons name="chevron-forward" size={22} color={TEXT_MUTED} />
            )}
          </TouchableOpacity>

          {/* Quick Metrics Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Earnings & Balance</Text>
          </View>

          <View style={styles.grid}>
            <MetricCard
              icon="today-outline"
              label="Today"
              value={`₹${earnings?.todayEarnings ?? 0}`}
              color={PRIMARY_EMERALD}
            />
            <MetricCard
              icon="wallet-outline"
              label="Wallet"
              value={`₹${earnings?.walletBalance ?? 0}`}
              color="#3B82F6"
            />
            <MetricCard
              icon="trending-up-outline"
              label="All Time"
              value={`₹${earnings?.totalEarnings ?? 0}`}
              color="#8B5CF6"
            />
          </View>
        </>
      )}

      {/* ─── Incoming Delivery Request Popup Modal ────────────────── */}
      <Modal
        visible={Boolean(incomingRequest)}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header Badge */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBadge}>
                <Ionicons name="notifications" size={18} color="#EA580C" />
                <Text style={styles.modalHeaderBadgeText}>NEW DELIVERY REQUEST</Text>
              </View>
              <View style={styles.timerChip}>
                <Ionicons name="time" size={16} color="#DC2626" />
                <Text style={styles.timerText}>{requestSecondsLeft}s</Text>
              </View>
            </View>

            {/* Order Summary */}
            <Text style={styles.modalTitle}>Order #{incomingRequest?.orderId}</Text>

            {incomingRequest?.distanceKm != null && (
              <View style={styles.modalInfoRow}>
                <Ionicons name="navigate" size={18} color={PRIMARY_EMERALD} />
                <Text style={styles.modalInfoText}>
                  Distance: {(Math.round(incomingRequest.distanceKm * 10) / 10).toFixed(1)} km to pickup
                </Text>
              </View>
            )}

            {incomingRequest?.deliveryAddress ? (
              <View style={styles.modalInfoRow}>
                <Ionicons name="location" size={18} color="#3B82F6" />
                <Text style={styles.modalInfoText} numberOfLines={2}>
                  Drop: {incomingRequest.deliveryAddress}
                </Text>
              </View>
            ) : null}

            {incomingRequest?.totalAmount != null && (
              <View style={styles.modalInfoRow}>
                <Ionicons name="cash" size={18} color="#16A34A" />
                <Text style={styles.modalInfoText}>
                  Order Total: ₹{incomingRequest.totalAmount} ({incomingRequest.paymentMethod || 'COD'})
                </Text>
              </View>
            )}

            {incomingRequest?.deliveryFee != null && (
              <View style={styles.feeHighlightBox}>
                <Text style={styles.feeHighlightLabel}>ESTIMATED EARNING</Text>
                <Text style={styles.feeHighlightValue}>+₹{incomingRequest.deliveryFee}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={actionBusy}
                onPress={() => incomingRequest && handleRejectRequest(incomingRequest.requestId)}
                style={styles.declineBtn}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={actionBusy}
                onPress={() => incomingRequest && handleAcceptRequest(incomingRequest.requestId)}
                style={styles.acceptBtn}
              >
                {actionBusy ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.acceptBtnText}>ACCEPT RUN</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const MetricCard = ({ icon, label, value, color }: any) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIconCircle, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} color={color} size={20} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 32 },

  autoOfflineBanner: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  autoOfflineBannerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  hero: {
    paddingTop: 54,
    paddingBottom: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PRIMARY_EMERALD,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  hello: { color: '#A7F3D0', fontSize: 13, fontWeight: '600' },
  name: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
  vehicleSub: { color: '#D1FAE5', fontSize: 12, marginTop: 3, fontWeight: '500' },

  statusBox: { alignItems: 'center' },
  statusText: { fontWeight: '800', fontSize: 11, marginBottom: 4, letterSpacing: 0.5 },

  dutyBtn: {
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dutyBtnText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  activeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  activeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTitle: { fontSize: 15, fontWeight: '800', color: TEXT_DARK },
  activeSub: { color: TEXT_MUTED, fontSize: 12, marginTop: 2, lineHeight: 17 },
  liveBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: { color: ACCENT_ORANGE, fontSize: 9, fontWeight: '800' },

  sectionHeader: { marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },

  grid: { paddingHorizontal: 16, flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  metricLabel: { color: TEXT_MUTED, fontSize: 11, marginTop: 2, fontWeight: '600' },

  locationCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_DARK,
    marginTop: 2,
  },
  refreshLocBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  /* ─── Incoming Request Modal Styles ─────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalHeaderBadgeText: {
    color: '#C2410C',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  modalInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
    flex: 1,
  },
  feeHighlightBox: {
    backgroundColor: EMERALD_LIGHT,
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginVertical: 14,
  },
  feeHighlightLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  feeHighlightValue: {
    fontSize: 26,
    fontWeight: '900',
    color: PRIMARY_EMERALD,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: PRIMARY_EMERALD,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

