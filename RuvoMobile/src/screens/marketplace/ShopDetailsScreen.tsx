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
import { getShopOffers, Offer } from '../../services/offerService';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { addToCart } = useCart();
  const { theme, colors } = useTheme();
  const shopId = route.params?.shopId;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // BUSINESS LOGIC: Load shop and products
  useEffect(() => {
    if (!shopId) {
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
      } catch (err) {
        console.log('❌ Shop API error:', err);
        setError('Failed to load shop');
      }

      try {
        const fetchedProducts = await getProductsByShop(shopId);
        setProducts(fetchedProducts || []);
      } catch (err) {
        console.log('❌ Product API error:', err);
        setProducts([]);
      }

      try {
        // We do not require token for viewing shop offers in RuvoMobile
        const fetchedOffers = await getShopOffers(shopId);
        setOffers(fetchedOffers || []);
      } catch (err) {
        console.log('❌ Offers API error:', err);
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
      <View style={{ backgroundColor: colors.background }} className="flex-1">
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
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
      <View style={{ backgroundColor: colors.background }} className="flex-1">
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
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
      <View style={{ backgroundColor: colors.background }} className="flex-1">
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View className="flex-1 justify-center items-center px-6" style={{ paddingTop: insets.top }}>
          <View className="mb-4">
            <Ionicons name="storefront-outline" size={48} color={colors.textSecondary} />
          </View>
          <Text style={{ color: colors.textPrimary }} className="text-lg font-bold mb-2">
            Shop not found
          </Text>
          <Pressable
            className="bg-ruvo-yellow py-3 px-6 rounded-xl mt-6 flex-row items-center shadow-sm active:bg-ruvo-yellow-dark"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={16} color="#171A1F" />
            <Text className="text-black font-black ml-2">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const openTime = formatTime(shop.openingTime as unknown as string);
  const closeTime = formatTime(shop.closingTime as unknown as string);

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1">
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
          paddingBottom: Math.max(insets.bottom, 16) + 32,
        }}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View className="flex-1 py-8 px-6 items-center justify-center">
            <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="mb-4 w-16 h-16 rounded-full items-center justify-center border">
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
            <Text style={{ color: colors.textPrimary }} className="text-base font-extrabold mb-1 text-center">
              {searchText || activeCategory !== 'All'
                ? 'No products found'
                : 'No products yet'}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm text-center font-medium">
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
                <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-full h-56 flex items-center justify-center border-b">
                  <Ionicons
                    name="storefront-outline"
                    size={64}
                    color={colors.textSecondary}
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
                    style={{ borderColor: colors.primary }}
                    className="w-20 h-20 rounded-full bg-white border shadow-md"
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ backgroundColor: colors.card, borderColor: colors.primary }} className="w-20 h-20 rounded-full border flex items-center justify-center shadow-md">
                    <Ionicons
                      name="storefront"
                      size={32}
                      color={colors.textPrimary}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* SHOP INFORMATION CARD */}
            <View 
              style={{ backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#171A1F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, marginTop: -40 }}
              className="rounded-[20px] p-5 mb-6 mx-4 border"
            >
              <View className="mb-3">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text style={{ color: colors.textPrimary }} className="text-xl font-black mb-1">
                      {shop.name}
                    </Text>
                    {shop.category && (
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-wider">
                        {shop.category}
                      </Text>
                    )}
                  </View>

                  {shop.active === false ? (
                    <View className="flex-row items-center bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/30 gap-1.5">
                      <View className="w-2 h-2 rounded-full bg-rose-600" />
                      <Text className="text-xs font-black text-rose-500 uppercase">
                        Closed
                      </Text>
                    </View>
                  ) : shop.approved === false ? (
                    <View className="flex-row items-center bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 gap-1">
                      <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <Text className="text-[11px] font-bold text-amber-500">
                        Pending
                      </Text>
                    </View>
                  ) : null}
                </View>

                {shop.description && (
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-normal leading-5 mt-1">
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
              <View style={{ borderColor: colors.border }} className="flex-row justify-between py-3 border-t border-b">
                {shop.rating ? (
                  <View className="items-center flex-1">
                    <View className="flex-row items-center gap-1 mb-0.5">
                      <Ionicons name="star" size={14} color="#F4B400" />
                      <Text style={{ color: colors.textPrimary }} className="text-sm font-extrabold">
                        {shop.rating}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }} className="text-[11px] font-semibold">
                      Rating
                    </Text>
                  </View>
                ) : null}

                {shop.deliveryTime ? (
                  <View className="items-center flex-1">
                    <View className="flex-row items-center gap-1 mb-0.5">
                      <Ionicons name="time-outline" size={14} color={colors.textPrimary} />
                      <Text style={{ color: colors.textPrimary }} className="text-sm font-extrabold">
                        {shop.deliveryTime}m
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }} className="text-[11px] font-semibold">
                      Delivery
                    </Text>
                  </View>
                ) : null}

                {shop.minOrderAmount ? (
                  <View className="items-center flex-1">
                    <View className="flex-row items-center gap-1 mb-0.5">
                      <Text style={{ color: colors.textPrimary }} className="text-sm font-extrabold">
                        ₹{shop.minOrderAmount}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }} className="text-[11px] font-semibold">
                      Min Order
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* HOURS AND CONTACT */}
              <View className="pt-3 gap-2">
                {openTime && closeTime && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">
                      {openTime} - {closeTime}
                    </Text>
                  </View>
                )}

                {shop.phone && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="call-outline" size={15} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">{shop.phone}</Text>
                  </View>
                )}

                {shop.address && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold flex-1" numberOfLines={2}>
                      {shop.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* OFFERS SECTION */}
            {offers.length > 0 && (
              <View className="mb-6 px-4">
                <SectionHeader title="Available Offers" />
                <FlatList
                  data={offers}
                  keyExtractor={offer => offer.id!.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingRight: 16 }}
                  renderItem={({ item: offer }) => (
                    <View 
                      style={{ 
                        backgroundColor: colors.card,
                        borderColor: '#F4B400',
                        borderWidth: 1,
                        borderStyle: 'dashed'
                      }} 
                      className="rounded-xl p-3 shadow-sm min-w-[200px]"
                    >
                      <View className="flex-row items-center gap-2 mb-1.5">
                        <Ionicons name="pricetag" size={16} color="#F4B400" />
                        <Text style={{ color: colors.textPrimary }} className="font-black">
                          {offer.code}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-bold leading-4">
                        {offer.discountType === 'PERCENTAGE' 
                          ? `Get ${offer.discountValue}% OFF` 
                          : `Get ₹${offer.discountValue} OFF`}
                        {offer.minOrderValue ? ` on orders above ₹${offer.minOrderValue}` : ''}
                      </Text>
                      {offer.discountType === 'PERCENTAGE' && offer.maxDiscount && (
                        <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-1 font-semibold opacity-70">
                          Up to ₹${offer.maxDiscount}
                        </Text>
                      )}
                    </View>
                  )}
                />
              </View>
            )}

            {/* SEARCH BAR */}
            <View className="mb-4 px-0">
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-row items-center rounded-xl px-3.5 py-1 border">
                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  placeholder="Search products in this shop..."
                  value={searchText}
                  onChangeText={setSearchText}
                  style={{ color: colors.textPrimary }}
                  className="flex-1 py-2.5 pl-2.5 text-sm font-semibold"
                  placeholderTextColor={colors.textSecondary}
                />
                {searchText ? (
                  <Pressable onPress={() => setSearchText('')}>
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
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
                  renderItem={({ item: category }) => {
                    const isActive = activeCategory === category;
                    return (
                      <Pressable
                        onPress={() => setActiveCategory(category)}
                        style={{
                          backgroundColor: isActive ? (theme === 'dark' ? '#F4B400' : '#171A1F') : colors.card,
                          borderColor: isActive ? (theme === 'dark' ? '#F4B400' : '#171A1F') : colors.border,
                        }}
                        className="px-4 py-2 rounded-full mr-2 border"
                      >
                        <Text
                          style={{
                            color: isActive ? (theme === 'dark' ? '#171A1F' : '#FFFFFF') : colors.textPrimary,
                          }}
                          className="text-xs font-extrabold"
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  }}
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
