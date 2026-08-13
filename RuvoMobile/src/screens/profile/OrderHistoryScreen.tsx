import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyOrders } from '../../services/orderService';
import { Order } from '../../types/order';

export default function OrderHistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { userId, token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId && token) {
      getMyOrders(userId, token)
        .then(setOrders)
        .catch(err => setError(err.message || 'Failed to load order history'))
        .finally(() => setLoading(false));
    } else {
      setError('User not authenticated properly.');
      setLoading(false);
    }
  }, [userId, token]);

  const renderOrderItem = ({ item }: { item: Order }) => {
    const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : 'N/A';

    return (
      <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.orderHeader}>
          <Text style={[styles.orderId, { color: colors.textPrimary }]}>Order #{item.id}</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: (item.orderStatus || '').toUpperCase() === 'CONFIRMED' ? '#E8F5E9' : '#FFF3E0'
          }]}>
            <Text style={[styles.statusText, {
              color: (item.orderStatus || '').toUpperCase() === 'CONFIRMED' ? '#2E7D32' : '#E65100'
            }]}>
              {item.orderStatus}
            </Text>
          </View>
        </View>

        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>

        <View style={[styles.itemRow, { borderBottomColor: colors.border }]}>
          <Ionicons name="cube-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.productName, { color: colors.textPrimary }]}>
            {item.productName} ({item.quantity}x)
          </Text>
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Payment Method</Text>
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 12 }}>
              {item.paymentMethod === 'ONLINE' ? 'Online Payment' : 'Cash on Delivery'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Total Amount</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>₹{item.totalAmount}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Order History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#D32F2F" />
          <Text style={{ color: colors.textPrimary, marginTop: 12, fontSize: 16 }}>{error}</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={54} color="#AEB5AF" />
          <Text style={{ color: colors.textPrimary, marginTop: 12, fontSize: 16, fontWeight: '700' }}>No Orders Yet</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>You have not placed any orders yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
