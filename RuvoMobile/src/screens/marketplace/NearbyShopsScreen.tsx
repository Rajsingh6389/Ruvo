import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  Text,
  Pressable,
  View,
  StatusBar,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ROUTES } from '../../constants/routes';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { getNearbyShops, getShops } from '../../services/shopService';
import { getProductsByShop } from '../../services/productService';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import type { Shop } from '../../types';
import type { RootStackParamList } from '../../types/navigation';
import { CATEGORIES, PRODUCT_IMAGES, SHOP_IMAGES, getCategoryImage } from '../../assets/cloudinary';
import { LoadingState, EmptyState, ErrorState } from '../../components/design-system';
import { resolveImageUrl } from '../../utils/imageUrl';

type NearbyShopsRouteProp = RouteProp<RootStackParamList, 'NearbyShops'>;

type NearbyProduct = {
  id: number;
  name: string;
  unit?: string;
  sellingPrice: number;
  actualPrice: number;
  shopId: number;
  category: string;
  imageUrl?: string;
  image?: string;
  price: number;
  originalPrice: number;
  variant: string;
  isAvailable: boolean;
};

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();
const matchesCategory = (shop: Shop, category?: string) => {
  if (!category || category === 'All') return true;
  const wanted = normalize(category);
  const actual = normalize(shop.category);
  if (!actual) return true;
  return actual === wanted || actual.includes(wanted) || wanted.includes(actual);
};

const shopImage = (shop: Shop) =>
  resolveImageUrl(shop.logoUrl || shop.bannerUrl || shop.image) ||
  getCategoryImage(shop.category) ||
  SHOP_IMAGES.superStore;

const productImage = (product: NearbyProduct) =>
  resolveImageUrl(product.imageUrl || product.image) || PRODUCT_IMAGES.milk;

