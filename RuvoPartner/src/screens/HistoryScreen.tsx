import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

const EMERALD = '#059669';
const EMERALD_LIGHT = '#ECFDF5';
const AMBER = '#D97706';
const AMBER_LIGHT = '#FEF3C7';

type HistoryItem = {
  id: number;
  orderId: number;
  status: string;
  pickupLocation: string;
  deliveryLocation: string;
  deliveryFee: number;
  deliveredAt?: string;
  paymentMethod?: string;
  totalAmount?: number;
  codCollected?: number;
  shopId?: number;
  shopName?: string;
};

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export const HistoryScreen = () => {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Handover OTP modal state
  const [handoverModal, setHandoverModal] = useState(false);
  const [handoverOrderId, setHandoverOrderId] = useState<number | null>(null);
  const [handoverOtp, setHandoverOtp] = useState('');
  const [handoverLoading, setHandoverLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load history.');
      const data: HistoryItem[] = await res.json();
      setHistory(data);
    } catch (err) {
      console.log('Error loading history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (token) fetchHistory();
    }, [token])
  );

  const generateHandoverOtp = async (orderId: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/partner/settlements/${orderId}/generate-handover-otp`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate OTP');
      Alert.alert(
        '💰 Cash Handover OTP',
        `Your OTP is: ${data.handoverOtp}\n\nShow this to the shopkeeper to confirm COD cash handover.`,
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const sections = React.useMemo(() => {
    const today = history.filter(h => isToday(h.deliveredAt));
    const prev = history.filter(h => !isToday(h.deliveredAt));
    const result: { title: string; data: HistoryItem[] }[] = [];
    if (today.length > 0) result.push({ title: "Today's Deliveries", data: today });
    if (prev.length > 0) result.push({ title: 'Previous Deliveries', data: prev });
    return result;
  }, [history]);

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const isCod = item.paymentMethod === 'COD';
    const date = item.deliveredAt
      ? new Date(item.deliveredAt).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      : '—';

    return (
      <View style={styles.card}>
        {/* Row 1: Run info + fee */}
        <View style={styles.row}>
          <View>
            <Text style={styles.runId}>Run #{item.id} · Order #{item.orderId}</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
          <Text style={styles.fee}>+₹{item.deliveryFee}</Text>
        </View>

        {/* Route */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.location} numberOfLines={1}>
            <Ionicons name="storefront-outline" size={12} color="#64748B" />{' '}
            {item.shopName ?? item.pickupLocation?.split(',')[0]}
          </Text>
          <Text style={[styles.location, { marginTop: 3 }]} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color="#EF4444" />{' '}
            {item.deliveryLocation}
          </Text>
        </View>

        {/* COD badge + handover button */}
        {isCod && (
          <View style={styles.codRow}>
            <View style={styles.codBadge}>
              <Ionicons name="cash-outline" size={14} color={AMBER} />
              <Text style={styles.codText}>
                COD Collected: ₹{item.codCollected ?? item.totalAmount ?? 0}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.handoverBtn}
              onPress={() => generateHandoverOtp(item.orderId)}
            >
              <Ionicons name="key-outline" size={14} color={EMERALD} />
              <Text style={styles.handoverBtnText}>Handover OTP</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const totalToday = history
    .filter(h => isToday(h.deliveredAt))
    .reduce((s, d) => s + (d.deliveryFee ?? 0), 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={EMERALD} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Delivery History</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Completed runs · Today: <Text style={{ color: EMERALD, fontWeight: '700' }}>+₹{totalToday.toFixed(0)}</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => { setRefreshing(true); fetchHistory(); }}
        >
          <Ionicons name="refresh" size={20} color={EMERALD} />
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No completed runs yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Completed delivery runs will show up here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHistory(); }}
              tintColor={EMERALD}
              colors={[EMERALD]}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 8, backgroundColor: EMERALD_LIGHT, borderRadius: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  list: { padding: 16, paddingBottom: 32 },
  sectionHeader: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, marginBottom: 8, marginTop: 4,
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  runId: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  date: { fontSize: 11, color: '#64748B', marginTop: 2 },
  fee: { fontSize: 17, fontWeight: '800', color: EMERALD },
  location: { fontSize: 12, color: '#64748B' },
  codRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  codBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: AMBER_LIGHT, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  codText: { fontSize: 12, fontWeight: '600', color: AMBER },
  handoverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: EMERALD_LIGHT, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  handoverBtnText: { fontSize: 12, fontWeight: '600', color: EMERALD },
});
