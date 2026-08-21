import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../constants/routes';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getNearbyShops, getShops } from '../../services/shopService';
import { getProductsByShop } from '../../services/productService';
import type { Product } from '../../services/productService';
import { formatDistance, getDistanceInKm } from '../../utils/distanceUtils';
import type { Shop } from '../../types';
import type { RootStackParamList } from '../../types/navigation';
import { sw, sh, sf } from '../../utils/responsive';

// ─── Design tokens ──────────────────────────────────────────
const PRIMARY = '#2E7D32';
const LIGHT_GREEN = '#E8F5E9';
const BG = '#F5F6FA';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 6,
  elevation: 3,
};

// ─── Helper ─────────────────────────────────────────────────
const buildCategoryList = (shops: Shop[]): string[] => {
  const seen = new Set<string>();
  shops.forEach(s => { if (s.category) seen.add(s.category); });
  return ['All Shops', ...Array.from(seen).sort()];
};

// ─── Sub-component: Product card ────────────────────────────
const ProductCard = React.memo(({ product, onAddToCart }: { product: Product; onAddToCart?: (product: Product) => void }) => (
  <View style={prodStyles.card}>
    <View style={prodStyles.imageWrap}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={prodStyles.image} resizeMode="cover" />
      ) : (
        <Text style={{ fontSize: 30 }}>📦</Text>
      )}
    </View>
    <Text style={prodStyles.name} numberOfLines={2}>{product.name}</Text>
    {product.unit ? <Text style={prodStyles.unit}>{product.unit}</Text> : null}
    <View style={prodStyles.priceRow}>
      <Text style={prodStyles.price}>₹{product.sellingPrice}</Text>
      {product.actualPrice > product.sellingPrice && (
        <Text style={prodStyles.strikePrice}>₹{product.actualPrice}</Text>
      )}
    </View>
    <TouchableOpacity
      style={prodStyles.addBtn}
      activeOpacity={0.8}
      onPress={() => onAddToCart && onAddToCart(product)}
    >
      <Text style={prodStyles.addBtnText}>Add</Text>
      <Ionicons name="add" size={14} color={PRIMARY} />
    </TouchableOpacity>
  </View>
));

