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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
      <View className="flex-1 bg-ruvo-bg">
        <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
        <LoadingState
          title="Opening shop..."
          subtitle="Getting the latest products for you"
          icon="storefront-outline"
        />
      </View>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <View className="flex-1 bg-ruvo-bg">
        <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
        <ErrorState
          title="Unable to load shop"
          subtitle="Please check your connection and try again."
          onRetry={() => {
            setLoading(true);
            setError(null);
          }}
        />
      </View>
    );
  }

  // SHOP NOT FOUND
  if (!shop) {
    return (
      <View className="flex-1 bg-ruvo-bg">
        <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
        <View className="flex-1 justify-center items-center px-6" style={{ paddingTop: insets.top }}>
          <View className="mb-4">
            <Ionicons name="storefront-outline" size={48} color="#A39D93" />
          </View>
          <Text className="text-lg font-bold text-ruvo-ink mb-2">
            Shop not found
          </Text>
          <Pressable
            className="bg-ruvo-yellow py-3 px-6 rounded-xl mt-6 flex-row items-center shadow-sm active:bg-ruvo-yellow-dark"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={16} color="#171A1F" />
            <Text className="text-ruvo-ink font-black ml-2">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const openTime = formatTime(shop.openingTime as unknown as string);
  const closeTime = formatTime(shop.closingTime as unknown as string);

  return (
    <View className="flex-1 bg-ruvo-bg">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <FlatList
        data={visibleProducts}
        keyExtractor={item =>
          item.id?.toString() ?? Math.random().toString()
        }
        renderItem={({ item }) => {
          const isShopOffline = shop.active === false;
          const productObj: any = {
            ...item,
            id: item.id || 0,
            name: item.name,
            price: item.sellingPrice || (item as any).price || 0,
            originalPrice: item.actualPrice,
            sellingPrice: item.sellingPrice || (item as any).price || 0,
            actualPrice: item.actualPrice || 0,
            image: formatImageUrl(item.imageUrl || (item as any).image) || undefined,
            imageUrl: formatImageUrl(item.imageUrl || (item as any).image) || undefined,
            category: item.category,
            shopId: item.shopId,
            shopName: shop.name,
          };
          return (
            <ProductCard
              product={productObj}
              onAddToCart={isShopOffline ? () => {} : () => addToCart(productObj as any, 1)}
              disabled={isShopOffline}
              onPress={() =>
                navigation.navigate('ProductDetails', {
                  product: productObj,
                  isShopOffline,
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
            <View className="mb-4 w-16 h-16 rounded-full bg-ruvo-yellow-soft items-center justify-center border border-ruvo-border">
              <Ionicons
                name={
                  searchText || activeCategory !== 'All'
                    ? 'search-outline'
                    : 'basket-outline'
                }
                size={32}
                color="#F4B400"
              />
            </View>
            <Text className="text-base font-extrabold text-ruvo-ink mb-1 text-center">
              {searchText || activeCategory !== 'All'
                ? 'No products found'
                : 'No products yet'}
            </Text>
            <Text className="text-sm text-ruvo-muted text-center font-medium">
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
                  className="w-full h-56"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-56 bg-ruvo-card flex items-center justify-center border-b border-ruvo-border">
                  <Ionicons
                    name="storefront-outline"
                    size={64}
                    color="#A39D93"
                  />
                </View>
              )}

              {/* OVERLAY GRADIENT EFFECT */}
              <View className="absolute inset-0 bg-black/25" />

              {/* TOP BAR WITH BACK BUTTON */}
              <View 
                className="absolute left-0 right-0 flex-row items-center justify-between px-4"
                style={{ top: insets.top > 0 ? insets.top + 8 : 16 }}
              >
                <Pressable
                  onPress={() => navigation.goBack()}
                  className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full items-center justify-center border border-white/20"
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color="#FFFFFF"
                  />
                </Pressable>

                <View className="flex-row items-center bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 gap-1.5 shadow-sm">
                  <Ionicons
                    name="location"
                    size={13}
                    color="#F4B400"
                  />
                  <Text className="text-white text-xs font-black tracking-wider">
                    LOCAL SHOP
                  </Text>
                </View>
              </View>

              {/* SHOP LOGO */}
              <View className="absolute bottom-0 left-0 right-0 items-center pb-3">
                {formatImageUrl(shop.logoUrl) ? (
                  <Image
                    source={{ uri: formatImageUrl(shop.logoUrl)! }}
                    className="w-20 h-20 rounded-full bg-white border border-ruvo-yellow shadow-md"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-20 h-20 rounded-full bg-white border border-ruvo-yellow flex items-center justify-center shadow-md">
                    <Ionicons
                      name="storefront"
                      size={32}
                      color="#171A1F"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* SHOP INFORMATION CARD */}
            <View 
              className="bg-white rounded-[20px] p-5 mb-6 mx-4 border border-ruvo-border"
              style={{ shadowColor: '#171A1F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, marginTop: -40 }}
            >
              <View className="mb-3">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-xl font-black text-ruvo-ink mb-1">
                      {shop.name}
                    </Text>
                    {shop.category && (
                      <Text className="text-xs font-bold text-ruvo-muted uppercase tracking-wider">
                        {shop.category}
                      </Text>
                    )}
                  </View>

                  {shop.active === false ? (
                    <View className="flex-row items-center bg-rose-100 px-3 py-1 rounded-full border border-rose-300 gap-1.5">
                      <View className="w-2 h-2 rounded-full bg-rose-600" />
                      <Text className="text-xs font-black text-rose-700 uppercase">
                        Closed
                      </Text>
                    </View>
                  ) : shop.approved === false ? (
                    <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 gap-1">
                      <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <Text className="text-[11px] font-bold text-amber-700">
                        Pending
                      </Text>
                    </View>
                  ) : null}
                </View>

                {shop.description && (
                  <Text className="text-sm text-ruvo-text font-normal leading-5 mt-1">
                    {shop.description}
                  </Text>
                )}
              </View>

              {/* SHOP OFFLINE BLACK AND WHITE HEADER BANNER */}
              {shop.active === false && (
                <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 my-2 flex-row items-center gap-3 shadow-md">
                  <View className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center border border-zinc-700">
                    <Ionicons name="time-outline" size={20} color="#F4B400" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-white uppercase tracking-wider">TEMPORARILY CLOSED FOR NOW</Text>
                    <Text className="text-[11px] font-semibold text-zinc-300 mt-0.5 leading-4">
                      This shop is taking a short break. You can browse products now; ordering will reopen as soon as the shopkeeper returns online.
                    </Text>
                  </View>
                </View>
              )}

              {/* SHOP STATS ROW */}
              <View className="flex-row justify-between py-3 border-t border-ruvo-border border-b">
                {shop.rating ? (
                  <View className="items-center flex-1">
                    <View className="flex-row items-center gap-1 mb-0.5">
                      <Ionicons name="star" size={14} color="#F4B400" />
                      <Text className="text-sm font-extrabold text-ruvo-ink">
                        {shop.rating}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-semibold text-ruvo-muted">
                      Rating
                    </Text>
                  </View>
                ) : null}

                {shop.deliveryTime ? (
                  <View className="items-center flex-1">
                    <View className="flex-row items-center gap-1 mb-0.5">
                      <Ionicons name="time-outline" size={14} color="#171A1F" />
                      <Text className="text-sm font-extrabold text-ruvo-ink">
                        {shop.deliveryTime}m
                      </Text>
                    </View>
                    <Text className="text-[11px] font-semibold text-ruvo-muted">
                      Delivery
                    </Text>
                  </View>
                ) : null}

                {shop.minOrderAmount ? (
                  <View className="items-center flex-1">
                    <View className="flex-row items-center gap-1 mb-0.5">
                      <Text className="text-sm font-extrabold text-ruvo-ink">
                        ₹{shop.minOrderAmount}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-semibold text-ruvo-muted">
                      Min Order
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* HOURS AND CONTACT */}
              <View className="pt-3 gap-2">
                {openTime && closeTime && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="time-outline" size={15} color="#77736B" />
                    <Text className="text-xs font-semibold text-ruvo-text">
                      {openTime} - {closeTime}
                    </Text>
                  </View>
                )}

                {shop.phone && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="call-outline" size={15} color="#77736B" />
                    <Text className="text-xs font-semibold text-ruvo-text">{shop.phone}</Text>
                  </View>
                )}

                {shop.address && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="location-outline" size={15} color="#77736B" />
                    <Text className="text-xs font-semibold text-ruvo-text flex-1" numberOfLines={2}>
                      {shop.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* SEARCH BAR */}
            <View className="mb-4 px-0">
              <View className="flex-row items-center bg-white rounded-xl px-3.5 py-1 border border-ruvo-border">
                <Ionicons name="search-outline" size={18} color="#A39D93" />
                <TextInput
                  placeholder="Search products in this shop..."
                  value={searchText}
                  onChangeText={setSearchText}
                  className="flex-1 py-2.5 pl-2.5 text-sm font-semibold text-ruvo-ink"
                  placeholderTextColor="#A39D93"
                />
                {searchText ? (
                  <Pressable onPress={() => setSearchText('')}>
                    <Ionicons name="close" size={18} color="#77736B" />
                  </Pressable>
                ) : null}
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
                      className={`px-4 py-2 rounded-full mr-2 border ${
                        activeCategory === category
                          ? 'bg-ruvo-ink border-ruvo-ink'
                          : 'bg-white border-ruvo-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-extrabold ${
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
    </View>
  );
};
