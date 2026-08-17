// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   ActivityIndicator,
//   SafeAreaView,
//   Alert
// } from 'react-native';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import { Ionicons } from '@expo/vector-icons';
// import { useTheme } from '../../context/ThemeContext';
// import { useAuth } from '../../context/AuthContext';
// import { Order } from '../../types/order';
// import { API_BASE_URL } from '../../config/api';

// export default function ShopOrdersScreen() {
//   const navigation = useNavigation<any>();
//   const route = useRoute<any>();
//   const { colors } = useTheme();
//   const { token, userId } = useAuth();
  
//   const shopId = route.params?.shopId;

//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchOrders = () => {
//     if (!token || !shopId) return;
//     setLoading(true);
//     fetch(`${API_BASE_URL}/api/orders/shop/${shopId}`, {
//       headers: { Authorization: `Bearer ${token}` }
//     })
//       .then(res => res.json())
//       .then(data => {
//         if (Array.isArray(data)) {
//           // Sort pending first, then accepted, string fallback
//           setOrders(data.reverse());
//         }
//         setLoading(false);
//       })
//       .catch(err => {
//         setError('Failed to fetch shop orders.');
//         setLoading(false);
//       });
//   };

//   useEffect(() => {
//     fetchOrders();
    
//     // Auto refresh every 15 seconds to receive notification implicitly
//     const interval = setInterval(fetchOrders, 15000);
//     return () => clearInterval(interval);
//   }, [shopId, token]);

//   const handleAccept = (orderId: number) => {
//     fetch(`${API_BASE_URL}/api/orders/${orderId}/accept`, {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${token}` }
//     })
//       .then(res => res.json())
//       .then(() => fetchOrders())
//       .catch(() => Alert.alert('Error', 'Failed to accept order'));
//   };

//   const handleReject = (orderId: number) => {
//     Alert.alert('Reject Order', 'Are you sure you want to reject and cancel this order?', [
//       { text: 'Cancel', style: 'cancel' },
//       { text: 'Reject', style: 'destructive', onPress: () => {
//           fetch(`${API_BASE_URL}/api/orders/${orderId}/reject`, {
//             method: 'POST',
//             headers: { Authorization: `Bearer ${token}` }
//           })
//             .then(res => res.json())
//             .then(() => fetchOrders())
//             .catch(() => Alert.alert('Error', 'Failed to reject order'));
//       }}
//     ]);
//   };

//   const renderOrderItem = ({ item }: { item: Order }) => {
//     const isPending = item.orderStatus === 'SHOP_PENDING';
//     const isAccepted = ['SHOP_ACCEPTED', 'DELIVERY_ASSIGNMENT', 'DELIVERY_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(item.orderStatus || '');
    
//     return (
//       <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
//         <View style={styles.orderHeader}>
//           <Text style={[styles.orderId, { color: colors.textPrimary }]}>Order #{item.id}</Text>
//           <View style={[styles.statusBadge, {
//             backgroundColor: isPending ? '#FEF3C7' : isAccepted ? '#E8F5E9' : '#F3F4F6'
//           }]}>
//             <Text style={[styles.statusText, {
//               color: isPending ? '#D97706' : isAccepted ? '#2E7D32' : '#374151'
//             }]}>
//               {item.orderStatus?.replace(/_/g, ' ')}
//             </Text>
//           </View>
//         </View>

//         <View style={styles.detailsRow}>
//            <Text style={{ color: colors.textSecondary }}>Item:</Text>
//            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{item.productName} (x{item.quantity})</Text>
//         </View>
//         <View style={styles.detailsRow}>
//            <Text style={{ color: colors.textSecondary }}>Total Amount:</Text>
//            <Text style={{ color: colors.primary, fontWeight: '700' }}>₹{item.totalAmount}</Text>
//         </View>
//         <View style={styles.detailsRow}>
//            <Text style={{ color: colors.textSecondary }}>Payment:</Text>
//            <Text style={{ color: colors.textPrimary }}>{item.paymentMethod}</Text>
//         </View>

