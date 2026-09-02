import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
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

  // Animation values for success state
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (paymentState === 'success') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [paymentState, scaleAnim, pulseAnim]);

  useEffect(() => {
    if (!pendingPayment || typeof orderId !== 'number') return;

    startTimeRef.current = Date.now();

    const pollStatus = async () => {
      if (Date.now() - startTimeRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
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
          setTimeout(() => {
            navigation.replace(ROUTES.PAYMENT_FAILURE, {
              orderId,
              reason: 'Payment was not completed.',
            });
          }, 1500);
        }
      } catch {
        // Network error
      }
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    pollTimerRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    pollStatus();

    return stopPolling;
  }, [pendingPayment, orderId, token, navigation]);

  useEffect(() => {
    if (pendingPayment) return;
    const timer = setTimeout(() => {
      navigation.navigate(ROUTES.MAIN_TABS);
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigation, pendingPayment]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.animatedCircle}>
            <Ionicons name="checkmark-circle" size={100} color="#10B981" />
          </View>
        </Animated.View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Order Placed Successfully! 🎉</Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>Order #{orderId}</Text>
        </View>
        <Text style={styles.totalText}>Total: ₹{total}</Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your order has been confirmed by RuVo! The shop is preparing your item.
        </Text>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate(ROUTES.MAIN_TABS)}
        >
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: '#ECFDF5', marginTop: 12, borderColor: '#10B981', borderWidth: 1.5 }]}
          onPress={() => navigation.navigate(ROUTES.CUSTOMER_TRACKING as never, { orderId } as never)}
        >
          <Text style={[styles.homeButtonText, { color: '#047857' }]}>Track Order Status</Text>
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
  animatedCircle: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeContainer: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '800',
  },
  totalText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10B981',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  homeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default OrderSuccessScreen;
