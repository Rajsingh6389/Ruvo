import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Delivery, Earnings, partnerService } from '../services/partnerService';

export const EarningsScreen = () => {
  const { token } = useAuth();
  const { colors, typography, radius, shadows, spacing } = useTheme();

  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [e, h] = await Promise.all([
        partnerService.earnings(token),
        partnerService.history(token),
      ]);
      setEarnings(e);
      setHistory(h.sort((a, b) => b.id - a.id));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.headingL, { color: colors.textPrimary }]}>Earnings & Payouts</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
            Track daily income, wallet, and delivery payouts
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.primarySoft, borderRadius: radius.pill }]}
          onPress={() => load(true)}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── HERO BANNER ────────────────────────────────────────── */}
      <View style={[styles.heroBanner, { backgroundColor: colors.primary, borderRadius: radius.card }, shadows.raised]}>
        {/* Decorative inner circle */}
        <View style={styles.heroBg} />

        <Text style={[typography.label, { color: colors.primarySoft, letterSpacing: 1, fontSize: 11 }]}>
          TODAY'S TOTAL EARNINGS
        </Text>
        <Text style={[typography.headingXL, { color: colors.onPrimary, fontSize: 38, fontWeight: '900', marginVertical: 4 }]}>
          ₹{earnings?.todayEarnings ?? 0}
        </Text>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroMeta}>
            <Ionicons name="wallet-outline" size={14} color={colors.primarySoft} />
            <Text style={[typography.caption, { color: colors.primarySoft, marginLeft: 5 }]}>
              Wallet Balance
            </Text>
            <Text style={[typography.bodyStrong, { color: colors.onPrimary, marginLeft: 6 }]}>
              ₹{earnings?.walletBalance ?? 0}
            </Text>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: colors.onPrimary + '30' }]} />
          <View style={styles.heroMeta}>
            <Ionicons name="trending-up-outline" size={14} color={colors.primarySoft} />
            <Text style={[typography.caption, { color: colors.primarySoft, marginLeft: 5 }]}>
              All Time
            </Text>
            <Text style={[typography.bodyStrong, { color: colors.onPrimary, marginLeft: 6 }]}>
              ₹{earnings?.totalEarnings ?? 0}
            </Text>
          </View>
        </View>
      </View>

      {/* ── SECTION HEADER ─────────────────────────────────────── */}
      <View style={[styles.sectionHeader, { paddingHorizontal: spacing.gutter }]}>
        <Text style={[typography.headingS, { color: colors.textPrimary }]}>Delivery History</Text>
        <View style={[styles.countPill, { backgroundColor: colors.primarySoft, borderRadius: radius.pill }]}>
          <Text style={[typography.caption, { color: colors.primaryLight, fontWeight: '700' }]}>
            {history.length} runs
          </Text>
        </View>
      </View>

      {/* ── LIST ───────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={x => String(x.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: spacing.gutter },
            history.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft, borderRadius: 48 }]}>
                <Ionicons name="receipt-outline" size={44} color={colors.textHint} />
              </View>
              <Text style={[typography.headingS, { color: colors.textPrimary, marginTop: 20 }]}>
                No completed runs yet
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 }]}>
                Completed delivery earnings will appear here once you start accepting runs.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.sm]}>
              {/* Left accent */}
              <View style={[styles.cardAccent, { backgroundColor: colors.success }]} />

              <View style={styles.cardRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.successSoft, borderRadius: radius.pill }]}>
                  <Ionicons name="checkmark-done" size={20} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
                    Order #{item.orderId}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    Completed · Run #{item.id}
                  </Text>
                </View>
                <Text style={[typography.headingS, { color: colors.success }]}>
                  +₹{item.deliveryFee}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  refreshBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  heroBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -40,
  },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  heroMeta: { flexDirection: 'row', alignItems: 'center' },
  heroDivider: { width: 1, height: 16 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  countPill: { paddingHorizontal: 10, paddingVertical: 4 },

  listContent: { paddingBottom: 40, gap: 10 },
  emptyList: { flexGrow: 1 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },

  historyCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: { height: 3, width: '100%' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
