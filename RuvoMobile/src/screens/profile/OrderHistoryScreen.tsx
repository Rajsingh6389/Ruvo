import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyOrders } from '../../services/orderService';
import { Order } from '../../types/order';
import { API_BASE_URL } from '../../config/api';
import { OrderSkeleton } from '../../components/OrderSkeleton';
import { OfflineBar } from '../../components/OfflineBar';
import { SPACING } from '../../theme/spacing';

const ACTIVE_STATUSES = [
  'SHOP_PENDING', 'SHOP_ACCEPTED', 'DELIVERY_ASSIGNMENT',
  'DELIVERY_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY',
];

const DONE_STATUSES = ['DELIVERED', 'SHOP_REJECTED', 'CANCELLED', 'SHOP_TIMEOUT',
  'CANCELLED_SHOP_TIMEOUT', 'CANCELLED_BY_SHOP', 'CANCELLED_NO_PARTNER_FOUND', 'REJECTED'];

const formatProductImageUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

const formatDate = (iso?: string): string => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Map raw status string → display config
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  SHOP_PENDING:      { label: 'Pending',       bg: '#FEF3C7', text: '#92400E', icon: 'time-outline' },
  SHOP_ACCEPTED:     { label: 'Accepted',      bg: '#DBEAFE', text: '#1E40AF', icon: 'checkmark-circle-outline' },
  DELIVERY_ASSIGNMENT:{ label: 'Finding Rider', bg: '#EDE9FE', text: '#5B21B6', icon: 'search-outline' },
  DELIVERY_ASSIGNED: { label: 'Rider Assigned',bg: '#EDE9FE', text: '#5B21B6', icon: 'bicycle-outline' },
  PICKED_UP:         { label: 'Picked Up',     bg: '#DBEAFE', text: '#1E40AF', icon: 'bag-handle-outline' },
  OUT_FOR_DELIVERY:  { label: 'On the Way',    bg: '#FEF3C7', text: '#92400E', icon: 'navigate-outline' },
  DELIVERED:         { label: 'Delivered',     bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-done-circle-outline' },
  CANCELLED:         { label: 'Cancelled',     bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
  SHOP_REJECTED:     { label: 'Rejected',      bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status.toUpperCase()] ?? { label: status, bg: '#F3F4F6', text: '#6B7280', icon: 'ellipse-outline' as const };

export default function OrderHistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, radius, shadows, spacing } = useTheme();
  const { userId, token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const fetchOrders = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    if (!userId || !token) {
      setError('User not authenticated');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    getMyOrders(userId, token)
      .then(data => {
        const sorted = [...data].sort((a, b) => {
          const aActive = ACTIVE_STATUSES.includes(a.orderStatus || '');
          const bActive = ACTIVE_STATUSES.includes(b.orderStatus || '');
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setOrders(sorted);
        setError(null);
      })
      .catch(err => setError(err.message || 'Failed to load orders'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [userId, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.orderStatus || ''));
  const pastOrders   = orders.filter(o => !ACTIVE_STATUSES.includes(o.orderStatus || ''));
  const displayOrders = activeTab === 'active' ? activeOrders : pastOrders;

  // ─ ORDER CARD ─────────────────────────────────────────────────────────
  const renderOrder = ({ item }: { item: Order }) => {
    const isActive = ACTIVE_STATUSES.includes(item.orderStatus || '');
    const statusCfg = getStatusConfig(item.orderStatus || '');
    const imgUri = formatProductImageUrl(item.productImageUrl);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isActive ? colors.primary + '40' : colors.border,
            borderRadius: radius.card,
          },
          shadows.md,
          isActive && { borderWidth: 1.5 },
        ]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('CustomerTracking', { orderId: item.id })}
      >
        {/* Active shimmer stripe */}
        {isActive && (
          <View style={[styles.activeStripe, { backgroundColor: colors.primary }]} />
        )}

        {/* Card header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={[typography.overline, { color: colors.textHint, fontSize: 10 }]}>Order</Text>
            <Text style={[typography.headingS, { color: colors.textPrimary }]}>#{item.id}</Text>
          </View>
          <View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderRadius: radius.xs }]}>
              <Ionicons name={statusCfg.icon} size={12} color={statusCfg.text} />
              <Text style={[typography.overline, { color: statusCfg.text, fontSize: 10 }]}>{statusCfg.label}</Text>
            </View>
          </View>
        </View>

        {/* Date */}
        <Text style={[typography.caption, { color: colors.textHint, marginBottom: 12 }]}>
          {formatDate(item.createdAt)}
        </Text>

        {/* Product row */}
        <View style={[styles.productRow, { backgroundColor: colors.surfaceSunken, borderRadius: radius.image }]}>
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={[styles.productImg, { borderRadius: radius.thumb }]} />
          ) : (
            <View style={[styles.productImg, { backgroundColor: colors.primarySoft, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="cart" size={20} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{item.productName}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
              Qty: {item.quantity}
            </Text>
          </View>
          <Text style={[typography.headingS, { color: colors.textPrimary }]}>₹{item.subtotal || item.totalAmount}</Text>
        </View>

        {/* Billing summary */}
        <View style={[styles.billBox, { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, marginTop: 12 }]}>
          {[
            { label: 'Subtotal', value: `₹${item.subtotal || item.totalAmount}` },
            ...(item.deliveryFee ? [{ label: 'Delivery', value: `₹${item.deliveryFee}` }] : []),
            ...(item.platformFee ? [{ label: 'Platform fee', value: `₹${item.platformFee}` }] : []),
          ].map((row, i) => (
            <View key={i} style={styles.billRow}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[typography.captionStrong, { color: colors.textPrimary }]}>{row.value}</Text>
            </View>
          ))}
          <View style={[styles.billDivider, { backgroundColor: colors.border }]} />
          <View style={styles.billRow}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Total</Text>
            <Text style={[typography.headingS, { color: colors.primary }]}>₹{item.totalAmount}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={{ gap: 2 }}>
            <Text style={[typography.caption, { color: colors.textHint, fontSize: 10 }]}>Payment</Text>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 13 }]}>
              {item.paymentMethod === 'ONLINE' ? 'Online' : 'Cash on Delivery'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.trackBtn,
              {
                backgroundColor: isActive ? colors.primary : colors.surfaceSunken,
                borderRadius: radius.button,
              },
              isActive && shadows.brand,
            ]}
            onPress={() => navigation.navigate('CustomerTracking', { orderId: item.id })}
          >
            <Ionicons
              name={isActive ? 'navigate' : 'eye-outline'}
              size={14}
              color={isActive ? colors.onPrimary : colors.textSecondary}
            />
            <Text style={[typography.bodyStrong, {
              color: isActive ? colors.onPrimary : colors.textSecondary,
              fontSize: 13,
            }]}>
              {isActive ? 'Track Order' : 'Details'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <OfflineBar />

      {/* ─ HEADER ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.headingL, { color: colors.textPrimary }]}>Order History</Text>
        <TouchableOpacity onPress={() => fetchOrders(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ─ TAB BAR ─────────────────────────────────────────────────────── */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: 'active', label: 'Active', count: activeOrders.length },
          { key: 'past',   label: 'Past',   count: pastOrders.length },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              typography.bodyStrong,
              {
                color: activeTab === tab.key ? colors.primary : colors.textSecondary,
                fontSize: 14,
              },
            ]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === tab.key ? colors.primary : colors.surfaceSunken, borderRadius: 10 }]}>
                <Text style={[typography.overline, {
                  color: activeTab === tab.key ? colors.onPrimary : colors.textSecondary,
                  fontSize: 9,
                }]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ─ CONTENT ─────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <OrderSkeleton count={3} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={[styles.errorIcon, { backgroundColor: colors.errorSoft, borderRadius: 40 }]}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          </View>
          <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 16 }]}>Oops!</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: radius.button }, shadows.brand]}
            onPress={() => fetchOrders()}
          >
            <Text style={[typography.button, { color: colors.onPrimary }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : displayOrders.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft, borderRadius: 48 }]}>
            <Ionicons name="receipt-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 20 }]}>
            {activeTab === 'active' ? 'No active orders' : 'No past orders'}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
            {activeTab === 'active'
              ? "You don't have any ongoing orders right now"
              : "You haven't placed any orders yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: SPACING.gutter,
    borderBottomWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.gutter,
    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    marginRight: SPACING.xxxl,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrap: { padding: SPACING.gutter },
  listContent: {
    padding: SPACING.gutter,
    paddingBottom: SPACING.massive,
    gap: SPACING.md,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  activeStripe: {
    height: 3,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    paddingBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginHorizontal: SPACING.lg,
  },
  productImg: {
    width: 48,
    height: 48,
  },
  billBox: { marginHorizontal: SPACING.lg, padding: 12 },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  billDivider: { height: 1, marginVertical: 6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    margin: SPACING.lg,
    marginTop: 12,
    paddingTop: 12,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  errorIcon: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  retryBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12 },
});