//         {isPending && (
//           <View style={styles.actionRow}>
//             <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.id!)}>
//               <Text style={styles.rejectBtnText}>Reject</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleAccept(item.id!)}>
//               <Text style={styles.acceptBtnText}>Accept Order</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
//       <View style={styles.header}>
//         <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
//           <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
//         </TouchableOpacity>
//         <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Store Orders</Text>
//         <TouchableOpacity style={styles.backButton} onPress={() => fetchOrders()}>
//           <Ionicons name="refresh" size={22} color={colors.primary} />
//         </TouchableOpacity>
//       </View>

//       {loading && orders.length === 0 ? (
//         <View style={styles.center}>
//           <ActivityIndicator size="small" color={colors.primary} />
//         </View>
//       ) : error ? (
//         <View style={styles.center}>
//           <Ionicons name="alert-circle-outline" size={48} color="#D32F2F" />
//           <Text style={{ color: colors.textPrimary, marginTop: 12 }}>{error}</Text>
//         </View>
//       ) : orders.length === 0 ? (
//         <View style={styles.center}>
//           <Ionicons name="receipt-outline" size={54} color="#AEB5AF" />
//           <Text style={{ color: colors.textPrimary, marginTop: 12, fontSize: 16 }}>No Orders Found</Text>
//         </View>
//       ) : (
//         <FlatList
//           data={orders}
//           keyExtractor={item => String(item.id)}
//           renderItem={renderOrderItem}
//           contentContainerStyle={styles.listContent}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     height: 56,
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   backButton: { padding: 8 },
//   headerTitle: { fontSize: 18, fontWeight: '700' },
//   center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
//   listContent: { padding: 16 },
//   orderCard: {
//     borderRadius: 12,
//     borderWidth: 1,
//     padding: 16,
//     marginBottom: 16,
//   },
//   orderHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   orderId: { fontSize: 16, fontWeight: '700' },
//   statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
//   statusText: { fontSize: 11, fontWeight: '700' },
//   detailsRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 6,
//   },
//   actionRow: {
//     flexDirection: 'row',
//     marginTop: 16,
//     gap: 12,
//   },
//   actionBtn: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   acceptBtn: {
//     backgroundColor: '#2E7D32',
//   },
//   acceptBtnText: {
//     color: '#FFF',
//     fontWeight: '700',
//     fontSize: 15,
//   },
//   rejectBtn: {
//     backgroundColor: '#FFF',
//     borderWidth: 1,
//     borderColor: '#D32F2F',
//   },
//   rejectBtnText: {
//     color: '#D32F2F',
//     fontWeight: '600',
//     fontSize: 15,
//   }
// });


import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Order } from '../../types/order';
import { API_BASE_URL } from '../../config/api';
import { ROUTES } from '../../constants/routes';

type OrderStatus =
  | 'SHOP_PENDING'
  | 'SHOP_ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERY_ASSIGNMENT'
  | 'DELIVERY_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'SHOP_REJECTED';

