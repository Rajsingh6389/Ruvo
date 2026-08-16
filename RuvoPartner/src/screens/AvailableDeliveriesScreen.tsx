import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryRequest = {
  requestId: number;
  orderId: number;
  distanceKm: number;
  expiresAt: string;   // ISO-8601
  status: string;
  deliveryAddress?: string;
  totalAmount?: number;
  paymentMethod?: string;
  deliveryFee?: number;
};

const TOTAL_SECONDS = 60;

// ─── Per-card countdown component ────────────────────────────────────────────

function CountdownBar({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const anim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      const progress = remaining / TOTAL_SECONDS;
      Animated.timing(anim, {
        toValue: progress,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expiresAt]);

  const color =
    secondsLeft > 30 ? '#16A34A' : secondsLeft > 10 ? '#F59E0B' : '#DC2626';

  return (
    <View style={cStyles.countdownRow}>
      <View style={cStyles.barTrack}>
        <Animated.View
          style={[
            cStyles.barFill,
            {
              backgroundColor: color,
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[cStyles.countdownText, { color }]}>
        {secondsLeft}s
      </Text>
    </View>
  );
}

const cStyles = StyleSheet.create({
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  countdownText: { fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const AvailableDeliveriesScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { token } = useAuth();

  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch pending requests sent to this partner ───────────────────────────

  const fetchRequests = useCallback(async (showLoader = false) => {
    if (!token) return;
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data: DeliveryRequest[] = await res.json();
      setRequests(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests(true);
      pollRef.current = setInterval(() => fetchRequests(false), 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fetchRequests])
  );

  // ── Accept ────────────────────────────────────────────────────────────────

  const handleAccept = async (req: DeliveryRequest) => {
    setProcessing(req.requestId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/delivery/requests/${req.requestId}/accept`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to accept');
      }
      Alert.alert('Accepted! 🎉', 'The delivery has been assigned to you.');
      navigation.navigate('ActiveDelivery', { orderId: req.orderId });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not accept. Try again.');
      fetchRequests(false);
    } finally {
      setProcessing(null);
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────────

  const handleReject = async (req: DeliveryRequest) => {
    setProcessing(req.requestId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/delivery/requests/${req.requestId}/reject`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to reject');
    } catch {
      // silent — just refresh
    } finally {
      setProcessing(null);
      fetchRequests(false);
    }
  };

  // ── Card ──────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: DeliveryRequest }) => {
    const isCOD = item.paymentMethod?.toUpperCase().includes('COD');
    const busy = processing === item.requestId;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.orderTag}>
            <Ionicons name="receipt-outline" size={13} color="#EA580C" />
            <Text style={styles.orderTagText}>Order #{item.orderId}</Text>
          </View>
          <View style={styles.feeTag}>
            <Text style={styles.feeText}>+₹{item.deliveryFee ?? '—'}</Text>
          </View>
        </View>

        {/* Delivery address */}
        {item.deliveryAddress ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={[styles.addressText, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.deliveryAddress}
            </Text>
          </View>
        ) : null}

        {/* Distance + payment */}
        <View style={[styles.row, { marginTop: 6, gap: 12 }]}>
          <View style={styles.metaChip}>
            <Ionicons name="navigate-outline" size={13} color="#6B7280" />
            <Text style={styles.metaText}>
              {item.distanceKm != null
                ? `${(Math.round(item.distanceKm * 10) / 10).toFixed(1)} km`
                : '—'}
            </Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: isCOD ? '#FEF3C7' : '#DCFCE7' }]}>
            <Ionicons
              name={isCOD ? 'cash-outline' : 'card-outline'}
              size={13}
              color={isCOD ? '#B45309' : '#15803D'}
            />
            <Text style={[styles.metaText, { color: isCOD ? '#B45309' : '#15803D', fontWeight: '700' }]}>
              {isCOD ? `COD ₹${item.totalAmount ?? ''}` : 'Paid Online'}
            </Text>
          </View>
        </View>

        {/* Countdown */}
        <CountdownBar expiresAt={item.expiresAt} />

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            disabled={busy}
            style={[styles.btn, styles.rejectBtn, { borderColor: colors.border }]}
            onPress={() => handleReject(item)}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Text style={[styles.rejectText, { color: colors.textSecondary }]}>Skip</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={busy}
            style={[styles.btn, styles.acceptBtn]}
            onPress={() => handleAccept(item)}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.acceptText}>Accept Run</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Incoming Requests
        </Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          Each partner gets 1 minute to respond
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Checking for requests…
          </Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bicycle-outline" size={60} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No requests right now
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Stay online — requests update every 5 seconds.
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => fetchRequests(true)}
          >
            <Ionicons name="refresh" size={16} color="#EA580C" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.requestId.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={false}
          onRefresh={() => fetchRequests(true)}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 6 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EA580C',
  },
  refreshText: { color: '#EA580C', fontWeight: '600', fontSize: 14 },

  list: { padding: 16 },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  orderTagText: { color: '#EA580C', fontWeight: '700', fontSize: 13 },
  feeTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  feeText: { color: '#16A34A', fontWeight: '800', fontSize: 14 },

  row: { flexDirection: 'row', alignItems: 'center' },
  addressText: { fontSize: 13, flex: 1, lineHeight: 18 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  rejectBtn: { backgroundColor: '#F9FAFB', borderWidth: 1 },
  rejectText: { fontWeight: '600', fontSize: 14 },
  acceptBtn: { backgroundColor: '#EA580C' },
  acceptText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
