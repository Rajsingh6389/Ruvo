import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getShopById, Shop } from '../../services/shopService';
import { getProductsByShop, Product } from '../../services/productService';

const PRIMARY = '#2E7D32';
const PRIMARY_LIGHT = '#E8F5E9';
const BG = '#F7F8FA';
const TEXT = '#1A1A1A';
const SUBTEXT = '#6B7280';
const BORDER = '#EEF0F2';
const BANNER_HEIGHT = 180;

const formatTime = (time?: string) => {
  if (!time) return null;
  const [h, m] = time.split(':');
  const hour = Number(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = ((hour + 11) % 12) + 1;
  return `${displayHour}:${m} ${period}`;
};

export const ShopDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const shopId = route.params?.shopId;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (!shopId) {
      setError('No shop ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([getShopById(shopId), getProductsByShop(shopId)])
      .then(([fetchedShop, fetchedProducts]) => {
        setShop(fetchedShop);
        setProducts(fetchedProducts);
      })
      .catch(err => {
        setError(err?.message || 'Failed to load shop details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shopId]);

  const productCategories = useMemo(() => {
    const seen = new Set<string>();
    products.forEach(p => p.category && seen.add(p.category));
    return ['All', ...Array.from(seen).sort()];
  }, [products]);

  const visibleProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== 'All') {
      list = list.filter(p => p.category === activeCategory);
    }
    const query = searchText.trim().toLowerCase();
    if (query) {
      list = list.filter(
        p =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query),
      );
    }
    return list;
  }, [products, activeCategory, searchText]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (error || !shop) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF5350" style={{ marginBottom: 12 }} />
        <Text style={styles.errorText}>{error || 'Shop not found'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const openTime = formatTime(shop.openingTime as unknown as string);
  const closeTime = formatTime(shop.closingTime as unknown as string);

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
      ) : (
        <View style={styles.placeholderImage}>
          <Ionicons name="image-outline" size={22} color="#C7CBD1" />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>ADD</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom'] as any}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={visibleProducts}
        keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="basket-outline" size={40} color="#C7CBD1" />
            <Text style={styles.emptyText}>
              {searchText || activeCategory !== 'All'
                ? 'No products match.'
                : 'No products available yet.'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            {/* Banner */}
            <View style={styles.bannerWrap}>
              {shop.bannerUrl ? (
                <Image source={{ uri: shop.bannerUrl }} style={styles.banner} />
              ) : (
                <View style={[styles.banner, styles.bannerFallback]} />
              )}
              <View style={styles.bannerOverlay} />

              <SafeAreaView style={styles.navBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
                  <Ionicons name="arrow-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn}>
                  <Ionicons name="search" size={20} color="#FFF" />
                </TouchableOpacity>
              </SafeAreaView>

              <View style={styles.logoWrap}>
                {shop.logoUrl ? (
                  <Image source={{ uri: shop.logoUrl }} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, styles.logoFallback]}>
                    <Ionicons name="storefront-outline" size={26} color={SUBTEXT} />
                  </View>
                )}
              </View>
            </View>

            {/* Shop info card */}
            <View style={styles.infoCard}>
              <View style={styles.infoTitleRow}>
                <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                {shop.approved === false && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                )}
              </View>
              {shop.category ? <Text style={styles.shopCategory}>{shop.category}</Text> : null}

              <View style={styles.badgeRow}>
                {typeof shop.rating === 'number' && (
                  <View style={styles.badge}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.badgeText}>{shop.rating.toFixed(1)}</Text>
                  </View>
                )}
                {shop.deliveryAvailable && (
                  <View style={styles.badge}>
                    <Ionicons name="bicycle-outline" size={13} color={PRIMARY} />
                    <Text style={[styles.badgeText, { color: PRIMARY }]}>Delivery</Text>
                  </View>
                )}
                {openTime && closeTime && (
                  <View style={styles.badge}>
                    <Ionicons name="time-outline" size={13} color={SUBTEXT} />
                    <Text style={styles.badgeText}>{openTime} - {closeTime}</Text>
                  </View>
                )}
              </View>

              {shop.address ? (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color={SUBTEXT} />
                  <Text style={styles.shopAddress} numberOfLines={2}>{shop.address}</Text>
                </View>
              ) : null}

              {shop.phone ? (
                <View style={styles.addressRow}>
                  <Ionicons name="call-outline" size={14} color={SUBTEXT} />
                  <Text style={styles.shopAddress}>{shop.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={SUBTEXT} />
              <Text style={styles.searchInput}>
                {/* Kept as a lightweight display-only bar; wire to a real
                    TextInput component if you want live search typing. */}
                {searchText || 'Search products'}
              </Text>
            </View>

            {/* Product category chips */}
            {productCategories.length > 1 && (
              <FlatList
                data={productCategories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={c => c}
                contentContainerStyle={styles.chipRow}
                renderItem={({ item: category }) => {
                  const active = category === activeCategory;
                  return (
                    <TouchableOpacity
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setActiveCategory(category)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <Text style={styles.sectionTitle}>
              {activeCategory === 'All' ? 'All Products' : activeCategory}
              <Text style={styles.sectionCount}>  ({visibleProducts.length})</Text>
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG, padding: 24 },
  errorText: { color: '#EF5350', fontSize: 16, marginBottom: 16, fontWeight: '600', textAlign: 'center' },
  backBtn: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 },
  backBtnText: { color: '#FFF', fontWeight: '700' },

  bannerWrap: { height: BANNER_HEIGHT, backgroundColor: '#DDD' },
  banner: { width: '100%', height: '100%' },
  bannerFallback: { backgroundColor: PRIMARY_LIGHT },
  bannerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  navBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoWrap: {
    position: 'absolute', bottom: -28, left: 16,
    width: 68, height: 68, borderRadius: 16,
    backgroundColor: '#FFF', padding: 3,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  logo: { width: '100%', height: '100%', borderRadius: 13 },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  infoCard: {
    backgroundColor: '#FFF',
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shopName: { fontSize: 21, fontWeight: '800', color: TEXT, flexShrink: 1 },
  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pendingText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  shopCategory: { fontSize: 13, color: SUBTEXT, marginTop: 2, fontWeight: '600' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BG, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: TEXT },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  shopAddress: { fontSize: 13, color: SUBTEXT, lineHeight: 18, flex: 1 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  searchInput: { fontSize: 14, color: SUBTEXT, flex: 1 },

  chipRow: { gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: BORDER,
  },
  chipActive: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '600', color: SUBTEXT },
  chipTextActive: { color: PRIMARY },

  sectionTitle: {
    fontSize: 17, fontWeight: '800', color: TEXT,
    paddingHorizontal: 16, marginTop: 18, marginBottom: 10,
  },
  sectionCount: { fontSize: 13, fontWeight: '500', color: SUBTEXT },

  list: { paddingBottom: 32 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: SUBTEXT, fontSize: 14 },

  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  productImage: { width: 84, height: 84, borderRadius: 12, backgroundColor: BG },
  placeholderImage: {
    width: 84, height: 84, borderRadius: 12,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  productInfo: { flex: 1, paddingLeft: 12, justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  productDesc: { fontSize: 12, color: SUBTEXT, lineHeight: 16, marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 16, fontWeight: '800', color: TEXT },
  addBtn: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  addBtnText: { color: PRIMARY, fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
});