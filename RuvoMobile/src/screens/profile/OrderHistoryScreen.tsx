import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
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

// ─── Status groups ────────────────────────────────────────────────────────────
const ACTIVE_STATUSES = [
  'SHOP_PENDING', 'SHOP_ACCEPTED', 'DELIVERY_ASSIGNMENT',
  'DELIVERY_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY',
];

const CANCELLED_STATUSES = [
  'CANCELLED', 'SHOP_REJECTED', 'SHOP_TIMEOUT',
  'CANCELLED_SHOP_TIMEOUT', 'CANCELLED_BY_SHOP',
  'CANCELLED_NO_PARTNER_FOUND', 'REJECTED',
];

// ─── Status colour palette ────────────────────────────────────────────────────
// GREEN  → Delivered
// ORANGE → In-progress / active
// RED    → Cancelled / rejected
type StatusTheme = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  pillBg: string;
  pillText: string;
  cardLeft: string;   // left accent bar colour
  badgeBg: string;    // subtle card tint
};

const STATUS_MAP: Record<string, StatusTheme> = {
  // ── Active / in-progress (RuVo Orange theme) ──────────────────────────────
  SHOP_PENDING:        { label: 'Pending',        icon: 'time-outline',                pillBg: '#FFF0DC', pillText: '#B44D00', cardLeft: '#FF7A00', badgeBg: '#FFF8F0' },
  SHOP_ACCEPTED:       { label: 'Accepted',        icon: 'checkmark-circle-outline',    pillBg: '#FFF0DC', pillText: '#B44D00', cardLeft: '#FF7A00', badgeBg: '#FFF8F0' },
  DELIVERY_ASSIGNMENT: { label: 'Finding Rider',   icon: 'search-outline',              pillBg: '#FFF0DC', pillText: '#B44D00', cardLeft: '#FF7A00', badgeBg: '#FFF8F0' },
  DELIVERY_ASSIGNED:   { label: 'Rider Assigned',  icon: 'bicycle-outline',             pillBg: '#FFF0DC', pillText: '#B44D00', cardLeft: '#FF7A00', badgeBg: '#FFF8F0' },
  PICKED_UP:           { label: 'Picked Up',       icon: 'bag-handle-outline',          pillBg: '#FFF0DC', pillText: '#B44D00', cardLeft: '#FF7A00', badgeBg: '#FFF8F0' },
  OUT_FOR_DELIVERY:    { label: 'On the Way',      icon: 'navigate-outline',            pillBg: '#FFF0DC', pillText: '#B44D00', cardLeft: '#FF7A00', badgeBg: '#FFF8F0' },
  // ── Delivered (green) ─────────────────────────────────────────────────────
  DELIVERED:           { label: 'Delivered',       icon: 'checkmark-done-circle-outline', pillBg: '#D1FAE5', pillText: '#065F46', cardLeft: '#16A34A', badgeBg: '#F0FDF4' },
  // ── Cancelled / rejected (red) ────────────────────────────────────────────
  CANCELLED:           { label: 'Cancelled',       icon: 'close-circle-outline',        pillBg: '#FEE2E2', pillText: '#991B1B', cardLeft: '#DC2626', badgeBg: '#FFF5F5' },
  SHOP_REJECTED:       { label: 'Rejected',        icon: 'close-circle-outline',        pillBg: '#FEE2E2', pillText: '#991B1B', cardLeft: '#DC2626', badgeBg: '#FFF5F5' },
  SHOP_TIMEOUT:        { label: 'Timed Out',       icon: 'timer-outline',               pillBg: '#FEE2E2', pillText: '#991B1B', cardLeft: '#DC2626', badgeBg: '#FFF5F5' },
  CANCELLED_SHOP_TIMEOUT:       { label: 'Cancelled',  icon: 'close-circle-outline',   pillBg: '#FEE2E2', pillText: '#991B1B', cardLeft: '#DC2626', badgeBg: '#FFF5F5' },
  CANCELLED_BY_SHOP:            { label: 'Cancelled by Shop', icon: 'close-circle-outline', pillBg: '#FEE2E2', pillText: '#991B1B', cardLeft: '#DC2626', badgeBg: '#FFF5F5' },
  CANCELLED_NO_PARTNER_FOUND:   { label: 'No Rider Found', icon: 'close-circle-outline', pillBg: '#FEE2E2', pillText: '#991B1B', cardLeft: '#DC2626', badgeBg: '#FFF5F5' },
  REJECTED:            { label: 'Rejected',        icon: 'close-circle-outline',        pillBg: '#FEE2E2', pillText: '#991B1B', cardLeft: '#DC2626', badgeBg: '#FFF5F5' },
};

const getStatusTheme = (status: string): StatusTheme =>
  STATUS_MAP[status.toUpperCase()] ?? {
    label: status, icon: 'ellipse-outline',
    pillBg: '#F3F4F6', pillText: '#6B7280', cardLeft: '#9CA3AF', badgeBg: '#FAFAFA',
  };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatProductImageUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

