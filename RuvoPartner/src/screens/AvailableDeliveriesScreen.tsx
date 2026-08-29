import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Delivery } from '../services/partnerService';
import { OfflineBar } from '../components/OfflineBar';
import { OrderSkeleton } from '../components/OrderSkeleton';
import { NotificationPopup } from '../components/NotificationPopup';
import { useNewDeliverySound } from '../hooks/useNotificationSound';

export const AvailableDeliveriesScreen = () => {
  const { token } = useAuth();
  const { colors, typography, radius, shadows, spacing } = useTheme();
  const navigation = useNavigation<any>();

  const [runs, setRuns] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { showPopup, popupMessage, dismissPopup } = useNewDeliverySound(runs.length);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      setError(null);
      setRuns(await api<Delivery[]>('/api/partner/deliveries/available', token));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const accept = async (run: Delivery) => {
    if (!token) return;
    setBusy(run.id);
    try {
      await api(`/api/partner/deliveries/${run.id}/accept`, token, { method: 'POST' });
      navigation.navigate('ActiveDelivery', { deliveryId: run.id });
    } catch (e: any) {
      Alert.alert('Run Unavailable', e.message);
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <OfflineBar />

      {/* New delivery notification popup */}
      <NotificationPopup
        visible={showPopup}
        message={popupMessage}
        subtitle="Tap to view available deliveries"
        onDismiss={dismissPopup}
      />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.headingL, { color: colors.textPrimary }]}>
            Available Deliveries
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
            Real-time runs matching your location
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.primarySoft, borderRadius: radius.pill }]}
          onPress={() => load(true)}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── CONTENT ────────────────────────────────────────────── */}
      {loading ? (
        <View style={{ padding: spacing.gutter }}>
          <OrderSkeleton count={3} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.errorSoft, borderRadius: 48 }]}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.error} />
          </View>
          <Text style={[typography.headingS, { color: colors.textPrimary, marginTop: 20 }]}>
            Connection Error
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 6 }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: radius.button }, shadows.brand]}
            onPress={() => load()}
          >
            <Text style={[typography.button, { color: colors.onPrimary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={x => String(x.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: spacing.gutter },
            runs.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft, borderRadius: 48 }]}>
                <Ionicons name="bicycle" size={44} color={colors.primary} />
              </View>
              <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 20, textAlign: 'center' }]}>
                No Active Deliveries
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }]}>
                Stay online and keep this tab active to receive automated server orders.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.md]}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[typography.headingS, { color: colors.textPrimary }]}>
                    Order #{item.orderId}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: colors.surfaceSunken, borderRadius: radius.xs }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', fontSize: 10 }]}>
                      {item.status.replaceAll('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={[typography.headingS, { color: colors.success, fontWeight: '900' }]}>
                  +₹{item.deliveryFee}
                </Text>
              </View>

              {/* Location section */}
              <View style={[styles.locationSection, { backgroundColor: colors.surfaceSunken, borderRadius: radius.md }]}>
                <View style={styles.locRow}>
                  <View style={[styles.locDot, { backgroundColor: colors.primary }]} />
                  <Text style={[typography.caption, { color: colors.textHint, width: 46, fontWeight: '700' }]}>
                    Pickup
                  </Text>
                  <Text style={[typography.bodyStrong, { flex: 1, color: colors.textPrimary, fontSize: 13 }]} numberOfLines={1}>
                    {item.pickupLocation}
                  </Text>
                </View>

                {/* Connector line */}
                <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />

                <View style={styles.locRow}>
                  <View style={[styles.locDot, { backgroundColor: '#F97316' }]} />
                  <Text style={[typography.caption, { color: colors.textHint, width: 46, fontWeight: '700' }]}>
                    Drop
                  </Text>
                  <Text style={[typography.bodyStrong, { flex: 1, color: colors.textPrimary, fontSize: 13 }]} numberOfLines={1}>
                    {item.deliveryLocation}
                  </Text>
                </View>
              </View>

              {/* Accept button */}
              <TouchableOpacity
                disabled={busy === item.id}
                onPress={() => accept(item)}
                style={[
                  styles.acceptBtn,
                  { backgroundColor: colors.primary, borderRadius: radius.button },
                  shadows.brand,
                  busy === item.id && { opacity: 0.7 },
                ]}
                activeOpacity={0.88}
              >
                {busy === item.id ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.onPrimary} />
                    <Text style={[typography.button, { color: colors.onPrimary, letterSpacing: 0.3 }]}>
                      Accept Delivery Run
                    </Text>
                  </>
                )}
              </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  refreshBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, marginTop: 20 },

  listContent: { paddingTop: 16, paddingBottom: 40, gap: 12 },
  emptyList: { flexGrow: 1 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },

  card: { borderWidth: 1, padding: 16 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3 },

  locationSection: { padding: 12, marginBottom: 14, gap: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  locDot: { width: 8, height: 8, borderRadius: 4 },
  connectorLine: { width: 1, height: 10, marginLeft: 3 },

  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
});
