import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Delivery, Earnings, partnerService } from '../services/partnerService';

const PRIMARY_EMERALD = '#059669';
const EMERALD_LIGHT = '#ECFDF5';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';

export const EarningsScreen = () => {
  const { token } = useAuth();
  const { colors } = useTheme();

  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [e, h] = await Promise.all([
        partnerService.earnings(token),
        partnerService.history(token),
      ]);
      setEarnings(e);
      setHistory(h.sort((a, b) => b.id - a.id));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.page, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Earnings & Payouts</Text>
          <Text style={styles.subtitle}>Track daily income, wallet, and delivery payouts.</Text>
        </View>
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: EMERALD_LIGHT, borderRadius: 20 }}
          onPress={load}
        >
          <Ionicons name="refresh" size={20} color={PRIMARY_EMERALD} />
        </TouchableOpacity>
      </View>

      {/* Today Earnings Banner */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroLabel}>TODAY'S TOTAL EARNINGS</Text>
        <Text style={styles.heroAmount}>₹{earnings?.todayEarnings ?? 0}</Text>
        <View style={styles.heroRow}>
          <Ionicons name="wallet-outline" size={16} color="#D1FAE5" />
          <Text style={styles.heroWalletText}>
            Wallet Balance • ₹{earnings?.walletBalance ?? 0}
          </Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Completed Delivery History</Text>
        <Text style={styles.historyCount}>{history.length} Runs</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY_EMERALD} style={{ marginVertical: 32 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={x => String(x.id)}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={PRIMARY_EMERALD} />
          }
          contentContainerStyle={history.length ? styles.list : styles.empty}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={42} color={BORDER_COLOR} />
              <Text style={styles.emptyText}>Completed delivery earnings will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark-done" size={20} color={PRIMARY_EMERALD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderIdText}>Order #{item.orderId}</Text>
                <Text style={styles.dateText}>Completed • Run #{item.id}</Text>
              </View>
              <Text style={styles.payoutAmount}>+₹{item.deliveryFee}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 52 },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  title: { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  subtitle: { marginTop: 4, color: TEXT_MUTED, fontSize: 13 },

  heroBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    backgroundColor: PRIMARY_EMERALD,
    shadowColor: PRIMARY_EMERALD,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroLabel: { color: '#A7F3D0', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroAmount: { color: '#FFF', fontSize: 36, fontWeight: '900', marginVertical: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroWalletText: { color: '#E0F2FE', fontSize: 13, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT_DARK },
  historyCount: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyBox: { alignItems: 'center', gap: 10 },
  emptyText: { color: TEXT_MUTED, textAlign: 'center', fontSize: 13 },

  historyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: EMERALD_LIGHT, alignItems: 'center', justifyContent: 'center' },
  orderIdText: { color: TEXT_DARK, fontWeight: '800', fontSize: 15 },
  dateText: { color: TEXT_MUTED, fontSize: 12, marginTop: 2 },
  payoutAmount: { color: PRIMARY_EMERALD, fontSize: 17, fontWeight: '900' },
});