const formatDate = (iso?: string): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Item row inside an expanded card ─────────────────────────────────────────
function ItemRow({ name, qty, price, imageUrl, colors, typography, radius }: any) {
  const uri = formatProductImageUrl(imageUrl);
  return (
    <View style={itemStyles.row}>
      {uri ? (
        <Image source={{ uri }} style={[itemStyles.img, { borderRadius: radius.thumb }]} />
      ) : (
        <View style={[itemStyles.img, { borderRadius: radius.thumb, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="cube-outline" size={16} color={colors.primary} />
        </View>
      )}
      <Text style={[typography.body, { color: colors.textPrimary, flex: 1, fontSize: 13 }]} numberOfLines={2}>{name}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginRight: 8 }]}>×{qty}</Text>
      {price != null && (
        <Text style={[typography.captionStrong, { color: colors.textPrimary }]}>₹{price}</Text>
      )}
    </View>
  );
}

const itemStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  img: { width: 36, height: 36 },
});

// ─── Single order card ────────────────────────────────────────────────────────
function OrderCard({ item, colors, typography, radius, shadows, navigation }: any) {
  const [expanded, setExpanded] = useState(false);
  const isActive = ACTIVE_STATUSES.includes(item.orderStatus || '');
  const isCancelled = CANCELLED_STATUSES.includes(item.orderStatus || '');
  const isDelivered = (item.orderStatus || '').toUpperCase() === 'DELIVERED';

  const st = getStatusTheme(item.orderStatus || '');

  const hasItems = item.items && item.items.length > 0;
  const itemCount = hasItems ? item.items.length : item.quantity;

  const shopName: string = item.shopName || 'RuVo Store';
  const shopInitials = shopName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const shopLogoUri = formatProductImageUrl((item as any).shopLogoUrl);

  return (
    <TouchableOpacity
      activeOpacity={0.96}
      onPress={() => navigation.navigate('CustomerTracking', { orderId: item.id })}
      style={[
        cardStyles.card,
        {
          backgroundColor: st.badgeBg,
          borderRadius: radius.card,
          borderColor: st.cardLeft + '40',
        },
        shadows.md,
      ]}
    >
      {/* Left accent bar */}
      <View style={[cardStyles.accentBar, { backgroundColor: st.cardLeft }]} />

      <View style={cardStyles.inner}>
        {/* ─ Row 1: Status pill only (no order ID) ─────────────────── */}
        <View style={[cardStyles.pill, { backgroundColor: st.pillBg, borderRadius: radius.xs, alignSelf: 'flex-start' }]}>
          <Ionicons name={st.icon} size={12} color={st.pillText} />
          <Text style={[typography.overline, { color: st.pillText, fontSize: 10, marginLeft: 4 }]}>{st.label}</Text>
        </View>

        {/* ─ Row 2: Shop logo + name ───────────────────────────────────── */}
        <View style={[cardStyles.shopRow, { backgroundColor: colors.surface, borderRadius: radius.sm, borderColor: colors.border }]}>
          {shopLogoUri ? (
            <Image
              source={{ uri: shopLogoUri }}
              style={[cardStyles.shopLogoImg, { borderRadius: 20 }]}
            />
          ) : (
            <View style={[cardStyles.shopLogoImg, { borderRadius: 20, backgroundColor: st.cardLeft, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{shopInitials}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[typography.overline, { color: colors.textHint, fontSize: 10 }]}>SHOP</Text>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 14 }]} numberOfLines={1}>
              {shopName}
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.textHint, fontSize: 11 }]}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* ─ Row 3: Items section header ───────────────────────────────── */}
        <TouchableOpacity
          style={[cardStyles.itemsHeader, { backgroundColor: colors.surface, borderRadius: radius.sm, borderColor: colors.border }]}
          onPress={() => hasItems && setExpanded(e => !e)}
          activeOpacity={hasItems ? 0.7 : 1}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Ionicons name="cart-outline" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              {hasItems ? (
                <>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 13 }]} numberOfLines={1}>
                    {item.items[0].productName}
                    {item.items.length > 1 ? ` + ${item.items.length - 1} more` : ''}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {itemCount} item{itemCount > 1 ? 's' : ''} · Tap to {expanded ? 'hide' : 'view all'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 13 }]} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Qty: {item.quantity}
                  </Text>
                </>
              )}
            </View>
          </View>
          {hasItems && (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          )}
        </TouchableOpacity>

        {/* ─ Expanded items list ───────────────────────────────────────── */}
        {expanded && hasItems && (
          <View style={[cardStyles.itemsList, { backgroundColor: colors.surface, borderRadius: radius.sm, borderColor: colors.border }]}>
            {item.items.map((it: any, idx: number) => (
              <React.Fragment key={idx}>
                <ItemRow
                  name={it.productName}
                  qty={it.quantity}
                  price={it.price}
                  imageUrl={it.productImageUrl}
                  colors={colors}
                  typography={typography}
                  radius={radius}
                />
                {idx < item.items.length - 1 && (
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* ─ Row 4: billing summary ────────────────────────────────────── */}
        <View style={[cardStyles.bill, { backgroundColor: colors.surface, borderRadius: radius.sm, borderColor: colors.border }]}>
          {item.subtotal != null && (
            <View style={cardStyles.billRow}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[typography.caption, { color: colors.textPrimary }]}>₹{item.subtotal}</Text>
            </View>
          )}
          {item.deliveryFee != null && (
            <View style={cardStyles.billRow}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Delivery</Text>
              <Text style={[typography.caption, { color: colors.textPrimary }]}>₹{item.deliveryFee}</Text>
            </View>
          )}
          {item.platformFee != null && (
            <View style={cardStyles.billRow}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Platform fee</Text>
              <Text style={[typography.caption, { color: colors.textPrimary }]}>₹{item.platformFee}</Text>
            </View>
          )}
          <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />
          <View style={cardStyles.billRow}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Total</Text>
            <Text style={[typography.headingS, { color: st.pillText, fontSize: 15 }]}>₹{item.totalAmount}</Text>
          </View>
        </View>

        {/* ─ Row 5: payment + CTA ──────────────────────────────────────── */}
        <View style={cardStyles.footer}>
          <View style={[cardStyles.payBadge, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xs }]}>
            <Ionicons
              name={item.paymentMethod === 'ONLINE' ? 'card-outline' : 'cash-outline'}
              size={13}
              color={colors.textSecondary}
            />
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600', fontSize: 11 }]}>
              {item.paymentMethod === 'ONLINE' ? 'Online' : 'COD'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isDelivered && (
              <TouchableOpacity
                style={[cardStyles.btn, { borderColor: '#F59E0B', borderWidth: 1.5, backgroundColor: '#FFFBEB', borderRadius: radius.button }]}
                onPress={() => navigation.navigate('RateOrder', {
                  orderId: item.id,
                  shopId: item.shopId || 1,
                  shopName: item.shopName || 'Shop',
                })}
              >
                <Ionicons name="star" size={13} color="#D97706" />
                <Text style={[typography.bodyStrong, { color: '#D97706', fontSize: 12 }]}>Rate</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                cardStyles.btn,
                {
                  backgroundColor: isActive ? colors.primary : isCancelled ? '#FEE2E2' : '#D1FAE5',
                  borderRadius: radius.button,
                },
                isActive && shadows.brand,
              ]}
              onPress={() => navigation.navigate('CustomerTracking', { orderId: item.id })}
            >
              <Ionicons
                name={isActive ? 'navigate' : 'eye-outline'}
                size={13}
                color={isActive ? colors.onPrimary : isCancelled ? '#991B1B' : '#065F46'}
              />
              <Text style={[
                typography.bodyStrong,
                {
                  color: isActive ? colors.onPrimary : isCancelled ? '#991B1B' : '#065F46',
                  fontSize: 12,
                },
              ]}>
                {isActive ? 'Track Order' : 'Details'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 2,
  },
  accentBar: { width: 4 },
  inner: { flex: 1, padding: 14, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5 },
  shopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderWidth: 0.5,
  },
  shopLogoImg: { width: 40, height: 40 },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 0.5 },
  itemsList: { padding: 10, borderWidth: 0.5 },
  bill: { padding: 10, borderWidth: 0.5, gap: 2 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  divider: { height: 1, marginVertical: 5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  payBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 0.5 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function OrderHistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, radius, shadows } = useTheme();
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <OfflineBar />

      {/* ─ HEADER ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.headingL, { color: colors.textPrimary }]}>My Orders</Text>
        <TouchableOpacity onPress={() => fetchOrders(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ─ LEGEND ──────────────────────────────────────────────────────── */}
      <View style={[styles.legend, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {[
          { color: '#16A34A', label: 'Delivered' },
          { color: '#F97316', label: 'In Progress' },
          { color: '#DC2626', label: 'Cancelled' },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>{item.label}</Text>
          </View>
        ))}
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
              { color: activeTab === tab.key ? colors.primary : colors.textSecondary, fontSize: 14 },
            ]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, {
                backgroundColor: activeTab === tab.key ? colors.primary : colors.surfaceSunken,
                borderRadius: 10,
              }]}>
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
          renderItem={({ item }) => (
            <OrderCard
              item={item}
              colors={colors}
              typography={typography}
              radius={radius}
              shadows={shadows}
              navigation={navigation}
            />
          )}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 56, paddingHorizontal: SPACING.gutter, borderBottomWidth: 1,
  },
  legend: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: SPACING.gutter, paddingVertical: 8, borderBottomWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.gutter, borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, marginRight: SPACING.xxxl,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabBadge: {
    minWidth: 18, height: 18, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  loaderWrap: { padding: SPACING.gutter },
  listContent: { padding: SPACING.gutter, paddingBottom: SPACING.massive, gap: SPACING.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  errorIcon: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  retryBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12 },
});
