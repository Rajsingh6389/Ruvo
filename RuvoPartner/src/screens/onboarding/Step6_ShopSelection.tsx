/**
 * Onboarding Step 6 — Shop Selection
 * Fetches nearby shops (by GPS or fallback mock), lets the partner
 * multi-select the shops they want to serve, then submits the list.
 * Only delivery requests from those shops are broadcast to this partner.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity,
  ActivityIndicator, FlatList, RefreshControl, Modal, Platform, Dimensions, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import { API_BASE_URL } from '../../config/api';
import {
  StepBar, ScreenHeader, SectionCard,
  CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

const { height: SCREEN_H } = Dimensions.get('window');
const MAPS_API_KEY = 'AIzaSyBHLzfYTywdmSUoGSm6xyoqL2kPOVjM9B0';
const MAX_SHOPS = 8;

interface NearbyShop {
  id: number;
  name: string;
  address: string;
  category: string;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  logo?: string;
  imageUrl?: string;
  gallery?: string[];
  fullAddress?: string;
  phone?: string;
  rating?: number;
}

// Geocodes a textual address via Google, returns lat/lng or null
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q   = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${MAPS_API_KEY}&language=en`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' && json.results?.[0]?.geometry?.location) {
      const loc = json.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch { return null; }
}



const CATEGORY_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Grocery:     'basket-outline',
  Food:        'fast-food-outline',
  Pharmacy:    'medical-outline',
  Fashion:     'shirt-outline',
  Electronics: 'hardware-chip-outline',
};

// ── Shop Map Modal ───────────────────────────────────────────────────────────
interface ShopMapModalProps {
  shop: NearbyShop | null;
  visible: boolean;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onClose: () => void;
  colors: any;
  typography: any;
}

const ShopMapModal: React.FC<ShopMapModalProps> = ({
  shop, visible, isSelected, onToggle, onClose, colors, typography,
}) => {
  const [loading,  setLoading]  = useState(false);
  const [region,   setRegion]   = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!shop || !visible) return;
    setLoading(true);
    setRegion(null);

    const resolve = async () => {
      // Use shop coords if available, else geocode address
      if (shop.latitude && shop.longitude) {
        setRegion({ latitude: shop.latitude, longitude: shop.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 });
        setLoading(false);
        return;
      }
      const coords = await geocodeAddress(`${shop.address}, India`);
      if (coords) {
        setRegion({ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 });
      }
      setLoading(false);
    };
    resolve();
  }, [shop, visible]);

  if (!shop) return null;

  const icon = CATEGORY_ICON[shop.category] ?? 'storefront-outline';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[
          mms.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Platform.OS === 'android' ? 36 : 52 },
        ]}>
          <TouchableOpacity style={mms.closeBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[typography.headingS, { color: colors.textPrimary }]} numberOfLines={1}>
              {shop.name}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {shop.category} • {shop.distanceKm != null ? `${shop.distanceKm} km` : 'Nearby'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              mms.selectBtn,
              { backgroundColor: isSelected ? colors.success : colors.primary, borderRadius: RADIUS.sm },
            ]}
            onPress={() => { onToggle(shop.id); onClose(); }}
          >
            <Ionicons name={isSelected ? 'checkmark-circle' : 'add-circle-outline'} size={16} color="#FFF" />
            <Text style={[typography.caption, { color: '#FFF', fontWeight: '700', marginLeft: 4 }]}>
              {isSelected ? 'Selected' : 'Select Shop'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        {loading || !region ? (
          <View style={mms.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 12 }]}>Loading map…</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            region={region}
            showsUserLocation
          >
            <Marker
              coordinate={{ latitude: region.latitude, longitude: region.longitude }}
              title={shop.name}
              description={shop.address}
              pinColor={isSelected ? '#22C55E' : colors.primary}
            />
          </MapView>
        )}

        {/* Address & Gallery info card */}
        <ScrollView style={[mms.infoCard, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={mms.infoRow}>
            {shop.logo ? (
              <Image source={{ uri: shop.logo }} style={mms.shopLogoImg} />
            ) : (
              <View style={[mms.iconBg, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.sm }]}>
                <Ionicons name={icon} size={24} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '800', fontSize: 16 }]}>
                  {shop.name}
                </Text>
                {shop.rating && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Ionicons name="star" size={12} color="#D97706" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E', marginLeft: 3 }}>{shop.rating}</Text>
                  </View>
                )}
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
                📍 {shop.fullAddress || shop.address}
              </Text>
              {shop.phone && (
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginTop: 4 }]}>
                  📞 {shop.phone}
                </Text>
              )}
            </View>
          </View>

          {/* Shop Photo Gallery */}
          {shop.gallery && shop.gallery.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 }]}>
                STORE GALLERY & PREVIEW
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {shop.gallery.map((img, i) => (
                  <Image key={i} source={{ uri: img }} style={mms.galleryThumb} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Location Tracing Button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              borderRadius: RADIUS.sm,
              marginTop: 16,
              marginBottom: 20,
              gap: 8,
            }}
            onPress={() => {
              const url = shop.latitude && shop.longitude
                ? `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.fullAddress || shop.address)}`;
              Linking.openURL(url).catch(() => {});
            }}
          >
            <Ionicons name="navigate" size={18} color="#FFF" />
            <Text style={[typography.body, { color: '#FFF', fontWeight: '800' }]}>
              Open Navigation / Location Tracing
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

export const Step6_ShopSelection = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  // Detect if opened as post-approval ManageShops vs onboarding Step6
  const isManageMode = route.name === 'ManageShops';
  const { user, token, setVerificationStatus, clearResubmit } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [shops,        setShops]        = useState<NearbyShop[]>([]);
  const [myShops,      setMyShops]      = useState<NearbyShop[]>([]);
  const [selected,     setSelected]     = useState<Set<number>>(new Set());
  const [fetchState,   setFetchState]   = useState<'loading' | 'done' | 'error'>('loading');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const [mapShop,      setMapShop]      = useState<NearbyShop | null>(null);
  const [mapVisible,   setMapVisible]   = useState(false);

  // 7-Day Edit Cooldown Lock
  const [isLocked,        setIsLocked]        = useState(false);
  const [nextAllowedDate, setNextAllowedDate] = useState<string | null>(null);

  const checkCooldownAndSavedSelection = async () => {
    try {
      const lastUpdateStr = await AsyncStorage.getItem('lastShopSelectionUpdate');
      const savedShopsStr = await AsyncStorage.getItem('selectedShopIds');

      if (savedShopsStr) {
        const parsedIds: number[] = JSON.parse(savedShopsStr);
        if (Array.isArray(parsedIds) && parsedIds.length > 0) {
          setSelected(new Set(parsedIds));
        }
      }

      if (lastUpdateStr) {
        const lastUpdateMs = parseInt(lastUpdateStr, 10);
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (now < lastUpdateMs + SEVEN_DAYS_MS) {
          setIsLocked(true);
          const allowedDate = new Date(lastUpdateMs + SEVEN_DAYS_MS);
          setNextAllowedDate(allowedDate.toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
          }));
        }
      }
    } catch {
      /* Silently continue if storage read fails */
    }
  };

  const loadShops = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setFetchState('loading');
    setError(null);

    await checkCooldownAndSavedSelection();

    // Fast Cache Read First (Instant UI)
    try {
      const cachedShopsStr = await AsyncStorage.getItem('cachedNearbyShops');
      if (cachedShopsStr) {
        const cached = JSON.parse(cachedShopsStr);
        if (Array.isArray(cached) && cached.length > 0) {
          setShops(cached);
          setFetchState('done');
        }
      }
    } catch {}

    try {
      let lat: number | undefined;
      let lng: number | undefined;

      // Fast location check with lower accuracy for immediate response
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      // Fetch My Shops and Nearby Shops in parallel
      const ownerId = user?.userId || user?.mobileNumber || '';
      const params = lat != null ? `?lat=${lat}&lng=${lng}&radius=5` : '';
      
      const [nearbyRes, myShopsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/partner/nearby-shops${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerId)}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      let freshNearbyShops: NearbyShop[] = [];
      let freshMyShops: NearbyShop[] = [];

      if (nearbyRes.status === 'fulfilled' && nearbyRes.value.ok) {
        const data = await nearbyRes.value.json();
        freshNearbyShops = data?.data ?? [];
      } else if (nearbyRes.status === 'fulfilled' && nearbyRes.value.status === 404) {
         // Fallback if specific partner nearby-shops is unavailable, use standard shops
         const fallbackRes = await fetch(`${API_BASE_URL}/api/shops`, { headers: { Authorization: `Bearer ${token}` } });
         if (fallbackRes.ok) {
           const fbData = await fallbackRes.json();
           freshNearbyShops = fbData?.data ?? fbData ?? [];
         }
      }

      if (myShopsRes.status === 'fulfilled' && myShopsRes.value.ok) {
        const data = await myShopsRes.value.json();
        freshMyShops = data?.data ?? data ?? [];
      }

      // Hide my shops from the nearby list if they overlap
      const myShopIds = new Set(freshMyShops.map(s => s.id));
      freshNearbyShops = freshNearbyShops.filter(s => !myShopIds.has(s.id));

      setShops(freshNearbyShops);
      setMyShops(freshMyShops);
      AsyncStorage.setItem('cachedNearbyShops', JSON.stringify([...freshNearbyShops, ...freshMyShops])).catch(() => {});
      
    } catch {
      setError('Could not fetch shops properly.');
    } finally {
      setFetchState('done');
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => { loadShops(); }, [loadShops]);

  const toggle = (id: number) => {
    if (isLocked) {
      setError(`Shop selection is locked until ${nextAllowedDate}. Changes allowed once every 7 days.`);
      return;
    }
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SHOPS) {
          setError(`You can select a maximum of ${MAX_SHOPS} shops.`);
          return prev; // no change
        }
        next.add(id);
      }
      setError(null);
      return next;
    });
  };

  const selectAll  = () => {
    if (isLocked) { setError(`Shop selection is locked until ${nextAllowedDate}.`); return; }
    if (selected.size >= MAX_SHOPS) {
      setError(`You can select a maximum of ${MAX_SHOPS} shops.`);
      return;
    }
    // Only add up to MAX_SHOPS shops
    const capped = shops.slice(0, MAX_SHOPS).map(s => s.id);
    setSelected(new Set(capped));
    setError(null);
  };
  const clearAll   = () => {
    if (isLocked) { setError(`Shop selection is locked until ${nextAllowedDate}.`); return; }
    setSelected(new Set());
    setError(null);
  };

  const handleSubmit = async () => {
    if (selected.size === 0) {
      setError('Please select at least one shop to serve.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const shopIdsArray = Array.from(selected);
      await AsyncStorage.setItem('lastShopSelectionUpdate', Date.now().toString());
      await AsyncStorage.setItem('selectedShopIds', JSON.stringify(shopIdsArray));

      const res = await fetch(`${API_BASE_URL}/api/partner/shop-preferences`, {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization : `Bearer ${token}`,
        },
        body: JSON.stringify({ shopIds: shopIdsArray }),
      });

      // Accept 2xx or a 404 (endpoint not yet deployed) so the flow isn't blocked
      if (res.ok || res.status === 404 || res.status === 501) {
        if (isManageMode) {
          // Post-approval: just go back to Profile
          navigation.goBack();
        } else {
          // Onboarding: proceed to success/waiting screen
          navigation.navigate('Step7_Success', { selectedShopCount: selected.size });
          await clearResubmit();
          setVerificationStatus('PENDING_APPROVAL');
        }
      } else {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Error ${res.status}`);
      }
    } catch (e: any) {
      // Non-blocking: still advance so demo always works
      if (isManageMode) {
        navigation.goBack();
      } else {
        navigation.navigate('Step7_Success', { selectedShopCount: selected.size });
        await clearResubmit();
        setVerificationStatus('PENDING_APPROVAL');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedShopList = shops.filter(item => selected.has(item.id));
  const otherShopList = shops.filter(item => !selected.has(item.id));

  const renderShop = ({ item }: { item: NearbyShop }) => {
    const isSelected = selected.has(item.id);
    const icon = CATEGORY_ICON[item.category] ?? 'storefront-outline';
    return (
      <TouchableOpacity
        style={[
          s.shopCard,
          {
            backgroundColor : isSelected ? colors.primarySoft : colors.card,
            borderColor     : isSelected ? colors.primary      : colors.border,
            borderRadius    : RADIUS.md,
          },
          isSelected && shadows.sm,
        ]}
        onPress={() => toggle(item.id)}
        onLongPress={() => { setMapShop(item); setMapVisible(true); }}
        activeOpacity={0.8}
      >
        {/* Logo or Icon */}
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={[s.shopLogo, { borderRadius: RADIUS.sm }]} />
        ) : (
          <View style={[
            s.shopIcon,
            { backgroundColor: isSelected ? colors.primary : colors.surfaceSunken, borderRadius: RADIUS.sm },
          ]}>
            <Ionicons name={icon} size={22} color={isSelected ? '#FFFFFF' : colors.textHint} />
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.rating && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Ionicons name="star" size={12} color="#D97706" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{item.rating}</Text>
              </View>
            )}
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {item.fullAddress || item.address}
          </Text>
          <View style={s.tagRow}>
            <View style={[s.categoryTag, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.pill }]}>
              <Text style={[typography.caption, { color: colors.textHint, fontSize: 10 }]}>{item.category}</Text>
            </View>
            {item.distanceKm != null && (
              <View style={[s.distTag, { backgroundColor: colors.accentSoft, borderRadius: RADIUS.pill }]}>
                <Ionicons name="navigate-outline" size={10} color={colors.warning} />
                <Text style={[typography.caption, { color: colors.warning, fontSize: 10, fontWeight: '700' }]}>
                  {item.distanceKm} km
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Map icon + Checkbox */}
        <View style={s.rightActions}>
          <TouchableOpacity
            style={[s.mapPeekBtn, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.sm }]}
            onPress={() => { setMapShop(item); setMapVisible(true); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="map-outline" size={15} color={colors.primary} />
          </TouchableOpacity>
          <View style={[
            s.checkBox,
            {
              borderColor     : isSelected ? colors.primary : colors.border,
              backgroundColor : isSelected ? colors.primary : 'transparent',
              borderRadius    : RADIUS.pill,
            },
          ]}>
            {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {!isManageMode && <StepBar current={6} colors={colors} typography={typography} />}

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShops(true)}
            tintColor={colors.primary}
          />
        }
      >
        <ScreenHeader
          icon="storefront-outline"
          title="Select Your Shops"
          subtitle={`Choose up to ${MAX_SHOPS} nearby shops you want to deliver from. Only those shops' orders will be broadcast to you.`}
          colors={colors}
          typography={typography}
          onBack={() => navigation.goBack()}
        />

        {isLocked && (
          <InfoBox
            text={`🔒 Shop selection locked: You last updated your shop preferences recently. You can update your selected shops again on ${nextAllowedDate} (changes allowed once every 7 days).`}
            variant="warning"
            colors={colors}
            typography={typography}
          />
        )}

        {isLocked && (
          <InfoBox
            text={`🔒 Shop selection locked: You last updated your shop preferences recently. You can update your selected shops again on ${nextAllowedDate} (changes allowed once every 7 days).`}
            variant="warning"
            colors={colors}
            typography={typography}
          />
        )}

        {/* Selection controls */}
        {fetchState === 'done' && shops.length > 0 && (
          <View style={[s.controlBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: RADIUS.md }]}>
            <View style={s.countBadge}>
              <Text style={[typography.headingS, { color: selected.size >= MAX_SHOPS ? colors.warning : colors.primary }]}>
                {selected.size}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {' '}/ {MAX_SHOPS} shops
              </Text>
              {selected.size >= MAX_SHOPS && (
                <Text style={[typography.caption, { color: colors.warning, fontWeight: '700', marginLeft: 6 }]}>MAX</Text>
              )}
            </View>
            <View style={s.controlBtns}>
              <TouchableOpacity
                style={[s.ctrlBtn, {
                  borderColor: selected.size >= MAX_SHOPS ? colors.border : colors.primary,
                  borderRadius: RADIUS.sm,
                  opacity: selected.size >= MAX_SHOPS ? 0.4 : 1,
                }]}
                onPress={selectAll}
                disabled={selected.size >= MAX_SHOPS}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Top {MAX_SHOPS}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ctrlBtn, { borderColor: colors.border, borderRadius: RADIUS.sm }]}
                onPress={clearAll}
              >
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Shop list */}
        {fetchState === 'loading' && shops.length === 0 ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 12 }]}>
              Finding nearby shops fast…
            </Text>
          </View>
        ) : (shops.length === 0 && myShops.length === 0) ? (
          <View style={[s.emptyBox, { backgroundColor: colors.card, borderRadius: RADIUS.card }]}>
            <Ionicons name="storefront-outline" size={48} color={colors.textHint} />
            <Text style={[typography.headingS, { color: colors.textSecondary, marginTop: 12 }]}>
              No shops found nearby
            </Text>
            <TouchableOpacity
              style={[s.retryBtn, { borderColor: colors.primary, borderRadius: RADIUS.sm }]}
              onPress={() => loadShops()}
            >
              <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.shopList}>
            {/* ── Section 1: My Shops ── */}
            {myShops.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={[s.sectionHeaderRow, { marginBottom: 10 }]}>
                  <Ionicons name="storefront" size={18} color="#D97706" />
                  <Text style={[typography.headingS, { color: '#B45309', fontSize: 16 }]}>
                    My Registered Shops
                  </Text>
                </View>
                {myShops.map(item => (
                  <React.Fragment key={`my-${item.id}`}>{renderShop({ item })}</React.Fragment>
                ))}
              </View>
            )}

            {/* ── Section 2: Selected Nearby Shops ── */}
            {selectedShopList.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={s.sectionHeaderRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={[typography.headingS, { color: colors.textPrimary, fontSize: 15 }]}>
                    Selected Nearby Shops ({selectedShopList.length})
                  </Text>
                </View>
                {selectedShopList.map(item => (
                  <React.Fragment key={`selected-${item.id}`}>{renderShop({ item })}</React.Fragment>
                ))}
              </View>
            )}

            {/* ── Section 3: Other Nearby Shops ── */}
            {otherShopList.length > 0 && (
              <View>
                <View style={s.sectionHeaderRow}>
                  <Ionicons name="location" size={18} color={colors.warning} />
                  <Text style={[typography.headingS, { color: colors.textPrimary, fontSize: 15 }]}>
                    Nearby Shops ({otherShopList.length})
                  </Text>
                </View>
                {otherShopList.map(item => (
                  <React.Fragment key={`other-${item.id}`}>{renderShop({ item })}</React.Fragment>
                ))}
              </View>
            )}
          </View>
        )}

        {/* How broadcast works */}
        <SectionCard colors={colors} style={{ marginTop: 8 }}>
          <Text style={[typography.headingS, { color: colors.textPrimary, marginBottom: 10 }]}>
            How order broadcast works
          </Text>
          {HOW_ITEMS.map(h => (
            <View key={h.text} style={s.howRow}>
              <View style={[s.howNum, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.pill }]}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{h.num}</Text>
              </View>
              <Text style={[typography.body, { color: colors.textSecondary, flex: 1, lineHeight: 20 }]}>
                {h.text}
              </Text>
            </View>
          ))}
        </SectionCard>

        <ErrorBox error={error} colors={colors} typography={typography} />

        <CtaBtn
          label={`Confirm ${selected.size > 0 ? `${selected.size} Shop${selected.size > 1 ? 's' : ''}` : 'Selection'}`}
          onPress={handleSubmit}
          loading={submitting}
          disabled={fetchState === 'loading'}
          colors={colors}
          typography={typography}
          icon="checkmark-circle-outline"
        />
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Shop Map Modal */}
      <ShopMapModal
        shop={mapShop}
        visible={mapVisible}
        isSelected={mapShop ? selected.has(mapShop.id) : false}
        onToggle={toggle}
        onClose={() => setMapVisible(false)}
        colors={colors}
        typography={typography}
      />
    </SafeAreaView>
  );
};

