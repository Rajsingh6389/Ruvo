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
            style={[styles.homeButton, { backgroundColor: '#FFF3E0', borderColor: '#F57C00', borderWidth: 0.5 }]}
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
            <Ionicons name="location" size={20} color="#171A1F" />
            <Text style={styles.trackButtonText}>Track Order Status</Text>
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
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#18A957',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#18A957',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  badgeContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E7E0D5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: '#171A1F',
    fontSize: 13,
    fontWeight: '800',
  },
  totalText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#171A1F',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  trackButton: {
    backgroundColor: '#F4B400',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#F4B400',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  trackButtonText: {
    color: '#171A1F',
    fontSize: 16,
    fontWeight: '900',
  },
  homeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E7E0D5',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#171A1F',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default OrderSuccessScreen;
