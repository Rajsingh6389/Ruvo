import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getShopById, Shop } from '../../services/shopService';
import { getProductsByShop, Product as ServiceProduct } from '../../services/productService';
import { Product } from '../../types/product';
import { useCart } from '../../context/CartContext';
import { API_BASE_URL } from '../../config/api';
import {
  LoadingState,
  ErrorState,
  ProductCard,
  SectionHeader,
} from '../../components/design-system';

const formatImageUrl = (url?: string) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

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
  const navigation = useNavigation<any>();
  const { addToCart, getQuantity, updateQuantity } = useCart();
  const shopId = route.params?.shopId;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // BUSINESS LOGIC: Load shop and products
  useEffect(() => {
    if (!shopId) {
      console.log('❌ No shopId:', shopId);
      setError('No shop ID provided');
      setLoading(false);
      return;
    }

    const loadShop = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedShop = await getShopById(shopId);
        setShop(fetchedShop);
      } catch (error) {
        console.log('❌ Shop API error:', error);
        setError('Failed to load shop');
      }

      try {
        const fetchedProducts = await getProductsByShop(shopId);
        setProducts(fetchedProducts || []);
      } catch (error) {
        console.log('❌ Product API error:', error);
        // Product failure should NOT hide the shop.
        setProducts([]);
      }

      setLoading(false);
    };

    loadShop();
  }, [shopId]);

  // BUSINESS LOGIC: Extract unique product categories
  const productCategories = useMemo(() => {
    const seen = new Set<string>();
    products.forEach(product => {
      if (product.category) {
        seen.add(product.category);
      }
    });
    return ['All', ...Array.from(seen).sort()];
  }, [products]);

  // BUSINESS LOGIC: Filter products by category and search
  const visibleProducts = useMemo(() => {
    let list = products;

    if (activeCategory !== 'All') {
      list = list.filter(product => product.category === activeCategory);
    }

    const query = searchText.trim().toLowerCase();
    if (query) {
      list = list.filter(
        product =>
          product.name?.toLowerCase().includes(query) ||
          (product as any).description?.toLowerCase().includes(query),
      );
    }

    return list;
  }, [products, activeCategory, searchText]);

  // LOADING STATE
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg">
        <StatusBar barStyle="dark-content" backgroundColor="#FBF8F2" />
        <LoadingState
          title="Opening shop..."
          subtitle="Getting the latest products for you"
          icon="storefront-outline"
        />
      </SafeAreaView>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg">
        <StatusBar barStyle="dark-content" backgroundColor="#FBF8F2" />
        <ErrorState
          title="Unable to load shop"
          subtitle="Please check your connection and try again."
          onRetry={() => {
            setLoading(true);
            setError(null);
          }}
        />
      </SafeAreaView>
    );
  }

  // SHOP NOT FOUND
  if (!shop) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg">
        <StatusBar barStyle="dark-content" backgroundColor="#FBF8F2" />
        <View className="flex-1 justify-center items-center px-6">
          <View className="mb-4">
            <Ionicons name="storefront-outline" size={48} color="#9CA3AF" />
          </View>
          <Text className="text-lg font-semibold text-ruvo-ink mb-2">
            Shop not found
          </Text>
          <Pressable
            className="bg-ruvo-yellow py-3 px-6 rounded-lg mt-6 flex-row items-center"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={16} color="#FFF" />
            <Text className="text-white font-semibold ml-2">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const openTime = formatTime(shop.openingTime as unknown as string);
  const closeTime = formatTime(shop.closingTime as unknown as string);

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg">
      <StatusBar barStyle="light-content" />

      <FlatList
        data={visibleProducts}
        keyExtractor={item =>
          item.id?.toString() ?? Math.random().toString()
        }
        renderItem={({ item }) => {
          const productObj: Product = {
            id: item.id || 0,
            name: item.name,
            price: item.sellingPrice || (item as any).price || 0,
            originalPrice: item.actualPrice,
            image: formatImageUrl(item.imageUrl || (item as any).image) || undefined,
            category: item.category,
            shopId: item.shopId,
          };
          return (
            <ProductCard
              product={productObj}
              onAddToCart={() => addToCart(productObj as any, 1)}
              onPress={() =>
                navigation.navigate('ProductDetails', {
                  product: productObj,
                })
              }
            />
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 100,
        }}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View className="flex-1 py-8 px-6 items-center justify-center">
            <View className="mb-4">
              <Ionicons
                name={
                  searchText || activeCategory !== 'All'
                    ? 'search-outline'
                    : 'basket-outline'
                }
                size={48}
                color="#F5B700"
              />
            </View>
            <Text className="text-base font-semibold text-ruvo-ink mb-1 text-center">
              {searchText || activeCategory !== 'All'
                ? 'No products found'
                : 'No products yet'}
            </Text>
            <Text className="text-sm text-ruvo-ink text-opacity-60 text-center">
              {searchText || activeCategory !== 'All'
                ? 'Try another search or category.'
                : 'This shop has not added products yet.'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            {/* SHOP HERO BANNER */}
            <View className="mb-6 -mx-4">
              {formatImageUrl(shop.bannerUrl) ? (
                <Image
                  source={{ uri: formatImageUrl(shop.bannerUrl)! }}
                  className="w-full h-48"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-48 bg-ruvo-yellow-soft flex items-center justify-center">
                  <Ionicons
                    name="storefront-outline"
                    size={64}
                    color="rgba(46, 125, 50, 0.2)"
                  />
                </View>
              )}

              {/* OVERLAY GRADIENT EFFECT */}
              <View className="absolute inset-0 bg-black opacity-20" />

              {/* TOP BAR WITH BACK BUTTON */}
              <View className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 pt-2">
                <Pressable
                  onPress={() => navigation.goBack()}
                  className="bg-black bg-opacity-40 rounded-full p-2"
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color="#FFFFFF"
                  />
                </Pressable>

                <View className="flex-row items-center bg-black bg-opacity-40 px-3 py-1 rounded-full gap-1">
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color="#FFFFFF"
                  />
                  <Text className="text-white text-xs font-semibold">
                    LOCAL SHOP
                  </Text>
                </View>
              </View>

              {/* SHOP LOGO */}
              <View className="absolute bottom-0 left-0 right-0 items-center pb-3">
                {formatImageUrl(shop.logoUrl) ? (
                  <Image
                    source={{ uri: formatImageUrl(shop.logoUrl)! }}
                    className="w-20 h-20 rounded-full bg-white border border-ruvo-yellow"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-20 h-20 rounded-full bg-white border border-ruvo-yellow flex items-center justify-center">
                    <Ionicons
                      name="storefront-outline"
                      size={32}
                      color="#2E7D32"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* SHOP INFORMATION CARD */}
            <View className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-100">
              <View className="mb-3">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-ruvo-ink mb-1">
                      {shop.name}
                    </Text>
                    {shop.category && (
                      <Text className="text-sm text-ruvo-ink text-opacity-60">
                        {shop.category}
                      </Text>
                    )}
                  </View>

                  {shop.approved === false && (
                    <View className="flex-row items-center bg-yellow-50 px-3 py-1 rounded gap-1">
                      <View className="w-2 h-2 rounded-full bg-yellow-500" />
                      <Text className="text-xs font-semibold text-yellow-700">
                        Pending
                      </Text>
                    </View>
                  )}
                </View>

                {shop.description && (
                  <Text className="text-sm text-ruvo-ink text-opacity-70 leading-5">
                    {shop.description}
                  </Text>
                )}
              </View>

              {/* SHOP STATS ROW */}
              <View className="flex-row justify-between py-3 border-t border-gray-100 border-b">
                {shop.rating && (
                  <View className="items-center">
                    <View className="flex-row items-center gap-1 mb-1">
                      <Ionicons name="star" size={14} color="#F5B700" />
                      <Text className="text-sm font-bold text-ruvo-ink">
                        {shop.rating}
                      </Text>
                    </View>
                    <Text className="text-xs text-ruvo-ink text-opacity-60">
                      Rating
                    </Text>
                  </View>
                )}

                {shop.deliveryTime && (
                  <View className="items-center">
                    <View className="flex-row items-center gap-1 mb-1">
                      <Ionicons name="time-outline" size={14} color="#2E7D32" />
                      <Text className="text-sm font-bold text-ruvo-ink">
                        {shop.deliveryTime}m
                      </Text>
                    </View>
                    <Text className="text-xs text-ruvo-ink text-opacity-60">
                      Delivery
                    </Text>
                  </View>
                )}

                {shop.minOrderAmount && (
                  <View className="items-center">
                    <View className="flex-row items-center gap-1 mb-1">
                      <Text className="text-sm font-bold text-ruvo-ink">
                        ₹{shop.minOrderAmount}
                      </Text>
                    </View>
                    <Text className="text-xs text-ruvo-ink text-opacity-60">
                      Min Order
                    </Text>
                  </View>
                )}
              </View>

              {/* HOURS AND CONTACT */}
              <View className="pt-3 gap-2">
                {openTime && closeTime && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="time-outline" size={16} color="#2E7D32" />
                    <Text className="text-sm text-ruvo-ink">
                      {openTime} - {closeTime}
                    </Text>
                  </View>
                )}

                {shop.phone && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="call-outline" size={16} color="#2E7D32" />
                    <Text className="text-sm text-ruvo-ink">{shop.phone}</Text>
                  </View>
                )}

                {shop.address && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="location-outline" size={16} color="#2E7D32" />
                    <Text className="text-sm text-ruvo-ink flex-1">
                      {shop.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* SEARCH BAR */}
            <View className="mb-4 px-0">
              <View className="flex-row items-center bg-white rounded-lg px-3 border border-gray-200">
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                  placeholder="Search products..."
                  value={searchText}
                  onChangeText={setSearchText}
                  className="flex-1 py-3 pl-2 text-ruvo-ink"
                  placeholderTextColor="#9CA3AF"
                />
                {searchText && (
                  <Pressable onPress={() => setSearchText('')}>
                    <Ionicons name="close" size={18} color="#9CA3AF" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* CATEGORY FILTER PILLS */}
            {productCategories.length > 1 && (
              <View className="mb-4">
                <SectionHeader title="Categories" />
                <FlatList
                  data={productCategories}
                  keyExtractor={cat => cat}
                  renderItem={({ item: category }) => (
                    <Pressable
                      onPress={() => setActiveCategory(category)}
                      className={`px-4 py-2 rounded-full mr-2 ${
                        activeCategory === category
                          ? 'bg-ruvo-yellow'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          activeCategory === category
                            ? 'text-white'
                            : 'text-ruvo-ink'
                        }`}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                />
              </View>
            )}

            {/* PRODUCTS SECTION HEADER */}
            <SectionHeader
              title={`${visibleProducts.length} Products`}
              subtitle={
                activeCategory !== 'All'
                  ? `Showing ${activeCategory}`
                  : undefined
              }
            />
          </View>
        }
      />
    </SafeAreaView>
  );
};
