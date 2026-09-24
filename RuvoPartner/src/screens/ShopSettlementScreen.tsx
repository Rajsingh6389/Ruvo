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
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { partnerService } from '../services/partnerService';
import { formatImgUrl } from '../utils/imageUrl';
import { getLocalDateStr } from '../utils/date';

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
  const [datesList] = useState<Date[]>(() => {
    const dArr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dArr.push(d);
    }
    return dArr;
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getLocalDateStr(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLifetime, setIsLifetime] = useState(false);

  // Settlement OTP Modal
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [otpData, setOtpData] = useState<any>(null);
  const [timerSeconds, setTimerSeconds] = useState(300);

  // Success Confirmation Modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [completedSettlement, setCompletedSettlement] = useState<any>(null);

  const fetchSettlementSummary = async (dateOverride?: string, lifetime = isLifetime) => {
    try {
      const partnerId = user?.userId || 1;
      const targetDate = lifetime ? '' : (dateOverride || selectedDateStr);
      const data = await partnerService.settlementSummary(token!, targetDate, partnerId);
      if (data) {
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
    setLoading(true);
    fetchSettlementSummary(selectedDateStr);
  }, [selectedDateStr]);

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

  // Polling for Settlement Verification Status
  useEffect(() => {
    let pollInterval: any = null;
    if (otpModalVisible && otpData?.orderId) {
      pollInterval = setInterval(async () => {
        try {
          const partnerId = user?.userId || 1;
          const targetDate = isLifetime ? '' : selectedDateStr;
          const data = await partnerService.settlementSummary(token!, targetDate, partnerId);
          if (data && data.shops) {
            setSummaryData(data); // update silently in background
            const currentShop = data.shops.find((s: any) => s.shopId === selectedShop?.shopId);
            if (currentShop && currentShop.orders) {
              const currentOrder = currentShop.orders.find((o: any) => o.orderId === otpData.orderId);
              if (currentOrder && currentOrder.isSettled) {
                // Verified! Clear polling, set success, close modal
                clearInterval(pollInterval);
                setOtpModalVisible(false);
                setCompletedSettlement({ ...otpData, shopName: selectedShop?.shopName });
                setTimeout(() => {
                  setSuccessModalVisible(true);
                }, 400); // smooth delay before showing success
              }
            }
          }
        } catch (err) {
          // ignore poll errors
        }
      }, 4000); // poll every 4s
    }
    return () => clearInterval(pollInterval);
  }, [otpModalVisible, otpData]);

  const handleStartOrderSettlement = async (shop: any, order: any) => {
    setSelectedShop(shop);
    setLoading(true);
    try {
      const data = await partnerService.generateHandoverOtp(token!, order.orderId);
      if (data && (data.otp || data.handoverOtp)) {
        setOtpData({
          otp: data.otp || data.handoverOtp,
          codCollected: order.totalAmount,
          deliveryCharge: order.deliveryFee,
          netCashToShop: order.netCash,
          orderId: order.orderId
        });
        setTimerSeconds(300);
        setOtpModalVisible(true);
      } else {
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
            Shop-wise Day Settlements
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            fetchSettlementSummary(selectedDateStr);
          }}
        >
          <Ionicons name="refresh" size={20} color={EMERALD} />
        </TouchableOpacity>
      </View>

      {/* Date Selector Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}>
        <TouchableOpacity
          style={[styles.dateBtn, { flexDirection: 'row', alignItems: 'center' }, !isLifetime ? { backgroundColor: EMERALD, borderColor: EMERALD } : { backgroundColor: colors.card, borderColor: '#E2E8F0' }]}
          onPress={() => { setIsLifetime(false); setShowDatePicker(true); }}
        >
          <Ionicons name="calendar-outline" size={16} color={!isLifetime ? '#FFF' : colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={{ color: !isLifetime ? '#FFF' : colors.textPrimary, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
            {selectedDateStr}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateBtn, { flexDirection: 'row', alignItems: 'center' }, isLifetime ? { backgroundColor: EMERALD, borderColor: EMERALD } : { backgroundColor: colors.card, borderColor: '#E2E8F0' }]}
          onPress={() => { setIsLifetime(true); fetchSettlementSummary('', true); }}
        >
          <Ionicons name="infinite" size={16} color={isLifetime ? '#FFF' : colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={{ color: isLifetime ? '#FFF' : colors.textPrimary, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedDateStr || new Date())}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              const dateStr = getLocalDateStr(selectedDate);
              setSelectedDateStr(dateStr);
              setIsLifetime(false);
              fetchSettlementSummary(dateStr, false);
            }
          }}
        />
      )}

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSettlementSummary(selectedDateStr);
            }}
            tintColor={EMERALD}
          />
        }
      >
        {/* UPI Coming Soon Notice */}
        <View style={styles.upiBanner}>
          <Ionicons name="card-outline" size={18} color="#D97706" />
          <Text style={styles.upiBannerText}>
            💡 UPI Instant Payouts are <Text style={{ fontFamily: 'Poppins_800ExtraBold' }}>Coming Soon</Text>! Use Cash Handover OTP below.
          </Text>
        </View>

        {/* 4 Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>COD Collected</Text>
            <Text style={[styles.cardValue, { color: AMBER }]}>₹{codTotal}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Delivery Earnings</Text>
            <Text style={[styles.cardValue, { color: BLUE }]}>₹{delEarnings}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Net Cash to Shops</Text>
            <Text style={[styles.cardValue, { color: EMERALD }]}>₹{netCashToShops}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Pending Settlements</Text>
            <Text style={[styles.cardValue, { color: '#EF4444' }]}>{pendingCount}</Text>
          </View>
        </View>

        {/* Section Title */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shop-wise Details</Text>

        {/* Shop Cards Table */}
        {shops.map((s: any) => {
          const logoUri = formatImgUrl(s.shopLogoUrl);
          
          return (
          <View key={s.shopId} style={[styles.shopCard, { backgroundColor: colors.card }]}>
            <View style={styles.shopHeaderRow}>
              <View style={styles.shopTitleGroup}>
                <View style={styles.shopLogo}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={{ width: '100%', height: '100%', borderRadius: 19 }} resizeMode="cover" />
                  ) : (
                    <Ionicons name="storefront" size={20} color={EMERALD} />
                  )}
                </View>
                <View>
                  <Text style={[styles.shopName, { color: colors.textPrimary }]}>{s.shopName}</Text>
                  <Text style={[styles.orderSubtext, { color: colors.textSecondary }]}>
                    {s.ordersCount} Orders · {s.codCount || s.ordersCount} COD
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, s.netCashToShop <= 0 ? {backgroundColor: '#DEF7EC'} : {}]}>
                <Text style={[styles.statusBadgeText, s.netCashToShop <= 0 ? {color: '#046C4E'} : {}]}>
                  {s.netCashToShop <= 0 ? 'Settled' : 'Pending'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Financial Calculations Breakdown */}
            <View style={styles.calcRow}>
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>COD Collected</Text>
                <Text style={[styles.calcVal, { color: colors.textPrimary }]}>₹{s.codCollected}</Text>
              </View>

              <Text style={styles.minusSign}>-</Text>

              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>Delivery Charge</Text>
                <Text style={[styles.calcVal, { color: colors.textPrimary }]}>₹{s.deliveryCharge}</Text>
              </View>

              <Text style={styles.equalSign}>=</Text>

              <View style={styles.calcBoxHighlight}>
                <Text style={styles.calcLabelHighlight}>Net Cash to Shop</Text>
                <Text style={styles.calcValHighlight}>₹{s.netCashToShop}</Text>
              </View>
            </View>

            {/* Orders List for Shop */}
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', borderStyle: 'dashed' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: colors.textPrimary, marginBottom: 8 }}>Order Breakdown</Text>
              
              {(!s.orders || s.orders.length === 0) ? (
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'Poppins_600SemiBold' }}>Zero COD orders delivered to this shop on this day.</Text>
              ) : (
                s.orders.map((order: any) => (
                  <View key={order.orderId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View>
                      <Text style={{ fontSize: 14, fontFamily: 'Poppins_700Bold', color: colors.textPrimary }}>Order #{order.orderId}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Poppins_600SemiBold' }}>Net Cash: ₹{order.netCash}</Text>
                    </View>
                    
                    {!order.isSettled ? (
                      <TouchableOpacity
                        style={{ backgroundColor: '#FF7A00', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => handleStartOrderSettlement(s, order)}
                      >
                        <Ionicons name="key-outline" size={14} color="#FFF" />
                        <Text style={{ color: '#FFF', fontSize: 12, fontFamily: 'Poppins_700Bold' }}>Settle</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ backgroundColor: '#DEF7EC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 24 }}>
                        <Text style={{ color: '#046C4E', fontSize: 12, fontFamily: 'Poppins_700Bold' }}>Settled</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
          );
        })}
      </ScrollView>

      {/* OTP Display Modal */}
      <Modal visible={otpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Ionicons name="lock-closed-outline" size={44} color={EMERALD} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Order #{otpData?.orderId} Settlement</Text>
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
                OTP is valid for <Text style={{ fontFamily: 'Poppins_800ExtraBold', color: EMERALD }}>{formatTimer(timerSeconds)}</Text>
              </Text>
            </View>

            {/* Breakdown summary */}
            <View style={[styles.modalSummaryBox, { backgroundColor: colors.background }]}>
              <View style={styles.summaryLine}>
                <Text style={styles.sumLabel}>COD Collected:</Text>
                <Text style={[styles.sumVal, { color: colors.textPrimary }]}>₹{otpData?.codCollected || 0}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.sumLabel}>Delivery Charge:</Text>
                <Text style={[styles.sumVal, { color: colors.textPrimary }]}>₹{otpData?.deliveryCharge || 0}</Text>
              </View>
              <View style={[styles.summaryLine, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#CBD5E1' }]}>
                <Text style={{ fontFamily: 'Poppins_800ExtraBold', color: colors.textPrimary }}>Cash Given to Shopkeeper:</Text>
                <Text style={{ fontFamily: 'Poppins_800ExtraBold', color: EMERALD, fontSize: 16 }}>₹{otpData?.netCashToShop || 0}</Text>
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
  headerTitle: { fontSize: 22, fontFamily: 'Poppins_800ExtraBold' },
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
  cardLabel: { fontSize: 12, color: '#64748B', fontFamily: 'Poppins_600SemiBold' },
  cardValue: { fontSize: 20, fontFamily: 'Poppins_800ExtraBold', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_800ExtraBold', color: '#0F172A', marginBottom: 12 },
  otpTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  dateBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSubtitle: {
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
  shopName: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#0F172A' },
  orderSubtext: { fontSize: 12, color: '#64748B', marginTop: 1 },
  statusBadge: { backgroundColor: AMBER_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: AMBER, fontFamily: 'Poppins_700Bold', fontSize: 11 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calcBox: { alignItems: 'center', flex: 1 },
  calcLabel: { fontSize: 10, color: '#64748B', textTransform: 'uppercase' },
  calcVal: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold', color: '#1E293B', marginTop: 2 },
  minusSign: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#94A3B8' },
  equalSign: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#94A3B8' },
  calcBoxHighlight: { alignItems: 'center', flex: 1.2, backgroundColor: EMERALD_LIGHT, paddingVertical: 6, borderRadius: 8 },
  calcLabelHighlight: { fontSize: 10, color: EMERALD, fontFamily: 'Poppins_700Bold', textTransform: 'uppercase' },
  calcValHighlight: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: EMERALD, marginTop: 1 },
  settleBtn: {
    backgroundColor: EMERALD,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  settleBtnText: { color: '#FFFFFF', fontFamily: 'Poppins_800ExtraBold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins_800ExtraBold', color: '#0F172A', marginTop: 10 },
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
  digitText: { fontSize: 24, fontFamily: 'Poppins_800ExtraBold', color: EMERALD },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  timerText: { fontSize: 13, color: '#64748B' },
  modalSummaryBox: { width: '100%', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, marginBottom: 16 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sumLabel: { color: '#64748B', fontSize: 13 },
  sumVal: { fontFamily: 'Poppins_700Bold', color: '#0F172A', fontSize: 13 },
  cancelBtn: { paddingVertical: 12, width: '100%', alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontFamily: 'Poppins_700Bold', fontSize: 15 },
});