// ─── Sub-component: Shop section (store card + products) ────
const ShopSection = React.memo(({
  shop,
  distance,
  onViewStore,
  onAddToCart,
}: {
  shop: Shop;
  distance: string | null;
  onViewStore: () => void;
  onAddToCart?: (product: Product) => void;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    getProductsByShop(shop.id)
      .then(data => { if (mounted.current) setProducts(data.filter(p => p.isAvailable !== false && p.imageUrl && p.imageUrl.trim() !== '').slice(0, 8)); })
      .catch(() => {})
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [shop.id]);

  return (
    <View style={secStyles.wrapper}>
      {/* Store card */}
      <View style={secStyles.storeCard}>
        <View style={secStyles.storeLeft}>
          <View style={secStyles.storeImageWrap}>
            {shop.bannerUrl || shop.logoUrl ? (
              <Image
                source={{ uri: shop.bannerUrl ?? shop.logoUrl! }}
                style={secStyles.storeImage}
                resizeMode="cover"
              />
            ) : (
              <View style={secStyles.storePlaceholder}>
                <Ionicons name="storefront-outline" size={28} color={TEXT_SECONDARY} />
              </View>
            )}
          </View>
          <View style={secStyles.storeInfo}>
            <View style={secStyles.storeNameRow}>
              <Text style={secStyles.storeName} numberOfLines={1}>{shop.name}</Text>
              <View style={secStyles.openBadge}>
                <Text style={secStyles.openText}>Open</Text>
              </View>
            </View>
            <View style={secStyles.metaRow}>
              {shop.rating != null && (
                <>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={secStyles.metaText}>{shop.rating.toFixed(1)}</Text>
                  <Text style={secStyles.metaDot}>•</Text>
                </>
              )}
              <Text style={secStyles.metaText}>20–25 mins</Text>
              {distance && (
                <>
                  <Text style={secStyles.metaDot}>•</Text>
                  <Text style={secStyles.metaText}>{distance}</Text>
                </>
              )}
            </View>
            {shop.address ? (
              <Text style={secStyles.addressText} numberOfLines={1}>
                Min. order ₹79 &nbsp;•&nbsp; Free delivery on ₹199
              </Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity style={secStyles.viewStoreBtn} onPress={onViewStore} activeOpacity={0.8}>
          <Text style={secStyles.viewStoreBtnText}>View Store</Text>
        </TouchableOpacity>
      </View>

      {/* Items from this shop */}
      <View style={secStyles.itemsHeader}>
        <Text style={secStyles.itemsTitle}>Items from {shop.name}</Text>
        {products.length > 0 && (
          <TouchableOpacity onPress={onViewStore}>
            <Text style={secStyles.seeAll}>
              See all ({products.length > 7 ? '120' : products.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginVertical: 16, marginLeft: 16 }} />
      ) : products.length === 0 ? (
        <Text style={secStyles.noItems}>No items listed yet</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={secStyles.productsRow}
        >
          {products.map(p => <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />)}
        </ScrollView>
      )}
    </View>
  );
});

// ─── Main screen ────────────────────────────────────────────
export const GroceriesScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { location, isLoading: locationLoading, refreshFromGps } = useDeliveryLocation();
  const { cartCount, addToCart } = useCart();

  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All Shops');
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product, 1);
  }, [addToCart]);

  const loadShops = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      setShops(location
        ? await getNearbyShops(location.latitude, location.longitude, 5)
        : await getShops());
      setLoadError(null);
    } catch {
      setLoadError('Could not load shops. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [location]);

  useFocusEffect(useCallback(() => { loadShops(); }, [loadShops]));

  const categories = useMemo(() => buildCategoryList(shops), [shops]);

  const visibleShops = useMemo(() => {
    let list = activeCategory === 'All Shops'
      ? shops
      : shops.filter(s => s.category === activeCategory);

    if (!location) return list;
    return [...list].sort((a, b) => {
      const da = getDistanceInKm(location, a) ?? Infinity;
      const db = getDistanceInKm(location, b) ?? Infinity;
      return da - db;
    });
  }, [activeCategory, location, shops]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar backgroundColor={WHITE} barStyle="dark-content" />

      {/* ── Top bar ─────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Grocery</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation.navigate(ROUTES.MARKET as never)}>
            <Ionicons name="search-outline" size={22} color={TEXT_DARK} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconBtn}
            onPress={() => navigation.navigate(ROUTES.CART as never)}
          >
            <Ionicons name="bag-outline" size={22} color={TEXT_DARK} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Location bar ────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.locationBar}
        onPress={() => setLocationPickerVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="location-sharp" size={14} color={PRIMARY} />
        <View style={styles.locationTextWrap}>
          <Text style={styles.deliverLabel}>Deliver to</Text>
          <Text style={styles.locationValue} numberOfLines={1}>
            {locationLoading ? 'Fetching location...' : getDeliveryLocationLabel(location)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={14} color={TEXT_SECONDARY} />
      </TouchableOpacity>

      {/* ── Category filter chips ────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {categories.map(cat => {
          const active = cat === activeCategory;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
        {/* Filter button */}
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="filter" size={14} color={TEXT_SECONDARY} />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Content ─────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
      ) : loadError ? (
        <View style={styles.centerMessage}>
          <Ionicons name="cloud-offline-outline" size={44} color={TEXT_SECONDARY} />
          <Text style={styles.centerText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadShops()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : visibleShops.length === 0 ? (
        <View style={styles.centerMessage}>
          <Ionicons name="storefront-outline" size={44} color={TEXT_SECONDARY} />
          <Text style={styles.centerText}>
            {shops.length === 0
              ? 'No shops have been registered yet.'
              : 'No shops in this category.'}
          </Text>
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
          {visibleShops.map(shop => {
            const dist = location ? getDistanceInKm(location, shop) : null;
            const distLabel = formatDistance(dist);
            return (
              <ShopSection
                key={shop.id}
                shop={shop}
                distance={distLabel}
                onViewStore={() =>
                  navigation.navigate(ROUTES.SHOP_DETAILS as never, { shopId: Number(shop.id) })
                }
              />
            );
          })}
          {/* Cart sticky footer placeholder */}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

// ─── Product card styles ─────────────────────────────────────
const prodStyles = StyleSheet.create({
  card: {
    width: sw(114),
    backgroundColor: WHITE,
    borderRadius: sw(12),
    padding: sw(8),
    marginRight: sw(10),
    borderWidth: 1,
    borderColor: BORDER,
    ...CARD_SHADOW,
  },
  imageWrap: {
    height: sh(80),
    borderRadius: sw(8),
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sh(6),
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  name: { fontSize: sf(11.5), fontWeight: '600', color: TEXT_DARK, lineHeight: sf(15), minHeight: sh(30) },
  unit: { fontSize: sf(10), color: TEXT_SECONDARY, marginTop: sh(2) },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: sw(4), marginTop: sh(4) },
  price: { fontSize: sf(13), fontWeight: '800', color: TEXT_DARK },
  strikePrice: { fontSize: sf(10), color: TEXT_SECONDARY, textDecorationLine: 'line-through' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sh(6),
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: sw(8),
    paddingVertical: sh(5),
    gap: sw(2),
  },
  addBtnText: { fontSize: sf(12), fontWeight: '700', color: PRIMARY },
});

// ─── Shop section styles ─────────────────────────────────────
const secStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: WHITE,
    marginBottom: sh(8),
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sw(16),
    paddingVertical: sh(14),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  storeLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: sw(12) },
  storeImageWrap: {
    width: sw(64),
    height: sw(64),
    borderRadius: sw(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  storeImage: { width: '100%', height: '100%' },
  storePlaceholder: {
    flex: 1,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: sw(8), marginBottom: sh(3) },
  storeName: { fontSize: sf(16), fontWeight: '800', color: TEXT_DARK, flexShrink: 1 },
  openBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: sw(7),
    paddingVertical: sh(2),
    borderRadius: sw(6),
  },
  openText: { fontSize: sf(10), fontWeight: '800', color: PRIMARY },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: sw(4), marginBottom: sh(3) },
  metaText: { fontSize: sf(11.5), color: TEXT_SECONDARY, fontWeight: '500' },
  metaDot: { fontSize: sf(11), color: TEXT_SECONDARY },
  addressText: { fontSize: sf(11), color: TEXT_SECONDARY },
  viewStoreBtn: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: sw(10),
    paddingHorizontal: sw(12),
    paddingVertical: sh(8),
    marginLeft: sw(8),
  },
  viewStoreBtnText: { fontSize: sf(12), fontWeight: '700', color: PRIMARY },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(16),
    paddingTop: sh(12),
    paddingBottom: sh(8),
  },
  itemsTitle: { fontSize: sf(14), fontWeight: '700', color: TEXT_DARK },
  seeAll: { fontSize: sf(12.5), fontWeight: '700', color: PRIMARY },
  productsRow: { paddingLeft: sw(16), paddingRight: sw(8), paddingBottom: sh(16) },
  noItems: { fontSize: sf(12), color: TEXT_SECONDARY, paddingHorizontal: sw(16), paddingBottom: sh(14) },
});

