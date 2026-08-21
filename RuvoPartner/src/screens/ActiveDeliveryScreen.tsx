import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Delivery, partnerService } from '../services/partnerService';

const PRIMARY_EMERALD = '#059669';
const EMERALD_LIGHT = '#ECFDF5';
const ACCENT_ORANGE = '#F97316';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';

const states = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const ActiveDeliveryScreen = () => {
  const { token } = useAuth();
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const deliveryId = route.params?.deliveryId as number | undefined;
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');

  const load = useCallback(async () => {
    if (!token || !deliveryId) return;
    try {
      setDelivery(await partnerService.delivery(token, deliveryId));
    } catch (e: any) {
      Alert.alert('Delivery Unavailable', e.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [token, deliveryId]);

  useEffect(() => {
    load();
  }, [load]);

  const navigateTo = (address: string) =>
    Linking.openURL(
      Platform.OS === 'android'
        ? `geo:0,0?q=${encodeURIComponent(address)}`
        : `maps:0,0?q=${encodeURIComponent(address)}`
    ).catch(() =>
      Alert.alert(
        'Navigation Unavailable',
        'Could not open a maps app on this device.'
      )
    );

  const update = async (action: 'pickup' | 'out-for-delivery') => {
    if (!token || !deliveryId) return;
    setBusy(true);
    try {
      action === 'pickup'
        ? await partnerService.pickup(token, deliveryId)
        : await partnerService.startDelivery(token, deliveryId);
      await load();
    } catch (e: any) {
      Alert.alert('Update Not Confirmed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyDelivery = async () => {
    if (!token || !delivery || otp.length < 4)
      return Alert.alert(
        'Enter Customer OTP',
        'Enter the OTP provided by the customer.'
      );
    setBusy(true);
    try {
      await api(
        `/api/delivery/orders/${delivery.orderId}/verify-otp?otp=${encodeURIComponent(
          otp
        )}`,
        token,
        { method: 'PATCH' }
      );
      setOtpOpen(false);
      Alert.alert('Delivery Verified', 'The order was completed successfully.');
      navigation.popToTop();
    } catch (e: any) {
      Alert.alert('Delivery Not Completed', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY_EMERALD} />
      </View>
    );

  if (!delivery) return null;

  const index = states.indexOf(delivery.status);
  const action =
    delivery.status === 'ASSIGNED'
      ? ['ARRIVED AT SHOP & PICKED UP', () => update('pickup')]
      : delivery.status === 'PICKED_UP'
      ? ['START DELIVERY TO CUSTOMER', () => update('out-for-delivery')]
      : delivery.status === 'OUT_FOR_DELIVERY'
      ? ['COMPLETE DELIVERY (ENTER OTP)', () => setOtpOpen(true)]
      : null;

  return (
    <View style={[styles.page, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Active Delivery</Text>
          <Text style={styles.orderSub}>Order #{delivery.orderId}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            {delivery.status.replaceAll('_', ' ')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timeline Progress */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Delivery Status Timeline</Text>
          <View style={styles.steps}>
            {states.map((state, i) => (
              <View key={state} style={styles.step}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i <= index ? PRIMARY_EMERALD : BORDER_COLOR,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.stepText,
                    {
                      color: i <= index ? TEXT_DARK : TEXT_MUTED,
                      fontWeight: i === index ? '800' : '500',
                    },
                  ]}
                >
                  {state.replaceAll('_', ' ')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pickup & Drop Stops */}
        <StopCard
          icon="storefront"
          label="PICKUP LOCATION"
          address={delivery.pickupLocation}
          action="Navigate to Store"
          onPress={() => navigateTo(delivery.pickupLocation)}
          accentColor={PRIMARY_EMERALD}
        />

        <StopCard
          icon="location"
          label="DELIVERY LOCATION"
          address={delivery.deliveryLocation}
          action="Navigate to Customer"
          onPress={() => navigateTo(delivery.deliveryLocation)}
          accentColor={ACCENT_ORANGE}
        />

        {/* Earnings Summary Card */}
        <View style={styles.earningCard}>
          <View>
            <Text style={styles.earningLabel}>Guaranteed Delivery Fee</Text>
            <Text style={styles.earningSub}>Added to wallet upon completion</Text>
          </View>
          <Text style={styles.earningFee}>+₹{delivery.deliveryFee}</Text>
        </View>
      </ScrollView>

      {/* Action Footer */}
      {action && (
        <View style={styles.footer}>
          <TouchableOpacity
            disabled={busy}
            onPress={action[1] as any}
            style={[
              styles.primaryBtn,
              {
                backgroundColor:
                  delivery.status === 'OUT_FOR_DELIVERY'
                    ? PRIMARY_EMERALD
                    : ACCENT_ORANGE,
              },
            ]}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{action[0] as string}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* OTP Verification Modal */}
      <Modal visible={otpOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Customer Delivery</Text>
              <TouchableOpacity onPress={() => setOtpOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Ask the customer for their 4-digit or 6-digit delivery OTP to complete this order.
            </Text>

            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="0 0 0 0"
              placeholderTextColor="#94A3B8"
              style={styles.otpInput}
            />

            <TouchableOpacity
              disabled={busy}
              onPress={verifyDelivery}
              style={[styles.primaryBtn, { backgroundColor: PRIMARY_EMERALD }]}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>VERIFY & COMPLETE ORDER</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const StopCard = ({ icon, label, address, action, onPress, accentColor }: any) => (
  <View style={styles.stopCard}>
    <View style={[styles.stopIconCircle, { backgroundColor: accentColor + '15' }]}>
      <Ionicons name={icon} size={22} color={accentColor} />
    </View>
    <View style={styles.stopBody}>
      <Text style={[styles.stopLabel, { color: accentColor }]}>{label}</Text>
      <Text style={styles.stopAddress}>{address}</Text>
      <TouchableOpacity style={styles.navBtn} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name="navigate-outline" size={15} color={PRIMARY_EMERALD} />
        <Text style={styles.navBtnText}>{action}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  orderSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  statusBadge: { backgroundColor: EMERALD_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { color: PRIMARY_EMERALD, fontSize: 10, fontWeight: '800' },

  content: { padding: 16, gap: 14, paddingBottom: 32 },

  timelineCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 },
  steps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  stepText: { fontSize: 14 },

  stopCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  stopIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stopBody: { flex: 1, gap: 4 },
  stopLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  stopAddress: { fontSize: 15, fontWeight: '600', color: TEXT_DARK, lineHeight: 21 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  navBtnText: { color: PRIMARY_EMERALD, fontWeight: '700', fontSize: 13 },

  earningCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningLabel: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  earningSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  earningFee: { color: PRIMARY_EMERALD, fontSize: 22, fontWeight: '900' },

  footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: BORDER_COLOR },
  primaryBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  modalSub: { color: TEXT_MUTED, fontSize: 13, lineHeight: 18 },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: PRIMARY_EMERALD,
    borderRadius: 14,
    padding: 14,
    textAlign: 'center',
    fontSize: 26,
    letterSpacing: 10,
    fontWeight: '800',
    color: TEXT_DARK,
  },
});

