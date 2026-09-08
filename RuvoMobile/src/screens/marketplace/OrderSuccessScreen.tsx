import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn, FadeInUp } from 'react-native-reanimated';
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View entering={FadeInDown} style={styles.content}>
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
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Animated.View
          entering={ZoomIn.duration(800).springify().damping(12)}
          style={styles.iconContainer}
        >
          <View style={styles.animatedCircle}>
            <Ionicons name="checkmark" size={64} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(300).duration(600).springify()} style={[styles.title, { color: colors.textPrimary }]}>
          Order Placed! 🎉
        </Animated.Text>
        
        <Animated.View entering={FadeInUp.delay(400).duration(600).springify()} style={styles.badgeContainer}>
          <Text style={styles.badgeText}>Order #{orderId}</Text>
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(500).duration(600).springify()} style={styles.totalText}>
          Total: ₹{total}
        </Animated.Text>

        <Animated.Text entering={FadeInUp.delay(600).duration(600).springify()} style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your order has been confirmed by RuVo! The shop is preparing your items with care.
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(700).duration(600).springify()} style={{ width: '100%', gap: 12 }}>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => navigation.navigate(ROUTES.CUSTOMER_TRACKING as never, { orderId } as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="location" size={20} color="#1A1A1A" />
            <Text style={[styles.trackButtonText, { color: '#1A1A1A' }]}>Track Order Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate(ROUTES.MAIN_TABS)}
            activeOpacity={0.8}
          >
            <Text style={styles.homeButtonText}>Go Back Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: 12,
  },
  badgeText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '800',
  },
  totalText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#059669',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  trackButton: {
    backgroundColor: '#F5B700',
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#F5B700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  homeButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OrderSuccessScreen;
