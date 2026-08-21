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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Delivery } from '../services/partnerService';

const PRIMARY_EMERALD = '#059669';
const EMERALD_LIGHT = '#ECFDF5';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';

export const AvailableDeliveriesScreen = () => {
  const { token } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [runs, setRuns] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setRuns(await api<Delivery[]>('/api/partner/deliveries/available', token));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const accept = async (run: Delivery) => {
    if (!token) return;
    setBusy(run.id);
    try {
      await api(`/api/partner/deliveries/${run.id}/accept`, token, {
        method: 'POST',
      });
      navigation.navigate('ActiveDelivery', { deliveryId: run.id });
    } catch (e: any) {
      Alert.alert('Run Unavailable', e.message);
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Available Deliveries</Text>
          <Text style={styles.subtitle}>
            Real-time server assignments matching your location.
          </Text>
        </View>
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: EMERALD_LIGHT, borderRadius: 20 }}
          onPress={load}
        >
          <Ionicons name="refresh" size={20} color={PRIMARY_EMERALD} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY_EMERALD} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={x => String(x.id)}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={PRIMARY_EMERALD}
            />
          }
          contentContainerStyle={runs.length ? styles.list : styles.empty}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="bicycle" size={42} color={PRIMARY_EMERALD} />
              </View>
              <Text style={styles.emptyTitle}>No Active Deliveries Right Now</Text>
              <Text style={styles.emptySub}>
                Stay online and keep this tab active to receive automated server orders.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.orderNumber}>Order #{item.orderId}</Text>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{item.status.replaceAll('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.payoutText}>+₹{item.deliveryFee}</Text>
              </View>

              <View style={styles.locationSection}>
                <View style={styles.locRow}>
                  <Ionicons name="storefront-outline" size={18} color={PRIMARY_EMERALD} />
                  <Text style={styles.locLabel}>Pickup:</Text>
                  <Text style={styles.locVal} numberOfLines={1}>
                    {item.pickupLocation}
                  </Text>
                </View>

                <View style={styles.locRow}>
                  <Ionicons name="location-outline" size={18} color="#F97316" />
                  <Text style={styles.locLabel}>Drop:</Text>
                  <Text style={styles.locVal} numberOfLines={1}>
                    {item.deliveryLocation}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                disabled={busy === item.id}
                onPress={() => accept(item)}
                style={styles.acceptBtn}
                activeOpacity={0.85}
              >
                {busy === item.id ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.acceptBtnText}>ACCEPT DELIVERY RUN</Text>
                  </>
                )}
              </TouchableOpacity>
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  errorText: { textAlign: 'center', color: TEXT_DARK, fontSize: 14 },
  retryBtn: { backgroundColor: EMERALD_LIGHT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: PRIMARY_EMERALD, fontWeight: '700' },

  list: { padding: 16, gap: 12 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 35 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center' },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: EMERALD_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, textAlign: 'center' },
  emptySub: { textAlign: 'center', lineHeight: 20, marginTop: 6, color: TEXT_MUTED, fontSize: 13 },

  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderNumber: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  badgePill: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED },
  payoutText: { color: PRIMARY_EMERALD, fontSize: 18, fontWeight: '800' },

  locationSection: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, gap: 8, marginBottom: 14 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locLabel: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED, width: 50 },
  locVal: { flex: 1, fontSize: 13, fontWeight: '600', color: TEXT_DARK },

  acceptBtn: {
    backgroundColor: PRIMARY_EMERALD,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
});

