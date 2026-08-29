import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';
import { getOrder } from '../../services/orderService';
import { useTheme } from '../../context/ThemeContext';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000; // 2 minutes

type PaymentState = 'pending' | 'success' | 'failed';

const OrderSuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();
  const { colors } = useTheme();

  const orderId = route.params?.orderId || 'RUVO_NEW';
  const total = route.params?.total || 0;
  const pendingPayment = route.params?.pendingPayment === true;

  const [paymentState, setPaymentState] = useState<PaymentState>(
    pendingPayment ? 'pending' : 'success'
  );
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!pendingPayment || typeof orderId !== 'number') return;

    startTimeRef.current = Date.now();

    const pollStatus = async () => {
      // Timeout after 2 minutes
      if (Date.now() - startTimeRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        // User can check status in Order History
        return;
      }

      try {
        if (!token) return;
        const order = await getOrder(orderId, token);
        const ps = order?.paymentStatus?.toUpperCase();

        if (ps === 'SUCCESS') {
          setPaymentState('success');
          stopPolling();
        } else if (ps === 'FAILED' || order?.orderStatus === 'PAYMENT_FAILED') {
          setPaymentState('failed');
          stopPolling();
          // Redirect to payment failure after a brief moment
          setTimeout(() => {
            navigation.replace(ROUTES.PAYMENT_FAILURE, {
              orderId,
              reason: 'Payment was not completed.',
            });
          }, 1500);
        }
      } catch {
        // Network error — keep polling
      }
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    // Start polling
    pollTimerRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    // Also check immediately
    pollStatus();

    return stopPolling;
  }, [pendingPayment, orderId, token, navigation]);

  // Auto-navigate to home after 4 seconds (only for non-pending COD orders)
  useEffect(() => {
    if (pendingPayment) return;
    const timer = setTimeout(() => {
      navigation.navigate(ROUTES.MAIN_TABS);
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigation, pendingPayment]);

  // ─── PENDING STATE ──────────────────────────────────────────
  if (paymentState === 'pending') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color="#F57C00" />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Waiting for Payment...</Text>
          <Text style={[styles.orderNumber, { color: colors.textSecondary }]}>Order #{orderId}</Text>
          <Text style={styles.totalText}>₹{total}</Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Please complete the payment in your browser.{'\n'}
            We'll confirm automatically once received.
          </Text>

          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: '#FFF3E0', borderColor: '#F57C00', borderWidth: 1 }]}
            onPress={() => navigation.navigate(ROUTES.ORDER_HISTORY)}
          >
            <Text style={[styles.homeButtonText, { color: '#E65100' }]}>
              Check in Order History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: '#F5F5F5', marginTop: 12 }]}
            onPress={() => navigation.navigate(ROUTES.MAIN_TABS)}
          >
            <Text style={[styles.homeButtonText, { color: '#666' }]}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── SUCCESS STATE ──────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#2E7D32" />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Order Successful!</Text>
        <Text style={[styles.orderNumber, { color: colors.textSecondary }]}>Order #{orderId}</Text>
        <Text style={styles.totalText}>Total: ₹{total}</Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your order has been placed successfully. The shop will confirm your order shortly.
        </Text>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate(ROUTES.MAIN_TABS)}
        >
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: '#F0F9FF', marginTop: 12, borderColor: '#3B82F6', borderWidth: 1 }]}
          onPress={() => navigation.navigate(ROUTES.CUSTOMER_TRACKING as never, { orderId } as never)}
        >
          <Text style={[styles.homeButtonText, { color: '#1D4ED8' }]}>Track Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  totalText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  homeButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  }
});

export default OrderSuccessScreen;