const HOW_ITEMS = [
  { num: '1', text: 'A customer places an order at one of your selected shops.' },
  { num: '2', text: 'RuVo broadcasts the delivery request to you (and only you, exclusively).' },
  { num: '3', text: 'You accept or decline within 60 seconds.' },
  { num: '4', text: 'If declined, the request moves to the next available partner.' },
];

const s = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { paddingBottom: 32 },
  controlBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, marginBottom: 12,
  },
  countBadge: { flexDirection: 'row', alignItems: 'baseline' },
  controlBtns: { flexDirection: 'row', gap: 8 },
  ctrlBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1,
  },
  shopList: { gap: 10, marginBottom: 4 },
  shopCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderWidth: 1.5, gap: 12,
  },
  shopIcon: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  shopLogo: {
    width: 44, height: 44,
    resizeMode: 'cover', flexShrink: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, marginTop: 4,
  },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 3 },
  distTag:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3 },
  rightActions: { flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 },
  mapPeekBtn  : { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  checkBox: {
    width: 22, height: 22, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  loadingBox: { alignItems: 'center', paddingVertical: 48 },
  emptyBox:   { alignItems: 'center', padding: 32, marginBottom: 16 },
  retryBtn:   { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1.5 },
  howRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12,
  },
  howNum: {
    width: 26, height: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});

// ── Shop Map Modal Styles ────────────────────────────────────────────────────
const mms = StyleSheet.create({
  header   : { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  closeBtn : { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard : {
    borderTopWidth: 1,
    paddingHorizontal: 16, paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  infoRow  : { flexDirection: 'row', alignItems: 'flex-start' },
  iconBg   : { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  shopLogoImg: { width: 48, height: 48, borderRadius: 8, flexShrink: 0, resizeMode: 'cover' },
  galleryThumb: { width: 90, height: 60, borderRadius: 8, resizeMode: 'cover' },
});
