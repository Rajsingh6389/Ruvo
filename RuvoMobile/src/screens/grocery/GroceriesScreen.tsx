import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../constants/routes';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { getNearbyShops, getShops } from '../../services/shopService';
import { getProductsByShop } from '../../services/productService';
import type { Product } from '../../services/productService';
import { formatDistance, getDistanceInKm } from '../../utils/distanceUtils';
import type { Shop } from '../../types';
import type { RootStackParamList } from '../../types/navigation';
import { sw, sh, sf } from '../../utils/responsive';

// ─── Design Tokens ──────────────────────────────────────────
const PRIMARY = '#FF8A00';
const PRIMARY_LIGHT = 'rgba(255, 138, 0, 0.15)';

// ─── Helper: Dynamic Icon Resolver for Backend Categories ────
const getCategoryIcon = (catName: string): string => {
  const lower = catName.toLowerCase();
  if (lower.includes('veg') || lower.includes('fruit')) return 'leaf-outline';
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('egg')) return 'nutrition-outline';
  if (lower.includes('snack') || lower.includes('munch')) return 'pizza-outline';
  if (lower.includes('drink') || lower.includes('beverage')) return 'beer-outline';
  if (lower.includes('bakery') || lower.includes('bread')) return 'cafe-outline';
  if (lower.includes('grocery') || lower.includes('store')) return 'storefront-outline';
  return 'grid-outline';
};

