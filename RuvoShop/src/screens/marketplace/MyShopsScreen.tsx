import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyShops, Shop } from '../../services/shopService';
import { API_BASE_URL } from '../../config/api';
import { ROUTES } from '../../constants/routes';

// ── Image resolution ────────────────────────────────────────────────────────
function resolveImage(url?: string): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const MyShopsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, typography, radius, shadows, spacing } = useTheme();
  const { user, userId, token, logout } = useAuth();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');

  const loadShops = async (isRefresh = false) => {
    const ownerId = userId || user?.id;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    if (ownerId && token) {
      try {
        setShops(await getMyShops(String(ownerId), token));
      } catch (err: any) {
        setError(err.message || 'Failed to load your shops');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    } else {
      setError('User not authenticated properly');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadShops(); }, [userId, user, token]);

  const approvedCount = useMemo(() => shops.filter(s => Boolean(s.approved)).length, [shops]);
  const pendingCount  = useMemo(() => shops.filter(s => !s.approved).length,         [shops]);

  const filteredShops = useMemo(() => shops.filter(s => {
    const matchSearch =
      !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s as any).category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s as any).address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter =
      activeFilter === 'ALL' ? true :
      activeFilter === 'APPROVED' ? Boolean(s.approved) : !s.approved;
    return matchSearch && matchFilter;
  }), [shops, searchQuery, activeFilter]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.loadWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.loadIcon, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
          <Ionicons name="storefront" size={32} color={colors.onPrimary} />
        </View>
        <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 16 }]}>Loading your shops</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>Please wait...</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  // ── Shop Card ────────────────────────────────────────────────────────────
  const renderShop = ({ item }: { item: Shop }) => {
    const shopData = item as Shop & { category?: string; address?: string; phone?: string };
    const approved = Boolean(item.approved);
    const thumbUri = resolveImage(item.logoUrl || item.bannerUrl || (item as any).imageUrl);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate(ROUTES.SHOPKEEPER_DASHBOARD, { shopId: item.id, shopName: item.name })}
        style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.md]}
      >
        {/* Status stripe */}
        <View style={[styles.stripe, { backgroundColor: approved ? colors.success : '#F97316' }]} />

        <View style={styles.cardRow}>
          {/* Thumbnail */}
          <View style={[styles.thumbBox, { backgroundColor: colors.primarySoft, borderRadius: radius.md }]}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={styles.thumbImg} resizeMode="cover" />
            ) : (
              <Ionicons name="storefront" size={26} color={colors.primary} />
            )}
          </View>

          {/* Info */}
          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={[typography.headingS, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[
                styles.statusPill,
                { backgroundColor: approved ? colors.successSoft : '#FFEDD5', borderRadius: radius.xs },
              ]}>
                <Ionicons name={approved ? 'checkmark' : 'time-outline'} size={11} color={approved ? colors.success : '#EA580C'} />
                <Text style={[typography.caption, { color: approved ? colors.success : '#C2410C', fontWeight: '700', fontSize: 10 }]}>
                  {approved ? 'Approved' : 'Pending'}
                </Text>
              </View>
            </View>

            {shopData.category ? (
              <View style={styles.metaRow}>
                <Ionicons name="pricetag-outline" size={12} color={colors.textHint} />
                <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  {shopData.category}
                </Text>
              </View>
            ) : null}

            {shopData.address ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={12} color={colors.textHint} />
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {shopData.address}
                </Text>
              </View>
            ) : null}

            {/* Quick action pills */}
            <View style={styles.actionPills}>
              <TouchableOpacity
                style={[styles.pill, { backgroundColor: colors.primarySoft, borderRadius: radius.xs }]}
                onPress={() => navigation.navigate(ROUTES.MY_PRODUCTS, { shopId: item.id })}
              >
                <Ionicons name="cube-outline" size={11} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: 11 }]}>Products</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pill, { backgroundColor: colors.infoSoft, borderRadius: radius.xs }]}
                onPress={() => navigation.navigate(ROUTES.SHOP_ORDERS, { shopId: item.id, shopName: item.name })}
              >
                <Ionicons name="receipt-outline" size={11} color={colors.info} />
                <Text style={[typography.caption, { color: colors.info, fontWeight: '700', fontSize: 11 }]}>Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pill, { backgroundColor: colors.accentSoft, borderRadius: radius.xs }]}
                onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT, { shopId: item.id })}
              >
                <Ionicons name="add" size={11} color={colors.accent} />
                <Text style={[typography.caption, { color: '#92400E', fontWeight: '700', fontSize: 11 }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft, borderRadius: 40 }]}>
        <Ionicons name="storefront-outline" size={44} color={colors.primary} />
      </View>
      <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 20 }]}>
        {searchQuery ? 'No results found' : 'No shops yet'}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 }]}>
        {searchQuery
          ? 'Try a different search term'
          : 'Register your local shop on RuVo to start managing products and orders.'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={[styles.registerBtn, { backgroundColor: colors.primary, borderRadius: radius.button }, shadows.md]}
          onPress={() => navigation.navigate(ROUTES.REGISTER_SHOP)}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.onPrimary} />
          <Text style={[typography.button, { color: colors.onPrimary }]}>Register New Shop</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Screen ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surfaceSunken, borderRadius: radius.sm }]}
          onPress={logout}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.brandSquare, { backgroundColor: colors.primarySoft, borderRadius: radius.sm }]}>
            <Ionicons name="storefront" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[typography.headingM, { color: colors.textPrimary }]}>My Shops</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Manage your shops</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surfaceSunken, borderRadius: radius.sm }]}
          onPress={() => loadShops(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search + filter */}
      <View style={[styles.searchRow, { paddingHorizontal: spacing.gutter }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.input }]}>
          <Ionicons name="search-outline" size={17} color={colors.textHint} />
          <TextInput
            placeholder="Search shops..."
            placeholderTextColor={colors.placeholder}
            style={[typography.body, { flex: 1, color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textHint} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.input }]}
          onPress={() => {
            if (activeFilter === 'ALL') setActiveFilter('APPROVED');
            else if (activeFilter === 'APPROVED') setActiveFilter('PENDING');
            else setActiveFilter('ALL');
          }}
        >
          <Ionicons name="options-outline" size={16} color={colors.textPrimary} />
          <Text style={[typography.headingS, { color: colors.textPrimary, fontSize: 12 }]}>
            {activeFilter === 'ALL' ? 'All' : activeFilter}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { paddingHorizontal: spacing.gutter }]}>
        {([
          { key: 'ALL' as const,      label: 'Total',    count: shops.length,  icon: 'storefront-outline',        bg: colors.primarySoft, fg: colors.primary  },
          { key: 'APPROVED' as const, label: 'Approved', count: approvedCount, icon: 'checkmark-circle-outline',  bg: colors.successSoft, fg: colors.success  },
          { key: 'PENDING' as const,  label: 'Pending',  count: pendingCount,  icon: 'time-outline',              bg: '#FFEDD5',          fg: '#EA580C'       },
        ] as const).map(stat => (
          <TouchableOpacity
            key={stat.key}
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: activeFilter === stat.key ? colors.primary : colors.border, borderRadius: radius.card },
              shadows.sm,
              activeFilter === stat.key && { borderWidth: 1.5 },
            ]}
            onPress={() => setActiveFilter(stat.key)}
          >
            <View style={[styles.statIcon, { backgroundColor: stat.bg, borderRadius: radius.xs }]}>
              <Ionicons name={stat.icon} size={16} color={stat.fg} />
            </View>
            <Text style={[typography.headingS, { color: colors.textPrimary }]}>{stat.count}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, marginTop: 1 }]}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error banner */}
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.errorSoft, borderRadius: radius.md, marginHorizontal: spacing.gutter }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={[typography.caption, { color: colors.error, flex: 1 }]}>{error}</Text>
        </View>
      ) : null}

      {/* List */}
      <FlatList
        data={filteredShops}
        keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderShop}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadShops(true)} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: spacing.gutter }]}
        ListEmptyComponent={EmptyState}
      />

    </SafeAreaView>
  );
};

export default MyShopsScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandSquare: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  searchRow: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  searchBox: {
    flex: 1, height: 44, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8, borderWidth: 1,
  },
  filterBtn: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 6, borderWidth: 1,
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1, alignItems: 'center', padding: 10, borderWidth: 1,
  },
  statIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, marginBottom: 8,
  },

  listContent: { paddingBottom: 90 },

  shopCard: {
    marginBottom: 12, borderWidth: 1, overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingRight: 14, paddingLeft: 16, gap: 12,
  },
  thumbBox: {
    width: 52, height: 52, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  infoCol: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionPills: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },

  emptyWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, marginTop: 20,
  },

  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
  },
});
