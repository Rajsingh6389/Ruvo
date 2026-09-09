import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { ROUTES } from '../../constants/routes';
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) => (
  <View className="flex-1 flex-row items-center justify-center gap-2">
    <View className="w-8 h-8 rounded-full bg-ruvo-yellow-soft border border-ruvo-border items-center justify-center">
      <Ionicons
        name={icon}
        size={16}
        color="#F4B400"
      />
    </View>
    <View>
      <Text className="text-xs font-bold text-ruvo-ink">
        {title}
      </Text>
      <Text className="text-[10px] text-ruvo-muted mt-0.5">
        {subtitle}
      </Text>
    </View>
  </View>
);

const Spec = ({
  icon,
  title,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}) => (
  <View className="flex-1 items-center">
    <View className="w-10 h-10 rounded-xl bg-ruvo-card flex items-center justify-center mb-2 border border-ruvo-border">
      <Ionicons
        name={icon}
        size={18}
        color="#171A1F"
      />
    </View>
    <Text className="text-xs text-ruvo-muted font-medium">
      {title}
    </Text>
    <Text
      className="text-xs font-black text-ruvo-ink mt-0.5 text-center"
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

  // Expected navigation: navigation.navigate(ROUTES.PRODUCT_DETAILS, { product: item })
  const product: Product | undefined = route.params?.product;

  const [quantity, setQuantity] = useState(1);
  const [favorite, setFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchedShopName, setFetchedShopName] = useState<string | null>(null);
  const [fetchedShopLogo, setFetchedShopLogo] = useState<string | null>(null);

  // Fetch shop details dynamically if product has a shopId
  React.useEffect(() => {
    if (product?.shopId) {
      fetch(`${API_BASE_URL}/api/shops/${product.shopId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.name) setFetchedShopName(data.name);
          if (data && (data.logoUrl || data.logo || data.image || data.imageUrl)) {
            setFetchedShopLogo(formatImageUrl(data.logoUrl || data.logo || data.image || data.imageUrl));
          }
        })
        .catch(() => {});
    }
  }, [product?.shopId, product?.shopName]);

  // BUSINESS LOGIC: Authentication and cart management
  const { isAuthenticated, userId, token, user } = useAuth();
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
      <View className="flex-1 bg-ruvo-bg items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-ruvo-yellow-soft items-center justify-center border border-ruvo-border mb-3">
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color="#F4B400"
          />
        </View>

        <Text className="text-lg font-black text-ruvo-ink mt-2">
          Product not found
        </Text>

        <TouchableOpacity
          className="bg-ruvo-yellow px-6 py-3 rounded-xl mt-5 shadow-sm active:bg-ruvo-yellow-dark"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-ruvo-ink font-black text-center text-sm">
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
    <View className="flex-1 bg-ruvo-bg">

      {/* HEADER */}
      <View className="h-14 px-3 bg-white flex-row items-center justify-between">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-ruvo-bg items-center justify-center"
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#1A1A1A"
          />
        </TouchableOpacity>

        <View className="flex-row gap-2">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-ruvo-bg items-center justify-center"
            activeOpacity={0.75}
            onPress={() => setFavorite(prev => !prev)}
          >
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={23}
              color={favorite ? '#D32F2F' : '#1A1A1A'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-ruvo-bg items-center justify-center"
            activeOpacity={0.75}
          >
            <Ionicons
              name="share-social-outline"
              size={22}
              color="#1A1A1A"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 5 }}
      >
        {/* PRODUCT IMAGE - 3D FLOATING */}
        <Animated.View 
          entering={FadeInDown.duration(700).springify()} 
          className="h-[360px] bg-white rounded-[40px] overflow-hidden relative items-center justify-center mb-6 border-4 border-white"
          style={{ shadowColor: '#F5B700', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 12, transform: [{ perspective: 1000 }, { rotateX: '2deg' }] }}
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
                color="#E5E7EB"
              />
              <Text className="text-xs text-gray-400 mt-2 font-medium">
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

        {/* PRODUCT INFO */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600).springify()} 
          className="bg-white rounded-[28px] p-6 mb-4 border border-gray-50/50"
          style={{ shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 }}
        >
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1 pr-2">
              <Text className="text-2xl font-black text-ruvo-ink">
                {product.name}
              </Text>

              {product.unit && (
                <Text className="text-sm text-gray-600 mt-0.5">
                  {product.unit}
                </Text>
              )}
            </View>

            <View
              className={`px-3 py-1.5 rounded-full border ${
                available
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <Text
                className={`text-[10px] uppercase tracking-widest font-black ${
                  available
                    ? 'text-green-700'
                    : 'text-red-700'
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

              <Text className="text-gray-600 text-xs ml-2">
                {product.reviewsCount || 0} reviews
              </Text>
            </View>
          ) : (
            <View className="mb-2" />
          )}

          {/* PRICE */}
          <View className="flex-row items-end mb-3 gap-2">
            <Text className="text-3xl font-black text-ruvo-ink tracking-tight">
              ₹{product.sellingPrice || product.price || 0}
            </Text>

            {(product.actualPrice || product.originalPrice || 0) >
              (product.sellingPrice || product.price || 0) && (
              <Text className="text-gray-400 text-base font-semibold mb-1 line-through">
                ₹{product.actualPrice || product.originalPrice}
              </Text>
            )}

            {discount > 0 && (
              <View className="bg-red-50 px-2 py-1 rounded border border-red-100 mb-1.5">
                <Text className="text-red-600 text-[10px] font-black uppercase">
                  Save {discount}%
                </Text>
              </View>
            )}
          </View>

          {product.unit && (product.sellingPrice || product.price) ? (
            <Text className="text-gray-600 text-xs">
              ₹
              {(
                (product.sellingPrice || product.price || 0) /
                parseUnit(product.unit)
              ).toFixed(2)}{' '}
              per unit
            </Text>
          ) : null}

          {/* BENEFITS - GLASS/CHIPS */}
          <View className="bg-gray-50/70 border border-gray-100 rounded-[20px] mt-4 px-2 py-4 flex-row items-center shadow-sm">
            <Benefit
              icon="shield-checkmark-outline"
              title="100%"
              subtitle="Original"
            />

            <View className="w-px h-10 bg-gray-200/60 mx-1" />

            <Benefit
              icon="ribbon-outline"
              title="Quality"
              subtitle="Guaranteed"
            />

            <View className="w-px h-10 bg-gray-200/60 mx-1" />

            <Benefit
              icon="flash-outline"
              title="Fast"
              subtitle="Delivery"
            />
          </View>
        </Animated.View>

        {/* SHOP */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600).springify()} 
          className="bg-white rounded-[28px] p-5 mb-4 border border-gray-50/50 flex-row items-center"
          style={{ shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 }}
        >
          <View className="w-14 h-14 rounded-full bg-ruvo-bg items-center justify-center mr-4 overflow-hidden shadow-sm border border-gray-100">
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
            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
              Sold by
            </Text>

            <Text className="text-ruvo-ink text-base font-black mt-0.5">
              {product.shopName || fetchedShopName || (product.shopId ? `Shop #${product.shopId}` : 'RuVo Store')}
            </Text>

            <View className="flex-row items-center mt-1 opacity-70">
              <Ionicons
                name="location"
                size={12}
                color="#6B7280"
              />

              <Text className="text-gray-600 text-xs ml-1 font-medium">
                Nearby shop
              </Text>
            </View>
          </View>


          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-gray-100 px-4 py-2 rounded-full"
            onPress={() => {
              if (product.shopId) {
                navigation.navigate('ShopDetails', {
                  shopId: product.shopId,
                });
              }
            }}
          >
            <Text className="text-ruvo-ink text-xs font-black">
              Visit
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* PRODUCT DETAILS */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(600).springify()} 
          className="bg-white rounded-[28px] p-6 mb-4 border border-gray-50/50"
          style={{ shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 }}
        >
          <Text className="text-sm font-black text-ruvo-ink uppercase tracking-wider mb-2">
            Product Details
          </Text>

          <Text className="text-gray-600 text-sm leading-6 mb-4">
            {product.description ||
              'Quality product available from your nearby local shop on RuVo. Guaranteed authentic.'}
          </Text>

          <View className="flex-row items-stretch pt-2 border-t border-gray-100">
            <Spec
              icon="pricetag-outline"
              title="Brand"
              value={product.brandName || 'N/A'}
            />

            <View className="w-[1px] bg-gray-100 rounded-full mx-2" />

            <Spec
              icon="cube-outline"
              title="Category"
              value={product.category || 'General'}
            />

            <View className="w-[1px] bg-gray-100 rounded-full mx-2" />

            <Spec
              icon="layers-outline"
              title="Stock"
              value={`${product.stockQuantity}`}
            />
          </View>
        </Animated.View>

        {/* QUANTITY */}
        {available && (
          <Animated.View 
            entering={FadeInDown.delay(400).duration(600).springify()} 
            className="bg-white rounded-[28px] p-5 mb-8 border border-gray-50/50 flex-row items-center justify-between"
            style={{ shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 }}
          >
            <Text className="text-ruvo-ink font-black text-base uppercase tracking-widest pl-2">
              Quantity
            </Text>

            <View className="flex-row items-center bg-gray-50 rounded-full border border-gray-200 p-1.5 min-w-[120px] justify-between shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <TouchableOpacity
                activeOpacity={0.7}
                className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm"
                onPress={decreaseQuantity}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color="#1A1A1A"
                />
              </TouchableOpacity>

              <Text className="w-10 text-center text-ruvo-ink font-bold">
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

      {/* BOTTOM ACTIONS - 3D FROSTED GLASS */}
      <Animated.View 
        entering={FadeInDown.delay(300).duration(500).springify()}
        className="absolute left-0 right-0 bottom-0 overflow-hidden rounded-t-[40px] border-t border-white/80"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 20 }}
      >
        <BlurView intensity={80} tint="light" className="px-5 pt-5 pb-safe items-center bg-white/70">
          <View className="flex-row w-full gap-4 pb-3">
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={!available}
            className={`flex-1 h-16 rounded-[20px] flex-row items-center justify-center gap-2 ${
              available
                ? 'bg-gray-100'
                : 'bg-gray-100 opacity-60'
            }`}
            onPress={handleAddToCart}
          >
            <Ionicons
              name="cart"
              size={22}
              color={available ? "#1A1A1A" : "#9CA3AF"}
            />
            <Text className={`text-[15px] font-black tracking-wide ${available ? 'text-ruvo-ink' : 'text-gray-400'}`}>
              Add to Cart
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            disabled={!available || submitting}
            className={`flex-1 h-16 rounded-[20px] flex-row items-center justify-center shadow-sm ${
              !available || submitting
                ? 'bg-gray-300'
                : 'bg-ruvo-yellow'
            }`}
            onPress={handleBuyNow}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#1A1A1A" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color={available ? "#1A1A1A" : "#9CA3AF"} />
                <Text
                  className={`font-black tracking-wide ml-1 ${
                    !available
                      ? 'text-gray-500'
                      : 'text-ruvo-ink'
                  }`}
                >
                  Buy Now
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