// ─── Sub-Component: Product Item with Interactive Quantity Counter ────
const GroceryProductCard = React.memo(({ product }: { product: Product }) => {
  const { colors } = useTheme();
  const { addToCart, updateQuantity, getQuantity } = useCart();
  const qty = getQuantity(product.id);

  return (
    <View style={[prodStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[prodStyles.imageWrap, { backgroundColor: colors.surface }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={prodStyles.image} resizeMode="cover" />
        ) : (
          <Ionicons name="basket-outline" size={28} color={colors.textSecondary} />
        )}
        {product.actualPrice > product.sellingPrice && (
          <View style={prodStyles.discountBadge}>
            <Text style={prodStyles.discountText}>
              {Math.round(((product.actualPrice - product.sellingPrice) / product.actualPrice) * 100)}% OFF
            </Text>
          </View>
        )}
      </View>

      <Text style={[prodStyles.name, { color: colors.textPrimary }]} numberOfLines={2}>{product.name}</Text>
      {product.unit ? <Text style={[prodStyles.unit, { color: colors.textSecondary }]}>{product.unit}</Text> : null}

      <View style={prodStyles.bottomRow}>
        <View style={prodStyles.priceWrap}>
          <Text style={[prodStyles.price, { color: colors.textPrimary }]}>₹{product.sellingPrice}</Text>
          {product.actualPrice > product.sellingPrice && (
            <Text style={[prodStyles.strikePrice, { color: colors.textSecondary }]}>₹{product.actualPrice}</Text>
          )}
        </View>

        {/* Quantity Counter Control */}
        {qty === 0 ? (
          <TouchableOpacity
            style={prodStyles.addBtn}
            activeOpacity={0.8}
            onPress={() => addToCart(product, 1)}
          >
            <Text style={prodStyles.addBtnText}>ADD</Text>
          </TouchableOpacity>
        ) : (
          <View style={prodStyles.counterContainer}>
            <TouchableOpacity
              style={prodStyles.counterBtn}
              onPress={() => product.id && updateQuantity(product.id, qty - 1)}
            >
              <Ionicons name="remove" size={14} color={PRIMARY} />
            </TouchableOpacity>
            <Text style={prodStyles.counterValue}>{qty}</Text>
            <TouchableOpacity
              style={prodStyles.counterBtn}
              onPress={() => product.id && updateQuantity(product.id, qty + 1)}
            >
              <Ionicons name="add" size={14} color={PRIMARY} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

// ─── Sub-Component: Shop Section with Horizontal Products ───
const ShopSection = React.memo(({
  shop,
  distance,
  onViewStore,
}: {
  shop: Shop;
  distance: string | null;
  onViewStore: () => void;
}) => {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    getProductsByShop(shop.id)
      .then(data => { if (mounted.current) setProducts(data.filter(p => p.isAvailable !== false).slice(0, 10)); })
      .catch(() => {})
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [shop.id]);

  return (
    <View style={[secStyles.wrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {/* Store Header Card */}
      <TouchableOpacity style={secStyles.storeHeader} onPress={onViewStore} activeOpacity={0.9}>
        <View style={[secStyles.storeImageWrap, { borderColor: colors.border }]}>
          {shop.bannerUrl || shop.logoUrl ? (
            <Image
              source={{ uri: shop.bannerUrl ?? shop.logoUrl! }}
              style={secStyles.storeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={secStyles.storePlaceholder}>
              <Ionicons name="storefront-outline" size={24} color={PRIMARY} />
            </View>
          )}
        </View>

        <View style={secStyles.storeInfo}>
          <View style={secStyles.nameRow}>
            <Text style={[secStyles.storeName, { color: colors.textPrimary }]} numberOfLines={1}>{shop.name}</Text>
            {(shop as any).active === false ? (
              <View style={[secStyles.expressBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                <Ionicons name="lock-closed" size={10} color="#DC2626" />
                <Text style={[secStyles.expressText, { color: '#DC2626' }]}>CLOSED</Text>
              </View>
            ) : (
              <View style={secStyles.expressBadge}>
                <Ionicons name="flash" size={10} color="#15803D" />
                <Text style={secStyles.expressText}>EXPRESS</Text>
              </View>
            )}
          </View>

          <View style={secStyles.metaRow}>
            {shop.rating != null && (
              <View style={secStyles.ratingBadge}>
                <Ionicons name="star" size={10} color="#FFFFFF" />
                <Text style={secStyles.ratingText}>{shop.rating.toFixed(1)}</Text>
              </View>
            )}
            <Text style={[secStyles.metaText, { color: colors.textSecondary }]}>Fast Local Delivery</Text>
            {distance && (
              <>
                <Text style={[secStyles.metaDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[secStyles.metaText, { color: colors.textSecondary }]}>{distance}</Text>
              </>
            )}
          </View>
        </View>

        <View style={secStyles.viewBtn}>
          <Text style={secStyles.viewBtnText}>Shop</Text>
          <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
        </View>
      </TouchableOpacity>

      {/* Horizontal Inventory Scroll */}
      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginVertical: 20 }} />
      ) : products.length === 0 ? (
        <Text style={[secStyles.noItems, { color: colors.textSecondary }]}>No items listed yet</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={secStyles.productsRow}
        >
          {products.map(p => <GroceryProductCard key={p.id} product={p} />)}
        </ScrollView>
      )}
    </View>
  );
});

// ─── Main Screen ─────────────────────────────────────────────
export const GroceriesScreen = () => {
  const { colors, theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { location, isLoading: locationLoading, refreshFromGps } = useDeliveryLocation();
  const { cartCount, cartTotal } = useCart();

  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Shops');
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const loadShops = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      let fetched: Shop[] = [];
      if (location) {
        fetched = await getNearbyShops(location.latitude, location.longitude, 10);
      }
      if (!fetched || fetched.length === 0) {
        fetched = await getShops();
      }
      setShops(fetched || []);
    } catch (e) {
      console.warn('Failed to fetch shops in GroceriesScreen', e);
      try {
        const fallback = await getShops();
        setShops(fallback || []);
      } catch {}
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [location]);

  useFocusEffect(useCallback(() => { loadShops(); }, [loadShops]));

  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    shops.forEach(s => {
      if (s.category && s.category.trim()) {
        set.add(s.category.trim());
      }
    });
    const list = Array.from(set).map(catName => ({
      id: catName.toLowerCase(),
      name: catName,
      icon: getCategoryIcon(catName),
    }));
    return [{ id: 'all', name: 'All Shops', icon: 'storefront-outline' }, ...list];
  }, [shops]);

  const filteredShops = useMemo(() => {
    let result = activeCategory === 'All Shops'
      ? shops
      : shops.filter(s => s.category?.toLowerCase().includes(activeCategory.toLowerCase()));

    if (searchQuery.trim()) {
      result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    let list = [...result];
    list.sort((a, b) => {
      const aActive = (a as any).active !== false ? 1 : 0;
      const bActive = (b as any).active !== false ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      if (!location) return 0;
      const da = getDistanceInKm(location, a) ?? Infinity;
      const db = getDistanceInKm(location, b) ?? Infinity;
      return da - db;
    });
    return list;
  }, [activeCategory, location, searchQuery, shops]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.surface} barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── Header Bar ────────────────────────────────────────── */}
      <View style={[styles.topBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.locationWrap, { backgroundColor: colors.background }]}
          onPress={() => setLocationPickerVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="location-sharp" size={16} color={PRIMARY} />
          <View style={styles.locationTextWrap}>
            <Text style={[styles.deliverLabel, { color: colors.textSecondary }]}>DELIVERING TO</Text>
            <Text style={[styles.locationValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {locationLoading ? 'Locating...' : getDeliveryLocationLabel(location)}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ───────────────────────────────────────── */}
      <View style={[styles.searchBarContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.background }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search groceries & stores near you..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Sub-Category Quick Icons ──────────────────────────── */}
      <View style={[styles.chipScrollWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {dynamicCategories.map(cat => {
            const active = cat.name === activeCategory;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  { backgroundColor: active ? PRIMARY : colors.card, borderColor: active ? PRIMARY : colors.border }
                ]}
                onPress={() => setActiveCategory(cat.name)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={active ? '#FFFFFF' : colors.textPrimary}
                />
                <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.textPrimary }]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Shop List Content ─────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
      ) : filteredShops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="storefront-outline" size={38} color="#FF8A00" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {searchQuery || activeCategory !== 'All Shops'
              ? 'No Stores Match Your Filter'
              : 'No Nearby Grocery Stores Registered'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchQuery || activeCategory !== 'All Shops'
              ? `We couldn't find any store for "${searchQuery || activeCategory}". Try searching for all stores.`
              : 'Be the first store owner to register and start selling groceries in your area!'}
          </Text>

          {searchQuery || activeCategory !== 'All Shops' ? (
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => {
                setSearchQuery('');
                setActiveCategory('All Shops');
              }}
            >
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
              <Text style={styles.resetFilterText}>Show All Available Stores</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.registerShopBtn}
              onPress={() => (navigation.navigate as any)(ROUTES.REGISTER_SHOP)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.registerShopText}>Register Your Store Now</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { loadShops(true); refreshFromGps(); }}
              tintColor={PRIMARY}
            />
          }
        >
          {filteredShops.map(shop => {
            const dist = location ? getDistanceInKm(location, shop) : null;
            return (
              <ShopSection
                key={shop.id}
                shop={shop}
                distance={formatDistance(dist)}
                onViewStore={() =>
                  (navigation.navigate as any)(ROUTES.SHOP_DETAILS, { shopId: Number(shop.id) })
                }
              />
            );
          })}

          <View style={{ height: cartCount > 0 ? 90 : 30 }} />
        </ScrollView>
      )}

      {/* ── Sticky Bottom Floating Cart Bar ───────────────────── */}
      {cartCount > 0 && (
        <View style={styles.floatingCartBar}>
          <TouchableOpacity
            style={styles.cartBarContent}
            activeOpacity={0.9}
            onPress={() => (navigation.navigate as any)(ROUTES.MAIN_TABS, { screen: ROUTES.CART })}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{cartCount}</Text>
              </View>
              <Text style={styles.cartTotalText}>View Cart</Text>
            </View>

            <View style={styles.cartBarRight}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

// ─── Product Card Styles ──────────────────────────────────────
const prodStyles = StyleSheet.create({
  card: {
    width: 140,
    borderRadius: 16,
    padding: 10,
    marginRight: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  imageWrap: {
    height: 90,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  discountBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },
  name: { fontSize: 12, fontWeight: '700', minHeight: 32 },
  unit: { fontSize: 10, marginBottom: 6 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceWrap: { flexDirection: 'column' },
  price: { fontSize: 13, fontWeight: '900' },
  strikePrice: { fontSize: 9, textDecorationLine: 'line-through' },
  addBtn: {
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  addBtnText: { fontSize: 11, fontWeight: '900', color: PRIMARY },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  counterBtn: { padding: 2 },
  counterValue: { fontSize: 11, fontWeight: '900', color: PRIMARY },
});

// ─── Shop Section Styles ──────────────────────────────────────
const secStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  storeImageWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  storeImage: { width: '100%', height: '100%' },
  storePlaceholder: {
    flex: 1,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 15, fontWeight: '800' },
  expressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  expressText: { fontSize: 8, fontWeight: '900', color: '#15803D' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  ratingText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  metaText: { fontSize: 11 },
  metaDot: { fontSize: 10 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewBtnText: { fontSize: 12, fontWeight: '800', color: PRIMARY },
  productsRow: { paddingLeft: 16, paddingRight: 8 },
  noItems: { fontSize: 12, paddingHorizontal: 16 },
});

// ─── Main Screen Styles ───────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: { padding: 4 },
  locationWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  locationTextWrap: { flex: 1 },
  deliverLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  locationValue: { fontSize: 12, fontWeight: '800' },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  chipScrollWrap: { borderBottomWidth: 1 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingTop: 8 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  resetFilterText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  registerShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  registerShopText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  floatingCartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  cartBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartCountBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  cartTotalText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  cartSubText: { fontSize: 9, color: 'rgba(255, 255, 255, 0.8)' },
  cartBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewCartText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
});

export default GroceriesScreen;
