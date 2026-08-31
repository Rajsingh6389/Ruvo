import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  if (!category) return true;
  const wanted = normalize(category);
  const actual = normalize(shop.category);
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

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [products, setProducts] = useState<NearbyProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const horizontalPadding = screenWidth < 360 ? 12 : 16;
  const gridGap = screenWidth < 360 ? 10 : 14;
  const productCardWidth = Math.floor((screenWidth - horizontalPadding * 2 - gridGap) / 2);
  const shopTileWidth = Math.min(214, Math.max(172, screenWidth * 0.58));
  const heroImageSize = screenWidth < 360 ? 76 : 96;

  const loadShops = useCallback(async () => {
    setShopsLoading(true);
    setError(null);
    try {
      const data = userLocation
        ? await getNearbyShops(userLocation.latitude, userLocation.longitude, 5)
        : await getShops();

      const allShops = Array.isArray(data) ? data : [];
      const filtered = categoryFilter
        ? allShops.filter(shop => matchesCategory(shop, categoryFilter))
        : allShops;
      const visible = categoryFilter ? filtered : allShops;

      setShops(visible);
      setSelectedShopId(visible[0]?.id ?? null);
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
    <View className="flex-1 bg-ruvo-bg">
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
            <Ionicons name="bag-outline" size={22} color="#111827" />
            {cartItems.length > 0 && (
              <View className="absolute -top-1 -right-1 bg-ruvo-yellow rounded-full min-w-5 h-5 px-1 items-center justify-center">
                <Text className="text-xs font-black text-ruvo-ink">{cartItems.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View className="flex-row items-center bg-warm-100 rounded-2xl px-4 h-12 gap-2">
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
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="py-3"
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 8 }}
        >
          <Pressable
            onPress={() => (navigation as any).setParams({ category: undefined })}
            className={`px-4 h-10 rounded-full border flex-row items-center gap-2 ${
              !categoryFilter ? 'bg-ruvo-yellow border-ruvo-yellow' : 'bg-white border-warm-200'
            }`}
          >
            <Ionicons name="grid-outline" size={16} color="#111827" />
            <Text className="font-bold text-ruvo-ink">All</Text>
          </Pressable>
          {CATEGORIES.map(category => {
            const active = category.label === categoryFilter;
            return (
              <Pressable
                key={category.id}
                onPress={() => (navigation as any).setParams({ category: category.label })}
                className={`px-4 h-10 rounded-full border flex-row items-center gap-2 ${
                  active ? 'bg-ruvo-yellow border-ruvo-yellow' : 'bg-white border-warm-200'
                }`}
              >
                <Image source={{ uri: category.image }} className="w-5 h-5 rounded-full" />
                <Text className="font-bold text-ruvo-ink">{category.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="px-4">
          <Text className="text-xl font-black text-ruvo-ink mb-2">Shops Near You</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {shops.map(shop => {
              const active = shop.id === selectedShop?.id;
              return (
                <Pressable
                  key={shop.id}
                  onPress={() => setSelectedShopId(shop.id)}
                  style={[styles.shopTile, { width: shopTileWidth }, active && styles.shopTileActive]}
                >
                  <Image source={{ uri: shopImage(shop) }} style={styles.shopTileImage} resizeMode="cover" />
                  <View className="flex-1">
                    <Text className="font-black text-ruvo-ink" numberOfLines={1}>{shop.name}</Text>
                    <Text className="text-xs text-warm-600 mt-1" numberOfLines={2}>
                      {shop.description || shop.category || 'Daily essentials'}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-2">
                      <Ionicons name="star" size={13} color="#F5B700" />
                      <Text className="text-xs font-bold text-ruvo-ink">{Number(shop.rating || 4.5).toFixed(1)}</Text>
                      <Text className="text-xs text-warm-600">• {shop.deliveryTime || 25} mins</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {selectedShop && (
          <View className="mx-4 mt-4 bg-white rounded-2xl border border-warm-200 p-4 shadow-sm">
            <View className="flex-row items-center gap-4">
              <Image
                source={{ uri: shopImage(selectedShop) }}
                style={[styles.heroShopImage, { width: heroImageSize, height: heroImageSize }]}
                resizeMode="cover"
              />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl font-black text-ruvo-ink flex-1" numberOfLines={1}>
                    {selectedShop.name}
                  </Text>
                  <View className="bg-ruvo-yellow-soft rounded-full px-3 py-1">
                    <Text className="text-xs font-black text-ruvo-ink">{selectedShop.category || 'Store'}</Text>
                  </View>
                </View>
                <Text className="text-base text-warm-700 mt-1" numberOfLines={2}>
                  {selectedShop.description || 'Groceries and daily essentials'}
                </Text>
                <View className="flex-row items-center gap-2 mt-2">
                  <Ionicons name="star" size={15} color="#F5B700" />
                  <Text className="font-bold text-warm-700">{Number(selectedShop.rating || 4.6).toFixed(1)}</Text>
                  <Text className="text-warm-600">•</Text>
                  <Text className="font-semibold text-warm-700">{selectedShop.deliveryTime || 25} mins</Text>
                </View>
              </View>
            </View>
            <View className="mt-4 bg-ruvo-accent-soft rounded-xl px-3 py-2 flex-row items-center gap-2">
              <Ionicons name="bicycle-outline" size={16} color="#15803D" />
              <Text className="text-sm font-bold text-ruvo-accent">Free delivery on orders above Rs 199</Text>
            </View>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 10 }}
        >
          {productCategories.map(category => {
            const active = category === activeCategory;
            return (
              <Pressable
                key={category}
                onPress={() => setActiveCategory(category)}
                className={`px-4 h-11 rounded-xl border flex-row items-center justify-center ${
                  active ? 'bg-ruvo-yellow border-ruvo-yellow' : 'bg-white border-warm-200'
                }`}
              >
                <Text className="font-black text-ruvo-ink">{category}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="small" color="#F5B700" />
            <Text className="text-warm-600 mt-2">Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon="search"
            title="No products found"
            subtitle={searchText ? `No products match "${searchText}"` : 'This shop has no products available.'}
          />
        ) : (
          <View style={[styles.productGrid, { paddingHorizontal: horizontalPadding, gap: gridGap }]}>
            {filteredProducts.map(product => (
              <Pressable
                key={product.id}
                style={[styles.productCard, { width: productCardWidth }]}
                onPress={() => (navigation.navigate as any)(ROUTES.PRODUCT_DETAILS, { product })}
              >
                <Image source={{ uri: productImage(product) }} style={styles.productImage} resizeMode="contain" />
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productUnit} numberOfLines={1}>{product.variant}</Text>
                <View className="flex-row items-center justify-between mt-3">
                  <Text style={styles.productPrice}>Rs {product.price.toFixed(0)}</Text>
                  <Pressable
                    onPress={() => addToCart(product as any)}
                    className="bg-ruvo-yellow rounded-lg px-3 h-9 flex-row items-center justify-center"
                  >
                    <Ionicons name="add" size={16} color="#111827" />
                    <Text className="font-black text-ruvo-ink ml-1">Add</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {cartItems.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-warm-200 px-4 py-3 flex-row items-center justify-between shadow-lg">
          <Pressable className="flex-row items-center gap-3" onPress={() => (navigation.navigate as any)(ROUTES.CART)}>
            <View className="w-10 h-10 rounded-xl bg-ruvo-yellow-soft items-center justify-center">
              <Ionicons name="bag-handle" size={20} color="#B77900" />
            </View>
            <View>
              <Text className="font-black text-ruvo-ink">{cartItems.length} Items</Text>
              <Text className="text-xs font-semibold text-warm-600">View Cart</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => (navigation.navigate as any)(ROUTES.CHECKOUT, { fromCart: true })}
            className="bg-ruvo-yellow rounded-xl px-4 h-12 items-center justify-center"
          >
            <Text className="font-black text-ruvo-ink">Checkout Rs {cartTotal}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shopTile: {
    minHeight: 122,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
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
    borderWidth: 1,
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
