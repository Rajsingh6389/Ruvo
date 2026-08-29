import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useTheme } from '../../context/ThemeContext';
import { PageTransition } from '../../components/PageTransition';
import { ROUTES } from '../../constants/routes';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'PaymentFailure'>;
type RouteProps = RouteProp<RootStackParamList, 'PaymentFailure'>;

export const PaymentFailureScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();

  const orderId = route.params?.orderId;
  const reason = route.params?.reason || 'Transaction declined by bank or user cancelled payment.';

  return (
    <PageTransition style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="close-circle" size={72} color="#DC2626" />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Payment Failed</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We couldn't process your payment. Don't worry, your money is safe and no amount was debited.
        </Text>

        {orderId && (
          <View style={[styles.orderTag, { backgroundColor: colors.surface }]}>
            <Text style={[styles.orderTagText, { color: colors.textSecondary }]}>
              Order ID: <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>#{orderId}</Text>
            </Text>
          </View>
        )}

        <View style={styles.reasonBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
          <Text style={styles.reasonText}>{reason}</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate(ROUTES.CHECKOUT, { fromCart: true })}
        >
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Retry Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={() => navigation.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.HOME })}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </PageTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconCircle: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  orderTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  orderTagText: {
    fontSize: 13,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    width: '100%',
  },
  reasonText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