export default function ShopOrdersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { colors } = useTheme();
  const { token } = useAuth();

  const shopId = route.params?.shopId;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] =
    useState<number | null>(null);

  // --------------------------------------------------
  // FETCH SHOP ORDERS
  // --------------------------------------------------

  const fetchOrders = useCallback(
    async (showLoader = true) => {
      if (!token || !shopId) {
        setLoading(false);
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      try {
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/api/orders/shop/${shopId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Invalid orders response');
        }

        // Newest orders first.
        // Do NOT mutate the API array with reverse().
        const sortedOrders = [...data].sort((a: Order, b: Order) => {
          return Number(b.id || 0) - Number(a.id || 0);
        });

        setOrders(sortedOrders);
      } catch (err) {
        console.error('Fetch shop orders error:', err);
        setError('Failed to fetch shop orders.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, shopId]
  );

  // --------------------------------------------------
  // INITIAL FETCH + AUTO REFRESH
  // --------------------------------------------------

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // --------------------------------------------------
  // PULL TO REFRESH
  // --------------------------------------------------

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  // --------------------------------------------------
  // ACCEPT ORDER
  // --------------------------------------------------

  const handleAccept = async (orderId: number) => {
    if (!token) return;

    try {
      setProcessingOrderId(orderId);

      const response = await fetch(
        `${API_BASE_URL}/api/orders/${orderId}/accept`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to accept order');
      }

      await fetchOrders(false);

      Alert.alert(
        'Order Accepted',
        'The order has been accepted and is ready for preparation.'
      );
    } catch (error) {
      console.error('Accept order error:', error);

      Alert.alert(
        'Error',
        'Failed to accept order. Please try again.'
      );
    } finally {
      setProcessingOrderId(null);
    }
  };

  // --------------------------------------------------
  // REJECT ORDER
  // --------------------------------------------------

  const handleReject = (orderId: number) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;

            try {
              setProcessingOrderId(orderId);

              const response = await fetch(
                `${API_BASE_URL}/api/orders/${orderId}/reject`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                  },
                }
              );

              if (!response.ok) {
                throw new Error('Failed to reject order');
              }

              await fetchOrders(false);

              Alert.alert(
                'Order Rejected',
                'The order has been rejected.'
              );
            } catch (error) {
              console.error('Reject order error:', error);

              Alert.alert(
                'Error',
                'Failed to reject order.'
              );
            } finally {
              setProcessingOrderId(null);
            }
          },
        },
      ]
    );
  };

  // --------------------------------------------------
  // ORDER STATUS HELPERS
  // --------------------------------------------------

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'SHOP_PENDING':
        return '#D97706';

      case 'SHOP_ACCEPTED':
      case 'PREPARING':
        return '#2563EB';

      case 'READY':
        return '#7C3AED';

      case 'DELIVERY_ASSIGNMENT':
        return '#EA580C';

      case 'DELIVERY_ASSIGNED':
        return '#0891B2';

      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
        return '#059669';

      case 'DELIVERED':
        return '#15803D';

      case 'CANCELLED':
      case 'SHOP_REJECTED':
        return '#DC2626';

      default:
        return '#6B7280';
    }
  };

  const getStatusBackground = (status?: string) => {
    switch (status) {
      case 'SHOP_PENDING':
        return '#FEF3C7';

      case 'SHOP_ACCEPTED':
      case 'PREPARING':
        return '#DBEAFE';

      case 'READY':
        return '#EDE9FE';

      case 'DELIVERY_ASSIGNMENT':
        return '#FFEDD5';

      case 'DELIVERY_ASSIGNED':
        return '#CFFAFE';

      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
        return '#D1FAE5';

      case 'DELIVERED':
        return '#DCFCE7';

      case 'CANCELLED':
      case 'SHOP_REJECTED':
        return '#FEE2E2';

      default:
        return '#F3F4F6';
    }
  };

  const formatStatus = (status?: string) => {
    if (!status) return 'UNKNOWN';

    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  // --------------------------------------------------
  // PAYMENT TYPE
  // --------------------------------------------------

  const isCOD = (paymentMethod?: string) => {
    if (!paymentMethod) return false;

    return paymentMethod.toUpperCase().includes('COD');
  };

  // --------------------------------------------------
  // ORDER CARD
  // --------------------------------------------------

  const renderOrderItem = ({
    item,
  }: {
    item: Order;
  }) => {
    const status = item.orderStatus as OrderStatus;

    const isPending = status === 'SHOP_PENDING';

    const isPreparing =
      status === 'SHOP_ACCEPTED' ||
      status === 'PREPARING';

    const isReady = status === 'READY';

    const isAssigning =
      status === 'DELIVERY_ASSIGNMENT';

    const isAssigned =
      status === 'DELIVERY_ASSIGNED';

    const isOutForDelivery =
      status === 'PICKED_UP' ||
      status === 'OUT_FOR_DELIVERY';

    const isCompleted =
      status === 'DELIVERED';

    const isCancelled =
      status === 'CANCELLED' ||
      status === 'SHOP_REJECTED';

    const cod = isCOD(item.paymentMethod);

    const processing =
      processingOrderId === item.id;

    return (
      <View
        style={[
          styles.orderCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* HEADER */}
        <View style={styles.orderHeader}>
          <View>
            <Text
              style={[
                styles.orderId,
                { color: colors.textPrimary },
              ]}
            >
              Order #{item.id}
            </Text>

            <Text
              style={[
                styles.orderSubText,
                { color: colors.textSecondary },
              ]}
            >
              Shop Order
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  getStatusBackground(status),
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: getStatusColor(status),
                },
              ]}
            >
              {formatStatus(status)}
            </Text>
          </View>
        </View>

        {/* ITEM */}
        <View style={styles.detailsRow}>
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary },
            ]}
          >
            Item
          </Text>

          <Text
            style={[
              styles.value,
              { color: colors.textPrimary },
            ]}
          >
            {item.productName || 'Multiple Items'}
            {item.quantity
              ? ` × ${item.quantity}`
              : ''}
          </Text>
        </View>

        {/* TOTAL */}
        <View style={styles.detailsRow}>
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary },
            ]}
          >
            Order Total
          </Text>

          <Text
            style={[
              styles.amount,
              { color: colors.primary },
            ]}
          >
            ₹{item.totalAmount ?? 0}
          </Text>
        </View>

        {/* PAYMENT */}
        <View style={styles.detailsRow}>
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary },
            ]}
          >
            Payment
          </Text>

          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor: cod
                  ? '#FEF3C7'
                  : '#DCFCE7',
              },
            ]}
          >
            <Ionicons
              name={
                cod
                  ? 'cash-outline'
                  : 'card-outline'
              }
              size={14}
              color={cod ? '#B45309' : '#15803D'}
            />

            <Text
              style={{
                color: cod
                  ? '#B45309'
                  : '#15803D',
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {cod
                ? 'COD'
                : 'PAID ONLINE'}
            </Text>
          </View>
        </View>

        {/* COD INFORMATION */}
        {cod && (
          <View style={styles.codBox}>
            <Ionicons
              name="cash-outline"
              size={20}
              color="#B45309"
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.codTitle}>
                Cash on Delivery
              </Text>

              <Text style={styles.codText}>
                Delivery partner will collect ₹
                {item.totalAmount ?? 0} from customer.
              </Text>
            </View>
          </View>
        )}

        {/* UPI INFORMATION */}
        {!cod && (
          <View style={styles.paidBox}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#15803D"
            />

            <Text style={styles.paidText}>
              Customer payment already received.
            </Text>
          </View>
        )}

        {/* PENDING ORDER */}
        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              disabled={processing}
              style={[
                styles.actionBtn,
                styles.rejectBtn,
                processing && styles.disabledBtn,
              ]}
              onPress={() =>
                handleReject(item.id!)
              }
            >
              {processing ? (
                <ActivityIndicator
                  size="small"
                  color="#DC2626"
                />
              ) : (
                <>
                  <Ionicons
                    name="close"
                    size={18}
                    color="#DC2626"
                  />

                  <Text
                    style={styles.rejectBtnText}
                  >
                    Reject
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={processing}
              style={[
                styles.actionBtn,
                styles.acceptBtn,
                processing && styles.disabledBtn,
              ]}
              onPress={() =>
                handleAccept(item.id!)
              }
            >
              {processing ? (
                <ActivityIndicator
                  size="small"
                  color="#FFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color="#FFF"
                  />

                  <Text
                    style={styles.acceptBtnText}
                  >
                    Accept Order
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* PREPARING */}
        {isPreparing && (
          <View style={styles.infoBox}>
            <Ionicons
              name="restaurant-outline"
              size={20}
              color="#2563EB"
            />

            <Text style={styles.infoText}>
              Prepare this order and mark it ready
              when packed.
            </Text>
          </View>
        )}

        {/* READY */}
        {isReady && (
          <TouchableOpacity
            style={styles.assignmentBox}
            onPress={() =>
              navigation.navigate(
                ROUTES.DELIVERY_ASSIGNMENT,
                {
                  orderId: item.id,
                  shopId,
                }
              )
            }
          >
            <Ionicons
              name="bicycle-outline"
              size={24}
              color="#EA580C"
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.assignmentTitle}>
                Ready for Delivery
              </Text>

              <Text style={styles.assignmentText}>
                Find a delivery partner
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color="#EA580C"
            />
          </TouchableOpacity>
        )}

        {/* PARTNER ASSIGNMENT */}
        {isAssigning && (
          <TouchableOpacity
            style={styles.assignmentBox}
            onPress={() =>
              navigation.navigate(
                ROUTES.DELIVERY_ASSIGNMENT,
                { orderId: item.id, shopId }
              )
            }
          >
            <ActivityIndicator
              size="small"
              color="#EA580C"
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.assignmentTitle}>
                Finding Delivery Partner
              </Text>

              <Text style={styles.assignmentText}>
                Tap to view assignment progress
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color="#EA580C"
            />
          </TouchableOpacity>
        )}

        {/* PARTNER ASSIGNED */}
        {isAssigned && (
          <View style={styles.assignmentSuccess}>
            <Ionicons
              name="bicycle"
              size={22}
              color="#0891B2"
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.assignedTitle}>
                Delivery Partner Assigned
              </Text>

              <Text style={styles.assignedText}>
                Partner is coming to pick up
                the order.
              </Text>
            </View>
          </View>
        )}

        {/* OUT FOR DELIVERY */}
        {isOutForDelivery && (
          <View style={styles.deliveryBox}>
            <Ionicons
              name="navigate"
              size={22}
              color="#059669"
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryTitle}>
                Out for Delivery
              </Text>

              <Text style={styles.deliveryText}>
                Delivery partner is delivering
                this order.
              </Text>
            </View>
          </View>
        )}

        {/* DELIVERED */}
        {isCompleted && (
          <View style={styles.completedBox}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color="#15803D"
            />

            <Text style={styles.completedText}>
              Order delivered successfully
            </Text>
          </View>
        )}

        {/* CANCELLED */}
        {isCancelled && (
          <View style={styles.cancelledBox}>
            <Ionicons
              name="close-circle"
              size={22}
              color="#DC2626"
            />

            <Text style={styles.cancelledText}>
              This order has been cancelled.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // --------------------------------------------------
  // SCREEN
  // --------------------------------------------------

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.textPrimary },
            ]}
          >
            Shop Orders
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.textSecondary },
            ]}
          >
            {orders.length} orders
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            fetchOrders(true)
          }
        >
          <Ionicons
            name="refresh"
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {loading && orders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={[
              styles.loadingText,
              { color: colors.textSecondary },
            ]}
          >
            Loading orders...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={52}
            color="#DC2626"
          />

          <Text
            style={[
              styles.errorText,
              { color: colors.textPrimary },
            ]}
          >
            {error}
          </Text>

          <TouchableOpacity
            style={[
              styles.retryButton,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
            onPress={() =>
              fetchOrders(true)
            }
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="receipt-outline"
            size={58}
            color="#AEB5AF"
          />

          <Text
            style={[
              styles.emptyTitle,
              { color: colors.textPrimary },
            ]}
          >
            No Orders Yet
          </Text>

          <Text
            style={[
              styles.emptyText,
              { color: colors.textSecondary },
            ]}
          >
            New customer orders will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item =>
            String(item.id)
          }
          renderItem={renderOrderItem}
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    padding: 8,
    width: 42,
    alignItems: 'center',
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  errorText: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 9,
  },

  retryText: {
    color: '#FFF',
    fontWeight: '700',
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },

  listContent: {
    padding: 14,
    paddingBottom: 30,
  },

  orderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },

  orderId: {
    fontSize: 17,
    fontWeight: '800',
  },

  orderSubText: {
    fontSize: 12,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },

  label: {
    fontSize: 13,
  },

  value: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },

  amount: {
    fontSize: 16,
    fontWeight: '800',
  },

  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },

  codBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },

  codTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },

  codText: {
    color: '#B45309',
    fontSize: 12,
    marginTop: 2,
  },

  paidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 11,
    borderRadius: 10,
    marginTop: 8,
  },

  paidText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },

  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  acceptBtn: {
    backgroundColor: '#2E7D32',
  },

  acceptBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },

  rejectBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DC2626',
  },

  rejectBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },

  infoText: {
    flex: 1,
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
  },

  assignmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 13,
    borderRadius: 10,
    marginTop: 14,
  },

  assignmentTitle: {
    color: '#C2410C',
    fontSize: 14,
    fontWeight: '800',
  },

  assignmentText: {
    color: '#EA580C',
    fontSize: 12,
    marginTop: 3,
  },

  assignmentSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    padding: 13,
    borderRadius: 10,
    marginTop: 14,
  },

  assignedTitle: {
    color: '#0E7490',
    fontSize: 14,
    fontWeight: '800',
  },

  assignedText: {
    color: '#0891B2',
    fontSize: 12,
    marginTop: 3,
  },

  deliveryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 13,
    borderRadius: 10,
    marginTop: 14,
  },

  deliveryTitle: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '800',
  },

  deliveryText: {
    color: '#059669',
    fontSize: 12,
    marginTop: 3,
  },

  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },

  completedText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },

  cancelledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },

  cancelledText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});