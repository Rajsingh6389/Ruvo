import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

const EMERALD = '#059669';
const EMERALD_LIGHT = '#ECFDF5';
const AMBER = '#D97706';
const AMBER_LIGHT = '#FEF3C7';
const BLUE = '#2563EB';

export const ShopSettlementScreen = () => {
  const { colors } = useTheme();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Settlement OTP Modal
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [otpData, setOtpData] = useState<any>(null);
  const [timerSeconds, setTimerSeconds] = useState(300);

  // Success Confirmation Modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [completedSettlement, setCompletedSettlement] = useState<any>(null);

  const fetchSettlementSummary = async () => {
    try {
      const partnerId = user?.userId || 1;
      const res = await fetch(`${API_BASE_URL}/api/settlements/partner?partnerId=${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch {
      // Failed to fetch partner settlements
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettlementSummary();
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: any = null;
    if (otpModalVisible && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpModalVisible, timerSeconds]);

  const handleStartSettlement = async (shop: any) => {
    setSelectedShop(shop);
    setLoading(true);
    try {
      const partnerId = user?.userId || 1;
      const res = await fetch(
        `${API_BASE_URL}/api/settlements/generate-otp?partnerId=${partnerId}&shopId=${shop.shopId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok && data.otp) {
        setOtpData(data);
        setTimerSeconds(300);
        setOtpModalVisible(true);
      } else {
        // OTP not returned - show error instead of using fake random OTP
        Alert.alert(
          'Settlement Error',
          data.message || 'Unable to generate settlement OTP. Please try again or contact support.'
        );
      }
    } catch (e) {
      Alert.alert(
        'Network Error',
        'Failed to initiate settlement. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={EMERALD} />
      </View>
    );
  }

  const codTotal = summaryData?.codCollected || 0;
  const delEarnings = summaryData?.deliveryEarnings || 0;
  const netCashToShops = summaryData?.netCashToShops || 0;
  const pendingCount = summaryData?.pendingSettlements || 0;
  const shops = summaryData?.shops || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settlement</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Shop-wise COD & Delivery Earnings
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            fetchSettlementSummary();
          }}
        >
          <Ionicons name="refresh" size={20} color={EMERALD} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSettlementSummary();
            }}
            tintColor={EMERALD}
          />
        }
      >
        {/* UPI Coming Soon Notice */}
        <View style={styles.upiBanner}>
          <Ionicons name="card-outline" size={18} color="#D97706" />
          <Text style={styles.upiBannerText}>
            💡 UPI Instant Payouts are <Text style={{ fontWeight: '800' }}>Coming Soon</Text>! Use Cash Handover OTP below.
          </Text>
        </View>

        {/* 4 Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>COD Collected</Text>
            <Text style={[styles.cardValue, { color: AMBER }]}>₹{codTotal}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Delivery Earnings</Text>
            <Text style={[styles.cardValue, { color: BLUE }]}>₹{delEarnings}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Net Cash to Shops</Text>
            <Text style={[styles.cardValue, { color: EMERALD }]}>₹{netCashToShops}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Pending Settlements</Text>
            <Text style={[styles.cardValue, { color: '#EF4444' }]}>{pendingCount}</Text>
          </View>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Shop-wise Details</Text>

        {/* Shop Cards Table */}
        {shops.map((s: any) => (
          <View key={s.shopId} style={styles.shopCard}>
            <View style={styles.shopHeaderRow}>
              <View style={styles.shopTitleGroup}>
                <View style={styles.shopLogo}>
                  <Ionicons name="storefront" size={20} color={EMERALD} />
                </View>
                <View>
                  <Text style={styles.shopName}>{s.shopName}</Text>
                  <Text style={styles.orderSubtext}>
                    {s.ordersCount} Orders · {s.codCount || s.ordersCount} COD
                  </Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Pending</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Financial Calculations Breakdown */}
            <View style={styles.calcRow}>
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>COD Collected</Text>
                <Text style={styles.calcVal}>₹{s.codCollected}</Text>
              </View>

              <Text style={styles.minusSign}>-</Text>

              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>Delivery Charge</Text>
                <Text style={styles.calcVal}>₹{s.deliveryCharge}</Text>
              </View>

              <Text style={styles.equalSign}>=</Text>

              <View style={styles.calcBoxHighlight}>
                <Text style={styles.calcLabelHighlight}>Net Cash to Shop</Text>
                <Text style={styles.calcValHighlight}>₹{s.netCashToShop}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.settleBtn}
              onPress={() => handleStartSettlement(s)}
            >
              <Ionicons name="key-outline" size={16} color="#FFF" />
              <Text style={styles.settleBtnText}>Settle ₹{s.netCashToShop}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* OTP Display Modal */}
      <Modal visible={otpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="lock-closed-outline" size={44} color={EMERALD} />
            <Text style={styles.modalTitle}>Collect OTP from Shopkeeper</Text>
            <Text style={styles.modalSub}>
              Ask {selectedShop?.shopName} to enter this OTP in their app.
            </Text>

            {/* OTP Display Box */}
            <View style={styles.otpBoxContainer}>
              {String(otpData?.otp || '------')
                .split('')
                .map((digit: string, idx: number) => (
                  <View key={idx} style={styles.digitBox}>
                    <Text style={styles.digitText}>{digit}</Text>
                  </View>
                ))}
            </View>

            {/* Timer */}
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <Text style={styles.timerText}>
                OTP is valid for <Text style={{ fontWeight: '800', color: EMERALD }}>{formatTimer(timerSeconds)}</Text>
              </Text>
            </View>

            {/* Breakdown summary */}
            <View style={styles.modalSummaryBox}>
              <View style={styles.summaryLine}>
                <Text style={styles.sumLabel}>COD Collected:</Text>
                <Text style={styles.sumVal}>₹{otpData?.codCollected || 0}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.sumLabel}>Delivery Charge:</Text>
                <Text style={styles.sumVal}>₹{otpData?.deliveryCharge || 0}</Text>
              </View>
              <View style={[styles.summaryLine, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#CBD5E1' }]}>
                <Text style={{ fontWeight: '800', color: '#0F172A' }}>Cash Given to Shopkeeper:</Text>
                <Text style={{ fontWeight: '900', color: EMERALD, fontSize: 16 }}>₹{otpData?.netCashToShop || 0}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setOtpModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  refreshBtn: { padding: 8, backgroundColor: EMERALD_LIGHT, borderRadius: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  upiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AMBER_LIGHT,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  upiBannerText: { color: '#B45309', fontSize: 12, flex: 1 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  cardValue: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  shopHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shopTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shopLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: EMERALD_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  orderSubtext: { fontSize: 12, color: '#64748B', marginTop: 1 },
  statusBadge: { backgroundColor: AMBER_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: AMBER, fontWeight: '700', fontSize: 11 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calcBox: { alignItems: 'center', flex: 1 },
  calcLabel: { fontSize: 10, color: '#64748B', textTransform: 'uppercase' },
  calcVal: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  minusSign: { fontSize: 16, fontWeight: '800', color: '#94A3B8' },
  equalSign: { fontSize: 16, fontWeight: '800', color: '#94A3B8' },
  calcBoxHighlight: { alignItems: 'center', flex: 1.2, backgroundColor: EMERALD_LIGHT, paddingVertical: 6, borderRadius: 8 },
  calcLabelHighlight: { fontSize: 10, color: EMERALD, fontWeight: '700', textTransform: 'uppercase' },
  calcValHighlight: { fontSize: 16, fontWeight: '900', color: EMERALD, marginTop: 1 },
  settleBtn: {
    backgroundColor: EMERALD,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  settleBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 10 },
  modalSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 },
  otpBoxContainer: { flexDirection: 'row', gap: 8, marginVertical: 20 },
  digitBox: {
    width: 44,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: EMERALD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: { fontSize: 24, fontWeight: '900', color: EMERALD },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  timerText: { fontSize: 13, color: '#64748B' },
  modalSummaryBox: { width: '100%', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, marginBottom: 16 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sumLabel: { color: '#64748B', fontSize: 13 },
  sumVal: { fontWeight: '700', color: '#0F172A', fontSize: 13 },
  cancelBtn: { paddingVertical: 12, width: '100%', alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '700', fontSize: 15 },
});
