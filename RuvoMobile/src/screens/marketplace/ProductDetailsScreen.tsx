import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const formatImageUrl = (url?: string) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

type Product = {
  id?: number;
  shopId?: number;
  shopName?: string;
  rating?: number;
  reviewsCount?: number;
  name: string;
  category?: string;
  brandName?: string;
  description?: string;
  actualPrice: number;
  originalPrice?: number;
  sellingPrice: number;
  price?: number;
  discount?: number;
  stockQuantity: number;
  unit?: string;
  imageUrl?: string;
  image?: string;
  isAvailable?: boolean;
};

/* -------------------------------------------------- */
/* SMALL COMPONENTS */
/* -------------------------------------------------- */

const Benefit = ({
  icon,
  title,
  subtitle,
  textColorPrimary,
  textColorSecondary,
  surfaceBg,
  borderColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  textColorPrimary: string;
  textColorSecondary: string;
  surfaceBg: string;
  borderColor: string;
}) => (
  <View className="flex-1 flex-row items-center justify-center gap-2">
    <View style={{ backgroundColor: surfaceBg, borderColor }} className="w-8 h-8 rounded-full border items-center justify-center">
      <Ionicons
        name={icon}
        size={16}
        color="#F4B400"
      />
    </View>
    <View>
      <Text style={{ color: textColorPrimary }} className="text-xs font-bold">
        {title}
      </Text>
      <Text style={{ color: textColorSecondary }} className="text-[10px] mt-0.5">
        {subtitle}
      </Text>
    </View>
  </View>
);

