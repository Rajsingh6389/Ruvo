import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyOrders } from '../../services/orderService';
import { Order } from '../../types/order';
import { API_BASE_URL } from '../../config/api';

const activeStatuses = ['SHOP_PENDING', 'SHOP_ACCEPTED', 'DELIVERY_ASSIGNMENT', 'DELIVERY_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

const formatProductImageUrl = (url?: string) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

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
        .then((data) => {
          // Sort active orders to the top
          const sorted = data.sort((a, b) => {
            const aActive = activeStatuses.includes(a.orderStatus || '');
            const bActive = activeStatuses.includes(b.orderStatus || '');
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            // Then sort by date descending
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });
          setOrders(sorted);
        })
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

    const productImgUri = formatProductImageUrl(item.productImageUrl);

    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CustomerTracking', { orderId: item.id })}
      >
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

        <View style={styles.itemRow}>
          {productImgUri ? (
            <Image source={{ uri: productImgUri }} style={styles.productIconBox} />
          ) : (
            <View style={styles.productIconBox}>
              <Ionicons name="cart" size={20} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.productName, { color: colors.textPrimary }]}>
              {item.productName}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
              Qty: {item.quantity}  •  ₹{item.subtotal || item.totalAmount}
            </Text>
          </View>
        </View>

        <View style={styles.billingContainer}>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Item Total</Text>
            <Text style={styles.billingValue}>₹{item.subtotal || item.totalAmount}</Text>
          </View>
          {item.deliveryFee ? (
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Delivery Fee</Text>
              <Text style={styles.billingValue}>₹{item.deliveryFee}</Text>
            </View>
          ) : null}
          {item.platformFee ? (
             <View style={styles.billingRow}>
               <Text style={styles.billingLabel}>Platform Fee</Text>
               <Text style={styles.billingValue}>₹{item.platformFee}</Text>
             </View>
          ) : null}
          <View style={[styles.billingRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[styles.billingLabel, { fontWeight: '700', color: colors.textPrimary }]}>Grand Total</Text>
            <Text style={[styles.billingValue, { fontWeight: '700', color: colors.primary }]}>₹{item.totalAmount}</Text>
          </View>
        </View>

        <View style={[styles.orderFooter, { borderTopColor: colors.border }]}>
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Payment Method</Text>
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 12 }}>
              {item.paymentMethod === 'ONLINE' ? 'Online Payment' : 'Cash on Delivery'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.trackBtn, { backgroundColor: activeStatuses.includes(item.orderStatus || '') ? colors.primary : '#F3F4F6' }]}
            onPress={() => navigation.navigate('CustomerTracking', { orderId: item.id })}
          >
            <Text style={[styles.trackBtnText, { color: activeStatuses.includes(item.orderStatus || '') ? '#FFF' : '#4B5563' }]}>
              {activeStatuses.includes(item.orderStatus || '') ? 'Track Order' : 'Order Details'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    paddingVertical: 12,
  },
  productIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
  },
  billingContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  billingLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  billingValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  trackBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trackBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
