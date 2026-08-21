import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type AssignmentStatus = 'PENDING' | 'NONE' | 'ASSIGNED';

interface CurrentRequest {
  requestId: number | null;
  partnerId: number | null;
  partnerName: string | null;
  partnerPhone: string | null;
  distanceKm: number | null;
  locationName?: string | null;
  expiresAt: string | null;
  status: AssignmentStatus;
}

// ─── Countdown ring dimensions ───────────────────────────────────────────────
const RING_SIZE = 120;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TOTAL_SECONDS = 60;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DeliveryPartnerAssignmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();
  const { colors } = useTheme();

  const orderId: number = route.params?.orderId;

  const [request, setRequest] = useState<CurrentRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(TOTAL_SECONDS);
  const [loading, setLoading] = useState(true);

  // Animated stroke dashoffset for the countdown ring
  const strokeAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtRef = useRef<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const startCountdown = (expiresAt: string) => {
    stopCountdown();
    expiresAtRef.current = expiresAt;

    const tick = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.ceil((expiry - now) / 1000));
      setSecondsLeft(remaining);

      // Animate ring: goes from 0 (full) to CIRCUMFERENCE (empty) as time runs down
      const progress = 1 - remaining / TOTAL_SECONDS;
      Animated.timing(strokeAnim, {
        toValue: progress * CIRCUMFERENCE,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    };

    tick();
    countdownRef.current = setInterval(tick, 1000);
  };

  // ── Fetch current request ─────────────────────────────────────────────────

  const fetchCurrentRequest = useCallback(async () => {
    if (!token || !orderId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/delivery/orders/${orderId}/current-request`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data: CurrentRequest = await res.json();
      console.log('====================================');
      console.log('📍 [Shopkeeper] Current Delivery Partner Request:', JSON.stringify(data, null, 2));
      console.log('====================================');
      setRequest(data);
      setLoading(false);

      if (data.status === 'ASSIGNED') {
        // Partner accepted → go back
        stopCountdown();
        navigation.goBack();
        return;
      }

      if (data.status === 'PENDING' && data.expiresAt) {
        // Start/refresh countdown only when expiresAt changes (new partner)
        if (data.expiresAt !== expiresAtRef.current) {
          startCountdown(data.expiresAt);
        }
      } else {
        // NONE — backend is finding the next partner
        stopCountdown();
        setSecondsLeft(TOTAL_SECONDS);
        strokeAnim.setValue(0);
        expiresAtRef.current = null;
      }
    } catch {
      // silent fail — poll will retry
    }
  }, [token, orderId]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCurrentRequest();

    pollRef.current = setInterval(fetchCurrentRequest, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      stopCountdown();
    };
  }, [fetchCurrentRequest]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const ringColor =
    secondsLeft > 30 ? '#16A34A' : secondsLeft > 10 ? '#F59E0B' : '#DC2626';

  const strokeDashoffset = strokeAnim.interpolate({
    inputRange: [0, CIRCUMFERENCE],
    outputRange: [0, CIRCUMFERENCE],
  });

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Searching for delivery partners…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Delivery Assignment
        </Text>
        <View style={styles.back} />
      </View>

      <View style={styles.body}>
        {/* Order tag */}
        <View style={styles.orderTag}>
          <Ionicons name="receipt-outline" size={14} color="#EA580C" />
          <Text style={styles.orderTagText}>Order #{orderId}</Text>
        </View>

        {request?.status === 'PENDING' ? (
          /* ── Active partner offer ────────────────────────────────── */
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Checking with partner
            </Text>

            {/* Countdown ring */}
            <View style={styles.ringContainer}>
              {/* Track circle */}
              <View
                style={[
                  styles.ringTrack,
                  {
                    width: RING_SIZE,
                    height: RING_SIZE,
                    borderRadius: RING_SIZE / 2,
                    borderColor: '#E5E7EB',
                    borderWidth: STROKE_WIDTH,
                  },
                ]}
              />
              {/* Animated arc — simulated with border trick since SVG needs react-native-svg */}
              <View style={[styles.ringCenter, { width: RING_SIZE, height: RING_SIZE }]}>
                <Text style={[styles.countdownNumber, { color: ringColor }]}>
                  {secondsLeft}
                </Text>
                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>
                  sec
                </Text>
              </View>
            </View>

            {/* Countdown progress bar (linear, more cross-platform) */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: ringColor,
                    width: strokeAnim.interpolate({
                      inputRange: [0, CIRCUMFERENCE],
                      outputRange: ['100%', '0%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Partner card */}
            <View style={[styles.partnerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={28} color="#EA580C" />
              </View>

              <View style={styles.partnerInfo}>
                <Text style={[styles.partnerName, { color: colors.textPrimary }]}>
                  {request.partnerName ?? 'Delivery Partner'}
                </Text>
                {request.partnerPhone ? (
                  <Text style={[styles.partnerPhone, { color: colors.textSecondary }]}>
                    📞 {request.partnerPhone}
                  </Text>
                ) : null}
                {request.distanceKm != null || request.locationName ? (
                  <Text style={[styles.partnerDistance, { color: '#EA580C' }]}>
                    📍 {request.locationName ? `${request.locationName} ` : ''}
                    {request.distanceKm != null ? `(${(Math.round(request.distanceKm * 10) / 10).toFixed(1)} km away)` : ''}
                  </Text>
                ) : null}
              </View>

              <View style={styles.waitChip}>
                <ActivityIndicator size="small" color="#EA580C" />
                <Text style={styles.waitText}>Waiting</Text>
              </View>
            </View>

            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              If the partner doesn't respond within 1 minute, the next nearest partner will be automatically notified.
            </Text>
          </>
        ) : (
          /* ── Searching for next partner ──────────────────────────── */
          <>
            <View style={styles.searchingBox}>
              <ActivityIndicator size="large" color="#EA580C" style={{ marginBottom: 16 }} />
              <Text style={[styles.searchingTitle, { color: colors.textPrimary }]}>
                Searching for the next partner…
              </Text>
              <Text style={[styles.searchingSubtitle, { color: colors.textSecondary }]}>
                The previous partner didn't respond. Looking for someone nearby.
              </Text>
            </View>

            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              This happens automatically. You can leave this screen — the order will update in real time.
            </Text>
          </>
        )}

        {/* Manual refresh */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => { setLoading(true); fetchCurrentRequest(); }}
        >
          <Ionicons name="refresh" size={18} color="#EA580C" />
          <Text style={styles.refreshText}>Refresh status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  back: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
  },

  orderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  orderTagText: { color: '#EA580C', fontWeight: '700', fontSize: 13 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Countdown ring (visual only — border-based)
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ringTrack: {  position: 'absolute' },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -4,
  },

  // Linear progress bar
  progressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Partner card
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    gap: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInfo: { flex: 1, gap: 3 },
  partnerName: { fontSize: 16, fontWeight: '700' },
  partnerPhone: { fontSize: 13 },
  partnerDistance: { fontSize: 13, fontWeight: '600' },

  waitChip: {
    alignItems: 'center',
    gap: 4,
  },
  waitText: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '600',
  },

  hintText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
    marginBottom: 24,
  },

  // Searching state
  searchingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#FFF7F0',
    borderRadius: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  searchingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  searchingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EA580C',
  },
  refreshText: {
    color: '#EA580C',
    fontWeight: '600',
    fontSize: 14,
  },
});