export const NearbyShopsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<NearbyShopsRouteProp>();
  const categoryFilter = (route.params as any)?.category as string | undefined;
  const { location: userLocation } = useDeliveryLocation();
  const { cartItems, addToCart, cartTotal } = useCart();
  const { colors, theme: activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const { width: screenWidth } = useWindowDimensions();

  // Animation values for cart bounce feedback
  const cartScaleAnim = useRef(new Animated.Value(1)).current;
  const barScaleAnim = useRef(new Animated.Value(1)).current;

  const triggerCartAnimation = () => {
    Animated.sequence([
      Animated.timing(cartScaleAnim, { toValue: 1.35, duration: 150, useNativeDriver: true }),
      Animated.spring(cartScaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(barScaleAnim, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.spring(barScaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const handleAddToCart = (product: any) => {
    addToCart(product);
    triggerCartAnimation();
  };

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [products, setProducts] = useState<NearbyProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sidebarWidth = 80; // w-20 is 80px
  const rightPaneWidth = screenWidth - sidebarWidth;
  const isSmallDevice = rightPaneWidth < 280; // Force 1-column on narrow side-panes
  const productCardWidth = isSmallDevice ? '100%' : '48%';

  const horizontalPadding = screenWidth < 360 ? 12 : 16;
  const gridGap = screenWidth < 360 ? 10 : 14;
  const shopTileWidth = Math.min(214, Math.max(172, screenWidth * 0.58));
  const heroImageSize = screenWidth < 360 ? 76 : 96;

  const loadShops = useCallback(async () => {
    setShopsLoading(true);
    setError(null);
    try {
      let data: Shop[] = [];
      if (userLocation) {
        try {
          data = await getNearbyShops(userLocation.latitude, userLocation.longitude, 50);
        } catch (e) {}
      }
      if (!data || data.length === 0) {
        data = await getShops();
      }

      const allShops = Array.isArray(data) ? data : [];
      const filtered = categoryFilter
        ? allShops.filter(shop => matchesCategory(shop, categoryFilter))
        : allShops;

      setShops(filtered);
      setSelectedShopId(filtered[0]?.id ?? null);
      setActiveCategory('All');
    } catch {
      setError('Failed to load shops. Please try again.');
      setShops([]);
      setSelectedShopId(null);
    } finally {
      setShopsLoading(false);
    }
  }, [categoryFilter, userLocation]);

  useFocusEffect(useCallback(() => {
    loadShops();
  }, [loadShops]));

  useEffect(() => {
    if (!selectedShopId) {
      setProducts([]);
      return;
    }

    setLoading(true);
    getProductsByShop(selectedShopId)
      .then(prods => {
        const mapped = Array.isArray(prods)
          ? prods
              .filter(p => p.isAvailable !== false && typeof p.id === 'number')
              .map(p => {
                const sellingPrice = Number(p.sellingPrice || p.actualPrice || 0);
                const actualPrice = Number(p.actualPrice || sellingPrice);
                return {
                  ...p,
                  id: p.id as number,
                  shopId: Number(p.shopId || selectedShopId),
                  sellingPrice,
                  actualPrice,
                  category: p.category || 'All',
                  imageUrl: resolveImageUrl(p.imageUrl),
                  image: resolveImageUrl(p.imageUrl) || PRODUCT_IMAGES.milk,
                  price: sellingPrice,
                  originalPrice: actualPrice,
                  variant: p.unit || '1 unit',
                  isAvailable: p.isAvailable !== false,
                };
              })
          : [];
        setProducts(mapped);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [selectedShopId]);

  const selectedShop = useMemo(
    () => shops.find(s => s.id === selectedShopId) || shops[0] || null,
    [shops, selectedShopId],
  );

  const productCategories = useMemo(() => {
    const values = products.map(p => p.category).filter(Boolean);
    return ['All', ...Array.from(new Set(values))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = normalize(searchText);
    return products.filter(product => {
      const categoryMatch = activeCategory === 'All' || product.category === activeCategory;
      const searchMatch = !query || normalize(product.name).includes(query);
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, products, searchText]);

  if (shopsLoading) return <LoadingState message="Finding shops near you..." />;

  if (error) {
    return <ErrorState title="Couldn't load shops" message={error} onRetry={loadShops} />;
  }

  if (shops.length === 0) {
    return (
      <EmptyState
        icon="storefront"
        title={categoryFilter ? `No ${categoryFilter} shops found` : 'No shops found'}
        subtitle="Try another category or browse all nearby shops."
        action={{
          label: categoryFilter ? 'View all shops' : 'Go Home',
          onPress: () =>
            categoryFilter
              ? (navigation as any).setParams({ category: undefined })
              : (navigation.navigate as any)(ROUTES.HOME),
        }}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar backgroundColor="#FF6B35" barStyle="light-content" />

      {/* ── U-Shaped RuVo Orange Banner Header ──────────────────────── */}
      <View 
        style={{ 
          backgroundColor: '#FF6B35', 
          borderBottomLeftRadius: 32, 
          borderBottomRightRadius: 32,
          shadowColor: '#FF6B35',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 8,
        }} 
        className="px-4 pt-3 pb-5"
      >
        <View className="flex-row items-center justify-between mb-3">
          <Pressable
            onPress={() => navigation.canGoBack() ? navigation.goBack() : (navigation.navigate as any)(ROUTES.HOME)}
            style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>

          <View className="items-center flex-1">
            <Text style={{ color: '#FFFFFF' }} className="text-lg font-black">
              {categoryFilter || 'Nearby Shops'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.88)' }} className="text-xs font-semibold">
              {shops.length} shops around you
            </Text>
          </View>

          <Pressable
            onPress={() => (navigation.navigate as any)(ROUTES.CART)}
            style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            className="w-10 h-10 rounded-full items-center justify-center relative"
          >
            <Animated.View style={{ transform: [{ scale: cartScaleAnim }] }}>
              <Ionicons name="bag-outline" size={22} color="#FFFFFF" />
              {cartItems.length > 0 && (
                <View className="absolute -top-1 -right-1 bg-white rounded-full min-w-5 h-5 px-1 items-center justify-center shadow-sm">
                  <Text className="text-xs font-black text-[#FF6B35]">{cartItems.length}</Text>
                </View>
              )}
            </Animated.View>
          </Pressable>
        </View>

        {/* White Search Input Bar */}
        <View style={{ backgroundColor: '#FFFFFF', elevation: 4 }} className="flex-row items-center rounded-2xl px-4 h-11 gap-2 mt-2 shadow-sm">
          <Ionicons name="search-outline" size={20} color="#FF6B35" />
          <TextInput
            style={{ color: '#171A1F' }}
            className="flex-1 text-sm font-semibold"
            placeholder="Search products in this shop..."
            placeholderTextColor="#77736B"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#77736B" />
            </Pressable>
          ) : null}
        </View>

        {/* ── Category Selector Bar inside NearbyShops ─────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
        >
          <Pressable
            onPress={() => (navigation as any).setParams({ category: undefined })}
            style={{
              backgroundColor: !categoryFilter ? '#FFFFFF' : 'rgba(255,255,255,0.22)',
            }}
            className="px-4 h-8 rounded-full flex-row items-center gap-1.5"
          >
            <Text style={{ color: !categoryFilter ? '#FF6B35' : '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
              All
            </Text>
          </Pressable>
          {CATEGORIES.map(cat => {
            const isSelected = categoryFilter === cat.label;
            return (
              <Pressable
                key={cat.id}
                onPress={() => (navigation as any).setParams({ category: cat.label })}
                style={{
                  backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.22)',
                }}
                className="px-3.5 h-8 rounded-full flex-row items-center gap-1.5"
              >
                <Text style={{ color: isSelected ? '#FF6B35' : '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Main Split View Container ───────────────────────────────── */}
      <View className="flex-1 flex-row">
        {/* ── Left Sidebar: All Shops List ────────────────────────────── */}
        <View style={{ backgroundColor: colors.surfaceSunken, borderRightColor: colors.border }} className="w-20 border-r py-2">
          <Text style={{ color: colors.textHint }} className="text-[10px] font-black uppercase tracking-wider text-center mb-2">
            Shops ({shops.length})
          </Text>
          {shops.length === 0 ? (
            <View className="p-2 items-center justify-center mt-6">
              <Ionicons name="storefront-outline" size={24} color={colors.textHint} />
              <Text style={{ color: colors.textHint }} className="text-[10px] text-center font-bold mt-1">0 Shops</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, gap: 10, paddingBottom: 80 }}>
              {shops.map(shop => {
                const active = shop.id === selectedShop?.id;
                const logo = shopImage(shop);
                const isOverdue = (shop as any).settlementBlocked || (shop as any).active === false;
                return (
                  <Pressable
                    key={shop.id}
                    onPress={() => setSelectedShopId(shop.id)}
                    style={active ? { backgroundColor: colors.surface, borderColor: colors.border, elevation: 3 } : undefined}
                    className={`p-2 rounded-2xl items-center border border-transparent ${
                      active ? 'shadow-[0_4px_12px_rgba(245,183,0,0.15)]' : 'bg-transparent opacity-70'
                    }`}
                  >
                    <View className="relative">
                      <Image source={{ uri: logo }} style={{ backgroundColor: colors.surface }} className={`w-12 h-12 rounded-[18px] ${isOverdue ? 'opacity-50' : ''}`} resizeMode="cover" />
                      {active && (
                        <View className="absolute -top-1 -right-1 bg-ruvo-yellow w-4 h-4 rounded-full items-center justify-center">
                          <Ionicons name="checkmark" size={10} color="#231C10" />
                        </View>
                      )}
                      {isOverdue && (
                        <View className="absolute -bottom-1 -right-1 bg-red-600 px-1 py-0.2 rounded">
                          <Text className="text-[8px] font-black text-white">PAUSED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: active ? colors.textPrimary : colors.textSecondary }} className={`text-[10px] font-bold text-center mt-1.5 leading-tight ${active ? 'font-black' : ''}`} numberOfLines={2}>
                      {shop.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Right Main Panel: Products or Empty State ─────────────── */}
        <View style={{ backgroundColor: colors.background }} className="flex-1">
          {shops.length === 0 ? (
            <View style={{ backgroundColor: colors.surface }} className="flex-1 items-center justify-center p-6">
              <View className="w-16 h-16 rounded-full bg-ruvo-yellow-soft items-center justify-center mb-3">
                <Ionicons name="storefront-outline" size={32} color="#B77900" />
              </View>
              <Text style={{ color: colors.textPrimary }} className="text-base font-black text-center">
                No Shops Found for "{categoryFilter || 'Selected Category'}"
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs text-center mt-1.5 px-3 leading-relaxed">
                There are currently no registered shops in this category. Please select another category above or browse all shops.
              </Text>
              <Pressable
                onPress={() => (navigation as any).setParams({ category: undefined })}
                className="mt-4 bg-ruvo-yellow rounded-xl px-4 h-10 flex-row items-center justify-center gap-2"
              >
                <Ionicons name="grid-outline" size={15} color="#111827" />
                <Text className="font-extrabold text-xs text-ruvo-ink">Show All Categories</Text>
              </Pressable>
            </View>
          ) : selectedShop ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              {/* Selected Shop Header */}
              <View style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }} className="border-b p-3 flex-row items-center gap-3">
                <Image source={{ uri: shopImage(selectedShop) }} style={{ backgroundColor: colors.surfaceSunken }} className="w-12 h-12 rounded-xl" resizeMode="cover" />
                <View className="flex-1">
                  <Text style={{ color: colors.textPrimary }} className="text-base font-extrabold" numberOfLines={1}>
                    {selectedShop.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs" numberOfLines={1}>
                    {selectedShop.category || 'General Store'} • {selectedShop.deliveryTime || 25} mins
                  </Text>
                </View>
              </View>

              {/* Product Categories Filter Pills */}
              {productCategories.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ backgroundColor: colors.surfaceSunken, borderBottomColor: colors.border }}
                  className="py-2 border-b"
                  contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
                >
                  {productCategories.map(category => {
                    const active = category === activeCategory;
                    return (
                      <Pressable
                        key={category}
                        onPress={() => setActiveCategory(category)}
                        style={active ? undefined : { backgroundColor: colors.surface, borderColor: colors.border }}
                        className={`px-3 py-1.5 rounded-full border ${
                          active ? 'bg-ruvo-yellow border-ruvo-yellow' : ''
                        }`}
                      >
                        <Text style={{ color: active ? '#111827' : colors.textPrimary }} className="text-xs font-bold">{category}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Products List Grid */}
              {loading ? (
                <View className="py-12 items-center">
                  <ActivityIndicator size="small" color="#F5B700" />
                  <Text style={{ color: colors.textSecondary }} className="text-xs mt-2 font-medium">Loading products...</Text>
                </View>
              ) : filteredProducts.length === 0 ? (
                <View className="py-12 px-4 items-center">
                  <Ionicons name="bag-remove-outline" size={40} color={colors.textHint} />
                  <Text style={{ color: colors.textPrimary }} className="text-sm font-bold mt-2">No products available</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs text-center mt-1">This shop hasn't added any products to this category yet.</Text>
                </View>
              ) : (
                <View className="p-3 flex-row flex-wrap justify-between gap-y-4">
                  {filteredProducts.map((product, index) => (
                    <Reanimated.View
                      key={product.id}
                      entering={FadeInDown.duration(300)}
                      style={{ width: productCardWidth as any, backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 }}
                      className="rounded-[24px] p-2.5 justify-between border"
                    >
                      <Pressable 
                        onPress={() => (navigation.navigate as any)(ROUTES.PRODUCT_DETAILS, { product: { ...product, shopName: selectedShop?.name } })}
                      >
                        {isSmallDevice ? (
                           <View className="flex-row items-center gap-3">
                             <View style={{ backgroundColor: colors.surfaceSunken, borderColor: colors.border }} className="w-20 h-20 items-center justify-center rounded-[18px] overflow-hidden border">
                               <Image source={{ uri: productImage(product) }} className="w-full h-full" resizeMode="contain" />
                             </View>
                             <View className="flex-1 justify-center">
                               <Text style={{ color: colors.textPrimary }} className="text-sm font-black leading-tight flex-wrap" numberOfLines={2}>{product.name}</Text>
                               <Text style={{ color: colors.textSecondary }} className="text-[10px] font-medium mt-1">{product.variant}</Text>
                               <View className="flex-row items-end justify-between mt-2">
                                 <Text style={{ color: colors.textPrimary }} className="text-base font-black">₹{product.price.toFixed(0)}</Text>
                                 <Pressable
                                   onPress={() => handleAddToCart(product as any)}
                                   className="bg-ruvo-yellow rounded-xl px-3 h-9 items-center justify-center flex-row"
                                 >
                                   <Text className="text-xs font-black text-ruvo-ink">Add</Text>
                                 </Pressable>
                               </View>
                             </View>
                           </View>
                        ) : (
                           <View>
                             <View style={{ backgroundColor: colors.surfaceSunken, borderColor: colors.border }} className="w-full h-24 items-center justify-center rounded-[18px] mb-2 overflow-hidden border">
                               <Image source={{ uri: productImage(product) }} className="w-full h-full" resizeMode="contain" />
                             </View>
                             <Text style={{ color: colors.textPrimary }} className="text-sm font-black leading-tight" numberOfLines={2}>{product.name}</Text>
                             <Text style={{ color: colors.textSecondary }} className="text-[10px] font-medium mt-1">{product.variant}</Text>
                             <View className="flex-row items-end justify-between mt-3">
                               <Text style={{ color: colors.textPrimary }} className="text-base font-black">₹{product.price.toFixed(0)}</Text>
                               <Pressable
                                 onPress={() => handleAddToCart(product as any)}
                                 className="bg-ruvo-yellow rounded-xl w-10 h-10 items-center justify-center flex-row"
                                 style={{ elevation: 2, shadowColor: '#F5B700', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}
                               >
                                 <Ionicons name="add" size={20} color="#1A1A1A" />
                               </Pressable>
                             </View>
                           </View>
                        )}
                      </Pressable>
                    </Reanimated.View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center p-4">
              <Ionicons name="storefront-outline" size={48} color={colors.textHint} />
              <Text style={{ color: colors.textPrimary }} className="text-sm font-bold mt-2">Select a shop from the left panel</Text>
            </View>
          )}
        </View>
      </View>

      {cartItems.length > 0 && (
        <Animated.View
          style={{ transform: [{ scale: barScaleAnim }], shadowColor: '#000', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 20 }}
          className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-t-[40px] border-t border-white/80"
        >
          <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={{ backgroundColor: isDark ? 'rgba(29,26,24,0.9)' : 'rgba(255,255,255,0.85)' }} className="px-5 pt-4 pb-safe flex-row items-center justify-between">
            <Pressable className="flex-row items-center gap-3" onPress={() => (navigation.navigate as any)(ROUTES.CART)}>
              <View className="w-12 h-12 rounded-xl bg-ruvo-yellow items-center justify-center shadow-sm">
                <Ionicons name="cart" size={24} color="#1A1A1A" />
              </View>
              <View>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-black uppercase tracking-wider">Shopping Cart</Text>
                <Text style={{ color: colors.textPrimary }} className="font-black text-lg">{cartItems.length} Items</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => (navigation.navigate as any)(ROUTES.CHECKOUT, { fromCart: true })}
              className="bg-ruvo-yellow rounded-2xl px-5 h-12 items-center justify-center flex-row gap-2"
            >
              <Text className="font-black text-ruvo-ink">₹{cartTotal}</Text>
              <Ionicons name="chevron-forward" size={16} color="#171A1F" />
            </Pressable>
          </BlurView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  shopTile: {
    minHeight: 122,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: '#EEE7DA',
    backgroundColor: '#FFFFFF',
  },
  shopTileActive: {
    borderColor: '#F5B700',
    backgroundColor: '#FFFBEA',
  },
  shopTileImage: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: '#F3F0EA',
  },
  heroShopImage: {
    borderRadius: 18,
    backgroundColor: '#F3F0EA',
  },
  productGrid: {
    paddingTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  productCard: {
    minHeight: 232,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#EEE7DA',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  productImage: {
    width: '100%',
    height: 108,
    marginBottom: 10,
  },
  productName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  productUnit: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },
  productPrice: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
});

export default NearbyShopsScreen;
