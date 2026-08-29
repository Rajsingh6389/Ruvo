/**
 * Onboarding Step 6 — Shop Selection
 * Fetches nearby shops (by GPS or fallback mock), lets the partner
 * multi-select the shops they want to serve, then submits the list.
 * Only delivery requests from those shops are broadcast to this partner.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity,
  ActivityIndicator, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import { API_BASE_URL } from '../../config/api';
import {
  StepBar, ScreenHeader, SectionCard,
  CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

interface NearbyShop {
  id: number;
  name: string;
  address: string;
  category: string;
  distanceKm?: number;
}

// Mock data shown when API / GPS is unavailable in demo
const MOCK_SHOPS: NearbyShop[] = [
  { id: 1, name: 'Fresh Mart',        address: 'MG Road, Block A',      category: 'Grocery',   distanceKm: 0.4 },
  { id: 2, name: 'Daily Needs Store', address: 'Lajpat Nagar, Sector 2',category: 'Grocery',   distanceKm: 0.8 },
  { id: 3, name: 'Quick Bites Cafe',  address: 'Gandhi Chowk',           category: 'Food',      distanceKm: 1.1 },
  { id: 4, name: 'Pharma Plus',       address: 'Hospital Road, Shop 5',  category: 'Pharmacy',  distanceKm: 1.3 },
  { id: 5, name: 'Style Hub',         address: 'Mall Road, 1st Floor',   category: 'Fashion',   distanceKm: 1.6 },
  { id: 6, name: 'Tech World',        address: 'IT Park, Gate 2',        category: 'Electronics',distanceKm: 2.0 },
  { id: 7, name: 'Green Veggies',     address: 'Sabzi Mandi, Stall 12',  category: 'Grocery',   distanceKm: 2.2 },
  { id: 8, name: 'Spice Garden',      address: 'Food Court, Level 2',    category: 'Food',      distanceKm: 2.5 },
];

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Grocery:     'basket-outline',
  Food:        'fast-food-outline',
  Pharmacy:    'medical-outline',
  Fashion:     'shirt-outline',
  Electronics: 'hardware-chip-outline',
};

export const Step6_ShopSelection = () => {
  const navigation = useNavigation<any>();
  const { token, setVerificationStatus } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [shops,      setShops]      = useState<NearbyShop[]>([]);
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [fetchState, setFetchState] = useState<'loading' | 'done' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock,  setUsingMock]  = useState(false);

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

    try {
      let lat: number | undefined;
      let lng: number | undefined;

      // Try GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      // Try API
      const params = lat != null ? `?lat=${lat}&lng=${lng}&radius=5` : '';
      const res = await fetch(`${API_BASE_URL}/api/partner/nearby-shops${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setShops(data?.data ?? []);
        setUsingMock(false);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      // Fall back to mock data so the onboarding flow is never blocked
      setShops(MOCK_SHOPS);
      setUsingMock(true);
    } finally {
      setFetchState('done');
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadShops(); }, [loadShops]);

  const toggle = (id: number) => {
    if (isLocked) {
      setError(`Shop selection is locked until ${nextAllowedDate}. Changes allowed once every 7 days.`);
      return;
    }
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setError(null);
  };

  const selectAll  = () => {
    if (isLocked) { setError(`Shop selection is locked until ${nextAllowedDate}.`); return; }
    setSelected(new Set(shops.map(s => s.id)));
  };
  const clearAll   = () => {
    if (isLocked) { setError(`Shop selection is locked until ${nextAllowedDate}.`); return; }
    setSelected(new Set());
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
        await setVerificationStatus('PENDING_APPROVAL');
        navigation.navigate('Step7_Success', { selectedShopCount: selected.size });
      } else {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Error ${res.status}`);
      }
    } catch (e: any) {
      // Non-blocking: still advance so demo always works
      await setVerificationStatus('PENDING_APPROVAL');
      navigation.navigate('Step7_Success', { selectedShopCount: selected.size });
    } finally {
      setSubmitting(false);
    }
  };

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
        activeOpacity={0.8}
      >
        {/* Icon */}
        <View style={[
          s.shopIcon,
          { backgroundColor: isSelected ? colors.primary : colors.surfaceSunken, borderRadius: RADIUS.sm },
        ]}>
          <Ionicons name={icon} size={22} color={isSelected ? '#FFFFFF' : colors.textHint} />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {item.address}
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

        {/* Checkbox */}
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
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={6} colors={colors} typography={typography} />

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
          subtitle="Choose nearby shops you want to deliver from. Only those shops' orders will be broadcast to you."
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

        {usingMock && !isLocked && (
          <InfoBox
            text="Showing sample shops (demo mode). Real nearby shops will appear once the API is live."
            variant="warning"
            colors={colors}
            typography={typography}
          />
        )}

        {/* Selection controls */}
        {fetchState === 'done' && shops.length > 0 && (
          <View style={[s.controlBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: RADIUS.md }]}>
            <View style={s.countBadge}>
              <Text style={[typography.headingS, { color: colors.primary }]}>{selected.size}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {' '}/ {shops.length} selected
              </Text>
            </View>
            <View style={s.controlBtns}>
              <TouchableOpacity
                style={[s.ctrlBtn, { borderColor: colors.border, borderRadius: RADIUS.sm }]}
                onPress={selectAll}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>All</Text>
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
        {fetchState === 'loading' ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 12 }]}>
              Finding nearby shops…
            </Text>
          </View>
        ) : shops.length === 0 ? (
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
            {shops.map(item => (
              <React.Fragment key={item.id}>{renderShop({ item })}</React.Fragment>
            ))}
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
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 3 },
  distTag:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3 },
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