const Spec = ({
  icon,
  title,
  value,
  cardBg,
  borderColor,
  textColorPrimary,
  textColorSecondary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  cardBg: string;
  borderColor: string;
  textColorPrimary: string;
  textColorSecondary: string;
}) => (
  <View className="flex-1 items-center">
    <View style={{ backgroundColor: cardBg, borderColor }} className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border">
      <Ionicons
        name={icon}
        size={18}
        color={textColorPrimary}
      />
    </View>
    <Text style={{ color: textColorSecondary }} className="text-xs font-medium">
      {title}
    </Text>
    <Text
      style={{ color: textColorPrimary }}
      className="text-xs font-black mt-0.5 text-center"
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const parseUnit = (unit: string) => {
  const number = parseFloat(unit);
  if (!Number.isNaN(number) && number > 0) {
    return number;
  }
  return 1;
};

const ProductDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme, colors } = useTheme();

  const product: Product | undefined = route.params?.product;
  const initialIsShopOffline: boolean = route.params?.isShopOffline ?? false;

  const [quantity, setQuantity] = useState(1);
  const [favorite, setFavorite] = useState(false);
  const [submitting] = useState(false);
  const [fetchedShopName, setFetchedShopName] = useState<string | null>(null);
  const [fetchedShopLogo, setFetchedShopLogo] = useState<string | null>(null);
  const [isShopOffline, setIsShopOffline] = useState<boolean>(initialIsShopOffline);

  React.useEffect(() => {
    if (product?.shopId) {
      fetch(`${API_BASE_URL}/api/shops/${product.shopId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.name) setFetchedShopName(data.name);
          if (data && (data.logoUrl || data.logo || data.image || data.imageUrl)) {
            setFetchedShopLogo(formatImageUrl(data.logoUrl || data.logo || data.image || data.imageUrl));
          }
          if (data && data.active === false) {
            setIsShopOffline(true);
          }
        })
        .catch(() => {});
    }
  }, [product?.shopId, product?.shopName]);

  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      showToast('Please login to add items', 'info');
      return;
    }
    if (!product) return;
    addToCart(
      {
        ...product,
        id: product.id!,
        shopId: product.shopId ?? 0,
        category: product.category ?? '',
      },
      quantity,
    );
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      showToast('Please login to purchase', 'info');
      return;
    }
    navigation.navigate('Checkout', { product, quantity });
  };

  const discount = useMemo(() => {
    if (product?.discount !== undefined) {
      return Math.round(product.discount);
    }

    if (
      product?.actualPrice &&
      product.actualPrice > product.sellingPrice
    ) {
      return Math.round(
        ((product.actualPrice - product.sellingPrice) /
          product.actualPrice) *
          100,
      );
    }

    return 0;
  }, [product]);

  if (!product) {
    return (
      <View style={{ backgroundColor: colors.background }} className="flex-1 items-center justify-center px-6">
        <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="w-16 h-16 rounded-full items-center justify-center border mb-3">
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color="#F4B400"
          />
        </View>

        <Text style={{ color: colors.textPrimary }} className="text-lg font-black mt-2">
          Product not found
        </Text>

        <TouchableOpacity
          className="bg-ruvo-yellow px-6 py-3 rounded-xl mt-5 shadow-sm active:bg-ruvo-yellow-dark"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-black font-black text-center text-sm">
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const available =
    product.isAvailable !== false &&
    product.stockQuantity > 0;

  const increaseQuantity = () => {
    if (quantity < product.stockQuantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1">

      {/* HEADER */}
      <View style={{ backgroundColor: colors.surface }} className="h-14 px-3 flex-row items-center justify-between border-b border-transparent">
        <TouchableOpacity
          style={{ backgroundColor: colors.background }}
          className="w-10 h-10 rounded-full items-center justify-center"
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View className="flex-row gap-2">
          <TouchableOpacity
            style={{ backgroundColor: colors.background }}
            className="w-10 h-10 rounded-full items-center justify-center"
            activeOpacity={0.75}
            onPress={() => setFavorite(prev => !prev)}
          >
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={23}
              color={favorite ? '#D32F2F' : colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: colors.background }}
            className="w-10 h-10 rounded-full items-center justify-center"
            activeOpacity={0.75}
          >
            <Ionicons
              name="share-social-outline"
              size={22}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 5 }}
      >
        {/* PRODUCT IMAGE */}
        <Animated.View 
          entering={FadeInDown.duration(700).springify()} 
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: '#F5B700', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 12, transform: [{ perspective: 1000 }, { rotateX: '2deg' }]
          }}
          className="h-[360px] rounded-[40px] overflow-hidden relative items-center justify-center mb-6 border-4"
        >
          {(product.imageUrl || product.image) ? (
            <Image
              source={{ uri: formatImageUrl(product.imageUrl || product.image)! }}
              className="w-full h-full"
              resizeMode="contain"
            />
          ) : (
            <View className="items-center justify-center">
              <Ionicons
                name="image-outline"
                size={65}
                color={colors.textSecondary}
              />
              <Text style={{ color: colors.textSecondary }} className="text-xs mt-2 font-medium">
                No product image
              </Text>
            </View>
          )}

          {discount > 0 && (
            <View className="absolute left-4 top-4 bg-red-500 px-3 py-1.5 rounded-full shadow-sm">
              <Text className="text-white text-xs font-black">
                {discount}% OFF
              </Text>
            </View>
          )}

          <View className="absolute right-4 bottom-4 bg-black/60 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-bold tracking-widest">
              1 / 1
            </Text>
          </View>
        </Animated.View>

        {/* SHOP CLOSED BANNER */}
        {isShopOffline && (
          <Animated.View 
            entering={FadeInDown.delay(50).duration(500)}
            className="bg-zinc-900 border border-zinc-800 rounded-[24px] p-4 mb-4 flex-row items-center gap-3 shadow-md"
          >
            <View className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center border border-zinc-700">
              <Ionicons name="time-outline" size={20} color="#F4B400" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-black text-white uppercase tracking-wider">TEMPORARILY CLOSED FOR NOW</Text>
              <Text className="text-[11px] font-semibold text-zinc-300 mt-0.5 leading-4">
                Shopkeeper is on a short break. Products are available for viewing and will reopen for orders soon!
              </Text>
            </View>
          </Animated.View>
        )}

        {/* PRODUCT INFO */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600).springify()} 
          style={{ backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 }}
          className="rounded-[28px] p-6 mb-4 border"
        >
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1 pr-2">
              <Text style={{ color: colors.textPrimary }} className="text-2xl font-black">
                {product.name}
              </Text>

              {product.unit && (
                <Text style={{ color: colors.textSecondary }} className="text-sm mt-0.5">
                  {product.unit}
                </Text>
              )}
            </View>

            <View
              className={`px-3 py-1.5 rounded-full border ${
                available
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <Text
                className={`text-[10px] uppercase tracking-widest font-black ${
                  available
                    ? 'text-green-600'
                    : 'text-red-500'
                }`}
              >
                {available
                  ? 'In Stock'
                  : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* RATING */}
          {product.rating ? (
            <View className="flex-row items-center mb-4">
              <View className="bg-ruvo-yellow px-2 py-1 rounded-md flex-row items-center gap-1 shadow-sm">
                <Ionicons
                  name="star"
                  size={12}
                  color="#FFFFFF"
                />
                <Text className="text-white text-xs font-black">
                  {product.rating}
                </Text>
              </View>

              <Text style={{ color: colors.textSecondary }} className="text-xs ml-2">
                {product.reviewsCount || 0} reviews
              </Text>
            </View>
          ) : (
            <View className="mb-2" />
          )}

          {/* PRICE */}
          <View className="flex-row items-end mb-3 gap-2">
            <Text style={{ color: colors.textPrimary }} className="text-3xl font-black tracking-tight">
              ₹{product.sellingPrice || product.price || 0}
            </Text>

            {(product.actualPrice || product.originalPrice || 0) >
              (product.sellingPrice || product.price || 0) && (
              <Text style={{ color: colors.textSecondary }} className="text-base font-semibold mb-1 line-through">
                ₹{product.actualPrice || product.originalPrice}
              </Text>
            )}

            {discount > 0 && (
              <View className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20 mb-1.5">
                <Text className="text-red-500 text-[10px] font-black uppercase">
                  Save {discount}%
                </Text>
              </View>
            )}
          </View>

          {product.unit && (product.sellingPrice || product.price) ? (
            <Text style={{ color: colors.textSecondary }} className="text-xs">
              ₹
              {(
                (product.sellingPrice || product.price || 0) /
                parseUnit(product.unit)
              ).toFixed(2)}{' '}
              per unit
            </Text>
          ) : null}

          {/* BENEFITS */}
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="border rounded-[20px] mt-4 px-2 py-4 flex-row items-center shadow-sm">
            <Benefit
              icon="shield-checkmark-outline"
              title="100%"
              subtitle="Original"
              textColorPrimary={colors.textPrimary}
              textColorSecondary={colors.textSecondary}
              surfaceBg={colors.background}
              borderColor={colors.border}
            />

            <View style={{ backgroundColor: colors.border }} className="w-px h-10 mx-1" />

            <Benefit
              icon="ribbon-outline"
              title="Quality"
              subtitle="Guaranteed"
              textColorPrimary={colors.textPrimary}
              textColorSecondary={colors.textSecondary}
              surfaceBg={colors.background}
              borderColor={colors.border}
            />

            <View style={{ backgroundColor: colors.border }} className="w-px h-10 mx-1" />

            <Benefit
              icon="flash-outline"
              title="Fast"
              subtitle="Delivery"
              textColorPrimary={colors.textPrimary}
              textColorSecondary={colors.textSecondary}
              surfaceBg={colors.background}
              borderColor={colors.border}
            />
          </View>
        </Animated.View>

        {/* SHOP */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600).springify()} 
          style={{ backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 }}
          className="rounded-[28px] p-5 mb-4 border flex-row items-center"
        >
          <View style={{ backgroundColor: colors.background, borderColor: colors.border }} className="w-14 h-14 rounded-full items-center justify-center mr-4 overflow-hidden shadow-sm border">
            {fetchedShopLogo ? (
              <Image
                source={{ uri: fetchedShopLogo }}
                style={{ width: '100%', height: '100%', borderRadius: 999 }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-ruvo-yellow/10 border border-ruvo-yellow/20 items-center justify-center">
                <Ionicons name="storefront" size={22} color="#F5B700" />
              </View>
            )}
          </View>

          <View className="flex-1">
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">
              Sold by
            </Text>

            <Text style={{ color: colors.textPrimary }} className="text-base font-black mt-0.5">
              {product.shopName || fetchedShopName || (product.shopId ? `Shop #${product.shopId}` : 'RuVo Store')}
            </Text>

            <View className="flex-row items-center mt-1 opacity-70">
              <Ionicons
                name="location"
                size={12}
                color={colors.textSecondary}
              />

              <Text style={{ color: colors.textSecondary }} className="text-xs ml-1 font-medium">
                Nearby shop
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={{ backgroundColor: colors.surface }}
            className="px-4 py-2 rounded-full border border-transparent"
            onPress={() => {
              if (product.shopId) {
                navigation.navigate('ShopDetails', {
                  shopId: product.shopId,
                });
              }
            }}
          >
            <Text style={{ color: colors.textPrimary }} className="text-xs font-black">
              Visit
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* PRODUCT DETAILS */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(600).springify()} 
          style={{ backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 }}
          className="rounded-[28px] p-6 mb-4 border"
        >
          <Text style={{ color: colors.textPrimary }} className="text-sm font-black uppercase tracking-wider mb-2">
            Product Details
          </Text>

          <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 mb-4">
            {product.description ||
              'Quality product available from your nearby local shop on RuVo. Guaranteed authentic.'}
          </Text>

          <View style={{ borderTopColor: colors.border }} className="flex-row items-stretch pt-2 border-t">
            <Spec
              icon="pricetag-outline"
              title="Brand"
              value={product.brandName || 'N/A'}
              cardBg={colors.surface}
              borderColor={colors.border}
              textColorPrimary={colors.textPrimary}
              textColorSecondary={colors.textSecondary}
            />

            <View style={{ backgroundColor: colors.border }} className="w-[1px] rounded-full mx-2" />

            <Spec
              icon="cube-outline"
              title="Category"
              value={product.category || 'General'}
              cardBg={colors.surface}
              borderColor={colors.border}
              textColorPrimary={colors.textPrimary}
              textColorSecondary={colors.textSecondary}
            />

            <View style={{ backgroundColor: colors.border }} className="w-[1px] rounded-full mx-2" />

            <Spec
              icon="layers-outline"
              title="Stock"
              value={`${product.stockQuantity}`}
              cardBg={colors.surface}
              borderColor={colors.border}
              textColorPrimary={colors.textPrimary}
              textColorSecondary={colors.textSecondary}
            />
          </View>
        </Animated.View>

        {/* QUANTITY */}
        {available && (
          <Animated.View 
            entering={FadeInDown.delay(400).duration(600).springify()} 
            style={{ backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 }}
            className="rounded-[28px] p-5 mb-8 border flex-row items-center justify-between"
          >
            <Text style={{ color: colors.textPrimary }} className="font-black text-base uppercase tracking-widest pl-2">
              Quantity
            </Text>

            <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="flex-row items-center rounded-full border p-1.5 min-w-[120px] justify-between">
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ backgroundColor: colors.card }}
                className="w-8 h-8 rounded-full items-center justify-center shadow-sm"
                onPress={decreaseQuantity}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>

              <Text style={{ color: colors.textPrimary }} className="w-10 text-center font-bold">
                {quantity}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                className="w-8 h-8 rounded-full bg-ruvo-yellow items-center justify-center shadow-sm"
                onPress={increaseQuantity}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color="#1A1A1A"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <View className="h-28" />
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <Animated.View 
        entering={FadeInDown.delay(300).duration(500).springify()}
        style={{ borderColor: colors.border }}
        className="absolute left-0 right-0 bottom-0 overflow-hidden rounded-t-[40px] border-t"
      >
        <BlurView intensity={80} tint={theme === 'dark' ? 'dark' : 'light'} className="px-5 pt-5 pb-safe items-center">
          <View className="flex-row w-full gap-4 pb-3">
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={!available || isShopOffline}
            style={{ backgroundColor: colors.surface }}
            className={`flex-1 h-16 rounded-[20px] flex-row items-center justify-center gap-2 ${
              available && !isShopOffline
                ? 'opacity-100'
                : 'opacity-50'
            }`}
            onPress={handleAddToCart}
          >
            <Ionicons
              name="cart"
              size={22}
              color={available && !isShopOffline ? colors.textPrimary : colors.textSecondary}
            />
            <Text style={{ color: available && !isShopOffline ? colors.textPrimary : colors.textSecondary }} className="text-[15px] font-black tracking-wide">
              Add to Cart
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            disabled={!available || submitting || isShopOffline}
            className={`flex-1 h-16 rounded-[20px] flex-row items-center justify-center shadow-sm ${
              !available || submitting || isShopOffline
                ? 'bg-zinc-800'
                : 'bg-ruvo-yellow'
            }`}
            onPress={handleBuyNow}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name={isShopOffline ? "moon" : "flash"} size={18} color={available && !isShopOffline ? "#1A1A1A" : "#9CA3AF"} />
                <Text
                  className={`font-black tracking-wide ml-1 ${
                    !available || isShopOffline
                      ? 'text-zinc-400'
                      : 'text-black'
                  }`}
                >
                  {isShopOffline ? 'Shop Closed' : 'Buy Now'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

export default ProductDetailsScreen;