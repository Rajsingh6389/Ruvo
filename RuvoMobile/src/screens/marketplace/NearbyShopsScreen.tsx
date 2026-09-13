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
    <SafeAreaView edges={['top']} className="flex-1 bg-ruvo-bg">
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <View className="bg-white px-4 pt-3 pb-4 border-b border-warm-200">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => navigation.canGoBack() ? navigation.goBack() : (navigation.navigate as any)(ROUTES.HOME)}
            className="w-10 h-10 rounded-full bg-warm-100 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>

          <View className="items-center flex-1">
            <Text className="text-lg font-black text-ruvo-ink">
              {categoryFilter || 'Nearby Shops'}
            </Text>
            <Text className="text-xs text-warm-600">
              {shops.length} shops around you
            </Text>
          </View>

          <Pressable
            onPress={() => (navigation.navigate as any)(ROUTES.CART)}
            className="w-10 h-10 rounded-full bg-white border border-warm-200 items-center justify-center relative"
          >
            <Animated.View style={{ transform: [{ scale: cartScaleAnim }] }}>
              <Ionicons name="bag-outline" size={22} color="#111827" />
              {cartItems.length > 0 && (
                <View className="absolute -top-1 -right-1 bg-ruvo-yellow rounded-full min-w-5 h-5 px-1 items-center justify-center">
                  <Text className="text-xs font-black text-ruvo-ink">{cartItems.length}</Text>
                </View>
              )}
            </Animated.View>
          </Pressable>
        </View>

        <View className="flex-row items-center bg-warm-100 rounded-2xl px-4 h-12 gap-2 mt-3">
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            className="flex-1 text-base text-ruvo-ink"
            placeholder="Search products in this shop..."
            placeholderTextColor="#8B8B94"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
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
            className={`px-3.5 h-9 rounded-full border flex-row items-center gap-1.5 ${
              !categoryFilter ? 'bg-ruvo-yellow border-ruvo-yellow' : 'bg-warm-100 border-warm-200'
            }`}
          >
            <Ionicons name="grid-outline" size={14} color="#111827" />
            <Text className="text-xs font-bold text-ruvo-ink">All</Text>
          </Pressable>
          {CATEGORIES.map(category => {
            const active = category.label === categoryFilter;
            return (
              <Pressable
                key={category.id}
                onPress={() => (navigation as any).setParams({ category: category.label })}
                className={`px-3.5 h-9 rounded-full border flex-row items-center gap-1.5 ${
                  active ? 'bg-ruvo-yellow border-ruvo-yellow' : 'bg-white border-warm-200'
                }`}
              >
                <Image source={{ uri: category.image }} className="w-4 h-4 rounded-full" />
                <Text className="text-xs font-bold text-ruvo-ink">{category.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Main Split View Container ───────────────────────────────── */}
      <View className="flex-1 flex-row">
        {/* ── Left Sidebar: All Shops List ────────────────────────────── */}
        <View className="w-20 bg-warm-50/50 border-r border-warm-100 py-2">
          <Text className="text-[10px] font-black text-warm-500 uppercase tracking-wider text-center mb-2">
            Shops ({shops.length})
          </Text>
          {shops.length === 0 ? (
            <View className="p-2 items-center justify-center mt-6">
              <Ionicons name="storefront-outline" size={24} color="#9CA3AF" />
              <Text className="text-[10px] text-warm-500 text-center font-bold mt-1">0 Shops</Text>
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
                    className={`p-2 rounded-2xl items-center border border-transparent ${
                      active ? 'bg-white shadow-[0_4px_12px_rgba(245,183,0,0.15)] border-ruvo-yellow/30' : 'bg-transparent opacity-70'
                    }`}
                    style={active ? { elevation: 3 } : undefined}
                  >
                    <View className="relative">
                      <Image source={{ uri: logo }} className={`w-12 h-12 rounded-[18px] bg-white ${isOverdue ? 'opacity-50' : ''}`} resizeMode="cover" />
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
                    <Text className={`text-[10px] font-bold text-center mt-1.5 leading-tight ${active ? 'text-ruvo-ink font-black' : 'text-warm-600'}`} numberOfLines={2}>
                      {shop.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Right Main Panel: Products or Empty State ─────────────── */}
        <View className="flex-1 bg-ruvo-bg">
          {shops.length === 0 ? (
            <View className="flex-1 items-center justify-center p-6 bg-white">
              <View className="w-16 h-16 rounded-full bg-ruvo-yellow-soft items-center justify-center mb-3">
                <Ionicons name="storefront-outline" size={32} color="#B77900" />
              </View>
              <Text className="text-base font-black text-ruvo-ink text-center">
                No Shops Found for "{categoryFilter || 'Selected Category'}"
              </Text>
              <Text className="text-xs text-warm-600 text-center mt-1.5 px-3 leading-relaxed">
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
              {/* Overdue / Settlement Blocked Warning Banner */}
              {((selectedShop as any).settlementBlocked || (selectedShop as any).active === false) && (
                <View className="bg-amber-50 border-b border-amber-300 px-3 py-2.5 flex-row items-center gap-2">
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                  <View className="flex-1">
                    <Text className="text-xs font-black text-amber-900">
                      Temporarily Unavailable (Settlement Overdue)
                    </Text>
                    <Text className="text-[10px] text-amber-700 font-medium">
                      This shop is currently paused due to pending shopkeeper settlement. You can browse shop details & info.
                    </Text>
                  </View>
                </View>
              )}

              {/* Selected Shop Header */}
              <View className="bg-white border-b border-warm-200 p-3 flex-row items-center gap-3">
                <Image source={{ uri: shopImage(selectedShop) }} className="w-12 h-12 rounded-xl bg-warm-100" resizeMode="cover" />
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-extrabold text-ruvo-ink" numberOfLines={1}>
                      {selectedShop.name}
                    </Text>
                    {((selectedShop as any).settlementBlocked || (selectedShop as any).active === false) && (
                      <View className="bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
                        <Text className="text-[9px] font-black text-red-700">TEMPORARILY OFF</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-warm-600" numberOfLines={1}>
                    {selectedShop.category || 'General Store'} • {selectedShop.deliveryTime || 25} mins
                  </Text>
                </View>
              </View>

              {/* Product Categories Filter Pills */}
              {productCategories.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="py-2 bg-warm-50 border-b border-warm-200"
                  contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
                >
                  {productCategories.map(category => {
                    const active = category === activeCategory;
                    return (
                      <Pressable
                        key={category}
                        onPress={() => setActiveCategory(category)}
                        className={`px-3 py-1.5 rounded-full border ${
                          active ? 'bg-ruvo-yellow border-ruvo-yellow' : 'bg-white border-warm-200'
                        }`}
                      >
                        <Text className="text-xs font-bold text-ruvo-ink">{category}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Products List Grid */}
              {loading ? (
                <View className="py-12 items-center">
                  <ActivityIndicator size="small" color="#F5B700" />
                  <Text className="text-xs text-warm-600 mt-2 font-medium">Loading products...</Text>
                </View>
              ) : filteredProducts.length === 0 ? (
                <View className="py-12 px-4 items-center">
                  <Ionicons name="bag-remove-outline" size={40} color="#9CA3AF" />
                  <Text className="text-sm font-bold text-ruvo-ink mt-2">No products available</Text>
                  <Text className="text-xs text-warm-600 text-center mt-1">This shop hasn't added any products to this category yet.</Text>
                </View>
              ) : (
                <View className="p-3 flex-row flex-wrap justify-between gap-y-4">
                  {filteredProducts.map((product, index) => (
                    <Reanimated.View
                      key={product.id}
                      entering={FadeInDown.duration(300)}
                      style={{ width: productCardWidth as any, shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 }}
                      className="bg-white rounded-[24px] p-2.5 justify-between border border-gray-50/50"
                    >
                      <Pressable 
                        onPress={() => (navigation.navigate as any)(ROUTES.PRODUCT_DETAILS, { product: { ...product, shopName: selectedShop?.name } })}
                      >
                        {isSmallDevice ? (
                           <View className="flex-row items-center gap-3">
                             <View className="w-20 h-20 items-center justify-center bg-gray-50/50 rounded-[18px] overflow-hidden border border-gray-50">
                               <Image source={{ uri: productImage(product) }} className="w-full h-full" resizeMode="contain" />
                             </View>
                             <View className="flex-1 justify-center">
                               <Text className="text-sm font-black text-ruvo-ink leading-tight flex-wrap" numberOfLines={2}>{product.name}</Text>
                               <Text className="text-[10px] text-warm-500 font-medium mt-1">{product.variant}</Text>
                               <View className="flex-row items-end justify-between mt-2">
                                 <Text className="text-base font-black text-ruvo-ink">₹{product.price.toFixed(0)}</Text>
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
                             <View className="w-full h-24 items-center justify-center bg-gray-50/50 rounded-[18px] mb-2 overflow-hidden border border-gray-50">
                               <Image source={{ uri: productImage(product) }} className="w-full h-full" resizeMode="contain" />
                             </View>
                             <Text className="text-sm font-black text-ruvo-ink leading-tight" numberOfLines={2}>{product.name}</Text>
                             <Text className="text-[10px] text-warm-500 font-medium mt-1">{product.variant}</Text>
                             <View className="flex-row items-end justify-between mt-3">
                               <Text className="text-base font-black text-ruvo-ink">₹{product.price.toFixed(0)}</Text>
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
              <Ionicons name="storefront-outline" size={48} color="#9CA3AF" />
              <Text className="text-sm font-bold text-ruvo-ink mt-2">Select a shop from the left panel</Text>
            </View>
          )}
        </View>
      </View>

      {cartItems.length > 0 && (
        <Animated.View
          style={{ transform: [{ scale: barScaleAnim }], shadowColor: '#000', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 20 }}
          className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-t-[40px] border-t border-white/80"
        >
          <BlurView intensity={90} tint="light" className="px-5 pt-4 pb-safe flex-row items-center justify-between bg-white/70">
            <Pressable className="flex-row items-center gap-3" onPress={() => (navigation.navigate as any)(ROUTES.CART)}>
              <View className="w-12 h-12 rounded-xl bg-ruvo-yellow items-center justify-center shadow-sm">
                <Ionicons name="cart" size={24} color="#1A1A1A" />
              </View>
              <View>
                <Text className="text-[10px] font-black uppercase text-warm-500 tracking-wider">Shopping Cart</Text>
                <Text className="font-black text-lg text-ruvo-ink">{cartItems.length} Items</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => (navigation.navigate as any)(ROUTES.CHECKOUT, { fromCart: true })}
              className="bg-ruvo-ink rounded-2xl px-5 h-12 items-center justify-center flex-row gap-2"
            >
              <Text className="font-black text-white">₹{cartTotal}</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFF" />
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
