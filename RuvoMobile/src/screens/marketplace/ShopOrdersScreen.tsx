import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

type Order = {
  id: number;
  userId: string;
  shopId: number;
  productId: number;
  productName: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  deliveryAddress: string;
  createdAt: string;
};

type DeliveryInfo = {
  hasDelivery: boolean;
  status?: string;
  partnerName?: string;
  partnerMobile?: string;
};

export const ShopOrdersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { token } = useAuth();
  
  const shopId = route.params?.shopId;
  const shopName = route.params?.shopName || 'Shop Orders';

  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Record<number, DeliveryInfo>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrdersAndDeliveries = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/shop/${shopId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data: Order[] = await res.json();
      
      // Sort orders by id descending (newest first)
      const sorted = data.sort((a, b) => b.id - a.id);
      setOrders(sorted);

      // Fetch delivery details for each order in parallel
      const deliveryMap: Record<number, DeliveryInfo> = {};
      await Promise.all(
        sorted.map(async (order) => {
          try {
            const delRes = await fetch(`${API_BASE_URL}/api/orders/${order.id}/delivery`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (delRes.ok) {
              deliveryMap[order.id] = await delRes.json();
            }
          } catch (err) {
            console.log('Error fetching delivery for order:', order.id, err);
          }
        })
      );
      setDeliveries(deliveryMap);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (shopId && token) {
      fetchOrdersAndDeliveries();
    }
  }, [shopId, token]);

  const updateStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status?status=${status}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      Alert.alert('Success', `Order status updated to ${status}`);
      fetchOrdersAndDeliveries(); // Refresh list
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return '#0284C7';
      case 'PREPARING':
        return '#F59E0B';
      case 'READY_FOR_PICKUP':
        return '#8B5CF6';
      case 'PARTNER_ASSIGNED':
        return '#3B82F6';
      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
        return '#10B981';
      case 'DELIVERED':
      case 'COMPLETED':
        return '#16A34A';
      default:
        return colors.textSecondary;
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const delivery = deliveries[item.id] || { hasDelivery: false };

    return (
      <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.orderHeader}>
          <Text style={[styles.orderId, { color: colors.textPrimary }]}>Order #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.orderStatus) }]}>
              {item.orderStatus.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={[styles.productName, { color: colors.textPrimary }]}>
            {item.productName} <Text style={{ color: colors.textSecondary }}>x {item.quantity}</Text>
          </Text>
          <Text style={[styles.amountText, { color: colors.textPrimary }]}>
            Amount: <Text style={{ fontWeight: 'bold', color: colors.primary }}>₹{item.totalAmount}</Text>
          </Text>
          <Text style={[styles.addressText, { color: colors.textSecondary }]}>
            Deliver to: {item.deliveryAddress}
          </Text>
        </View>

        {/* Delivery / Partner Assignment section */}
        {item.orderStatus === 'READY_FOR_PICKUP' && (
          <View style={styles.deliveryInfoBox}>
            <Ionicons name="time-outline" size={16} color="#8B5CF6" />
            <Text style={[styles.deliveryInfoText, { color: '#8B5CF6' }]}>
              Delivery Partner Required (Searching...)
            </Text>
          </View>
        )}

        {delivery.hasDelivery && delivery.partnerName && (
          <View style={styles.deliveryInfoBox}>
            <Ionicons name="bicycle" size={16} color={colors.primary} />
            <Text style={[styles.deliveryInfoText, { color: colors.textPrimary }]}>
              Partner Assigned: <Text style={{ fontWeight: 'bold' }}>{delivery.partnerName}</Text> ({delivery.partnerMobile})
            </Text>
          </View>
        )}

        {/* Action Buttons based on status */}
        <View style={styles.actionsContainer}>
          {item.orderStatus === 'CONFIRMED' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
              onPress={() => updateStatus(item.id, 'PREPARING')}
            >
              <Text style={styles.actionBtnText}>Prepare Order</Text>
            </TouchableOpacity>
          )}

          {item.orderStatus === 'PREPARING' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={() => updateStatus(item.id, 'READY_FOR_PICKUP')}
            >
              <Text style={styles.actionBtnText}>Mark Ready for Pickup</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{shopName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={60} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No orders yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Orders placed with this shop will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchOrdersAndDeliveries();
          }}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  amountText: {
    fontSize: 14,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    marginTop: 4,
  },
  deliveryInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  deliveryInfoText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
