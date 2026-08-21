import React, { useEffect, useState, useMemo } from 'react';
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
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyShops, Shop } from '../../services/shopService';
import { API_BASE_URL } from '../../config/api';
import { ROUTES } from '../../constants/routes';

// Sample fallback store image per category
const CATEGORY_THUMBNAILS: Record<string, string> = {
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  fashion: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80',
  food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
  electronics: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80',
  default: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80',
};

const CATEGORY_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  grocery: { name: 'bag-handle', color: '#059669', bg: '#DCFCE7' },
  fashion: { name: 'diamond', color: '#D97706', bg: '#FEF3C7' },
  food: { name: 'restaurant', color: '#16A34A', bg: '#DCFCE7' },
  electronics: { name: 'hardware-chip', color: '#EA580C', bg: '#FFEDD5' },
  default: { name: 'storefront', color: '#059669', bg: '#DCFCE7' },
};

function getCategoryMeta(cat?: string) {
  if (!cat) return CATEGORY_ICONS.default;
  const lower = cat.toLowerCase();
  if (lower.includes('groc') || lower.includes('essential')) return CATEGORY_ICONS.grocery;
  if (lower.includes('fash') || lower.includes('cloth')) return CATEGORY_ICONS.fashion;
  if (lower.includes('food') || lower.includes('bata') || lower.includes('bite') || lower.includes('rest')) return CATEGORY_ICONS.food;
  if (lower.includes('electr') || lower.includes('tech') || lower.includes('gadg')) return CATEGORY_ICONS.electronics;
  return CATEGORY_ICONS.default;
}

function getCategoryThumbnail(cat?: string, shopImg?: string, bannerImg?: string): string {
  if (shopImg) {
    return shopImg.startsWith('http') ? shopImg : `${API_BASE_URL}${shopImg.startsWith('/') ? '' : '/'}${shopImg}`;
  }
  if (bannerImg) {
    return bannerImg.startsWith('http') ? bannerImg : `${API_BASE_URL}${bannerImg.startsWith('/') ? '' : '/'}${bannerImg}`;
  }
  if (!cat) return CATEGORY_THUMBNAILS.default;
  const lower = cat.toLowerCase();
  if (lower.includes('groc')) return CATEGORY_THUMBNAILS.grocery;
  if (lower.includes('fash') || lower.includes('cloth')) return CATEGORY_THUMBNAILS.fashion;
  if (lower.includes('food') || lower.includes('bite')) return CATEGORY_THUMBNAILS.food;
  if (lower.includes('electr')) return CATEGORY_THUMBNAILS.electronics;
  return CATEGORY_THUMBNAILS.default;
}