// ─── Main screen styles ──────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingHorizontal: sw(12),
    paddingVertical: sh(12),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { padding: 4, marginRight: sw(8) },
  screenTitle: { flex: 1, fontSize: sf(20), fontWeight: '800', color: TEXT_DARK },
  topBarActions: { flexDirection: 'row', gap: sw(10), alignItems: 'center' },
  topIconBtn: { padding: 4 },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: sw(14),
    height: sw(14),
    borderRadius: sw(7),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { fontSize: sf(8), fontWeight: '800', color: WHITE },

  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(8),
    paddingHorizontal: sw(16),
    paddingVertical: sh(10),
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  locationTextWrap: { flex: 1 },
  deliverLabel: { fontSize: sf(10), fontWeight: '500', color: TEXT_SECONDARY },
  locationValue: { fontSize: sf(13), fontWeight: '700', color: TEXT_DARK },

  chipScroll: { maxHeight: sh(52), backgroundColor: WHITE },
  chipRow: {
    paddingHorizontal: sw(12),
    paddingVertical: sh(10),
    gap: sw(8),
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: sw(14),
    paddingVertical: sh(7),
    borderRadius: sw(20),
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },
  chipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipText: { fontSize: sf(12.5), fontWeight: '600', color: TEXT_DARK },
  chipTextActive: { color: WHITE },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(4),
    paddingHorizontal: sw(12),
    paddingVertical: sh(7),
    borderRadius: sw(20),
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },
  filterText: { fontSize: sf(12.5), fontWeight: '600', color: TEXT_SECONDARY },

  scrollContent: { paddingTop: sh(6) },

  centerMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sw(32),
    gap: sh(12),
  },
  centerText: { fontSize: sf(14), color: TEXT_SECONDARY, textAlign: 'center', lineHeight: sf(20) },
  retryBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: sw(20),
    paddingVertical: sh(10),
    borderRadius: sw(10),
  },
  retryText: { fontSize: sf(13), fontWeight: '700', color: WHITE },
});