export const MyShopsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
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

  useEffect(() => {
    loadShops();
  }, [userId, user, token]);

  // Calculations for stats
  const approvedCount = useMemo(() => shops.filter(s => Boolean(s.approved)).length, [shops]);
  const pendingCount = useMemo(() => shops.filter(s => !s.approved).length, [shops]);

  // Filtered shops
  const filteredShops = useMemo(() => {
    return shops.filter(s => {
      const matchSearch =
        !searchQuery ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s as any).category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s as any).address?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchFilter =
        activeFilter === 'ALL'
          ? true
          : activeFilter === 'APPROVED'
          ? Boolean(s.approved)
          : !s.approved;

      return matchSearch && matchFilter;
    });
  }, [shops, searchQuery, activeFilter]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="storefront" size={32} color="#FFFFFF" />
        </View>
        <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>Loading your shops</Text>
        <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>Please wait...</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  /* -------------------------------------------------------
     SHOP CARD ITEM (Matches visual mock accurately)
  ------------------------------------------------------- */
  const renderShop = ({ item }: { item: Shop }) => {
    const shopData = item as Shop & {
      category?: string;
      address?: string;
      phone?: string;
      mobile?: string;
      contactNumber?: string;
    };

    const category = shopData.category || 'General Store';
    const address = shopData.address || 'Location on file';
    const phone = shopData.phone || shopData.mobile || shopData.contactNumber || '+91 98765 43210';
    const approved = Boolean(item.approved);

    const meta = getCategoryMeta(category);
    const thumbUri = getCategoryThumbnail(category, item.imageUrl || item.logoUrl, item.bannerUrl);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate(ROUTES.SHOPKEEPER_DASHBOARD, {
            shopId: item.id,
            shopName: item.name,
          })
        }
        style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Left vertical status indicator strip */}
        <View
          style={[
            styles.accentStrip,
            { backgroundColor: approved ? '#059669' : '#F97316' },
          ]}
        />

        <View style={styles.cardContentRow}>
          {/* Left Shop Icon Box */}
          <View style={[styles.shopIconSquare, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.name} size={28} color={meta.color} />
          </View>

          {/* Middle Info */}
          <View style={styles.shopInfoCol}>
            {/* Title & Status Pill */}
            <View style={styles.titleStatusRow}>
              <Text style={[styles.shopName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: approved ? '#DCFCE7' : '#FFEDD5' },
                ]}
              >
                <Ionicons
                  name={approved ? 'checkmark' : 'time-outline'}
                  size={12}
                  color={approved ? '#16A34A' : '#EA580C'}
                />
                <Text style={[styles.statusPillText, { color: approved ? '#15803D' : '#C2410C' }]}>
                  {approved ? 'Approved' : 'Pending Approval'}
                </Text>
              </View>
            </View>

            {/* Category */}
            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={13} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>
                {category}
              </Text>
            </View>

            {/* Address */}
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>
                {address}
              </Text>
            </View>

            {/* Phone */}
            <View style={styles.metaRow}>
              <Ionicons name="call-outline" size={13} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>
                {phone}
              </Text>
            </View>

            {/* Quick Action buttons */}
            <View style={styles.cardActionBtnRow}>
              <TouchableOpacity
                style={styles.cardSubBtn}
                onPress={() => navigation.navigate(ROUTES.MY_PRODUCTS, { shopId: item.id })}
              >
                <Ionicons name="cube-outline" size={12} color="#059669" />
                <Text style={styles.cardSubBtnText}>Products</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cardSubBtn, { backgroundColor: '#F3E8FF' }]}
                onPress={() => navigation.navigate(ROUTES.SHOP_ORDERS, { shopId: item.id, shopName: item.name })}
              >
                <Ionicons name="receipt-outline" size={12} color="#7E22CE" />
                <Text style={[styles.cardSubBtnText, { color: '#7E22CE' }]}>Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cardSubBtn, { backgroundColor: '#EFF6FF' }]}
                onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT, { shopId: item.id })}
              >
                <Ionicons name="add" size={12} color="#2563EB" />
                <Text style={[styles.cardSubBtnText, { color: '#2563EB' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Preview Thumbnail & Chevron */}
          <View style={styles.rightThumbCol}>
            <Image source={{ uri: thumbUri }} style={styles.shopThumbImg} resizeMode="cover" />
            <View style={[styles.arrowPillBtn, { backgroundColor: approved ? '#F0FDF4' : '#FFF7ED' }]}>
              <Ionicons name="chevron-forward" size={18} color={approved ? '#059669' : '#EA580C'} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* -------------------------------------------------------
     EMPTY STATE
  ------------------------------------------------------- */
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBox, { backgroundColor: '#DCFCE7' }]}>
        <Ionicons name="storefront-outline" size={44} color="#059669" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No shops found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery ? 'No shops match your search parameters.' : 'Register your local shop on RuVo to start managing products and orders.'}
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.registerButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate(ROUTES.REGISTER_SHOP)}
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.registerButtonText}>Register New Shop</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* HEADER BAR */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.iconCircleBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#475569" />
        </TouchableOpacity>

        <View style={styles.headerBrandContainer}>
          <View style={styles.brandLogoSquare}>
            <Ionicons name="storefront" size={22} color="#059669" />
          </View>
          <View>
            <Text style={styles.headerTitleText}>My Shops</Text>
            <Text style={styles.headerSubtitleText}>Manage and view all your shops</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.iconCircleBtn}
          onPress={() => loadShops(true)}
        >
          <Ionicons name="notifications-outline" size={22} color="#334155" />
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* SEARCH AND FILTER BAR */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search your shops..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            if (activeFilter === 'ALL') setActiveFilter('APPROVED');
            else if (activeFilter === 'APPROVED') setActiveFilter('PENDING');
            else setActiveFilter('ALL');
          }}
        >
          <Ionicons name="options-outline" size={16} color="#334155" />
          <Text style={styles.filterBtnText}>
            {activeFilter === 'ALL' ? 'Filter' : activeFilter}
          </Text>
        </TouchableOpacity>
      </View>

      {/* STATS SUMMARY ROW (4 Cards matching mockup) */}
      <View style={styles.statsRow}>
        {/* Stat 1: Total Shops */}
        <TouchableOpacity
          style={[styles.statCard, activeFilter === 'ALL' && styles.statCardActive]}
          onPress={() => setActiveFilter('ALL')}
        >
          <View style={[styles.statIconSquare, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="storefront-outline" size={18} color="#059669" />
          </View>
          <Text style={styles.statNumber}>{shops.length}</Text>
          <Text style={styles.statLabel}>Total Shops</Text>
        </TouchableOpacity>

        {/* Stat 2: Approved */}
        <TouchableOpacity
          style={[styles.statCard, activeFilter === 'APPROVED' && styles.statCardActive]}
          onPress={() => setActiveFilter('APPROVED')}
        >
          <View style={[styles.statIconSquare, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
          </View>
          <Text style={styles.statNumber}>{approvedCount}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </TouchableOpacity>

        {/* Stat 3: Pending */}
        <TouchableOpacity
          style={[styles.statCard, activeFilter === 'PENDING' && styles.statCardActive]}
          onPress={() => setActiveFilter('PENDING')}
        >
          <View style={[styles.statIconSquare, { backgroundColor: '#FFEDD5' }]}>
            <Ionicons name="time-outline" size={18} color="#EA580C" />
          </View>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>

        {/* Stat 4: Total Views */}
        <View style={styles.statCard}>
          <View style={[styles.statIconSquare, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="eye-outline" size={18} color="#2563EB" />
          </View>
          <Text style={styles.statNumber}>2.5K</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>
      </View>

      {/* ERROR MSG IF ANY */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* MAIN SHOPS LIST */}
      <FlatList
        data={filteredShops}
        keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderShop}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShops(true)}
            tintColor="#059669"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={EmptyState}
        ListFooterComponent={
          filteredShops.length > 0 ? (
            /* BOTTOM INFO BANNER MATCHING MOCKUP */
            <View style={styles.bottomInfoBanner}>
              <View style={styles.bottomInfoIconSquare}>
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bottomInfoTitle}>Approved shops are visible to customers.</Text>
                <Text style={styles.bottomInfoSub}>Pending shops will be reviewed by our team.</Text>
              </View>
              <Ionicons name="storefront-outline" size={32} color="#A7F3D0" />
            </View>
          ) : null
        }
      />

      {/* FLOATING ACTION BUTTON (ADD SHOP) */}
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.fabContainer}
        onPress={() => navigation.navigate(ROUTES.REGISTER_SHOP)}
      >
        <View style={styles.fabBtn}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.fabText}>Add Shop</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: { fontSize: 17, fontWeight: '700', marginTop: 14 },
  loadingSubtitle: { fontSize: 13, marginTop: 4 },

  /* Top Header */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#059669',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSubtitleText: { fontSize: 12, color: '#64748B' },

  /* Search & Filter Row */
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  filterBtn: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 6,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  /* Stats Grid */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  statIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 10, color: '#64748B', fontWeight: '500', marginTop: 2 },

  /* List */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },

  /* Shop Card */
  shopCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardContentRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 16,
    gap: 12,
    alignItems: 'center',
  },
  shopIconSquare: {
    width: 54,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfoCol: { flex: 1, gap: 3 },
  titleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  shopName: { fontSize: 16, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#64748B', flexShrink: 1 },

  cardActionBtnRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  cardSubBtn: {
    backgroundColor: '#DCFCE7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  cardSubBtnText: { fontSize: 10.5, fontWeight: '700', color: '#059669' },

  rightThumbCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 90,
  },
  shopThumbImg: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  arrowPillBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Bottom Banner */
  bottomInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 10,
  },
  bottomInfoIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomInfoTitle: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  bottomInfoSub: { fontSize: 11, color: '#047857', marginTop: 1 },

  /* FAB */
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'center',
  },
  fabBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 11, fontWeight: '700', color: '#059669', marginTop: 4 },

  /* Empty state */
  emptyContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
    gap: 8,
  },
  registerButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  errorBannerText: { color: '#DC2626', fontSize: 12, flex: 1 },
});

export default MyShopsScreen;
