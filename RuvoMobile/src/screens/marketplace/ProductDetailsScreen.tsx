import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
    <View className="w-8 h-8 rounded-full bg-ruvo-yellow/20 items-center justify-center">
      <Ionicons
        name={icon}
        size={16}
        color="#F5B700"
      />
    </View>
    <View>
      <Text className="text-xs font-bold text-ruvo-ink">
        {title}
      </Text>
      <Text className="text-[10px] text-gray-500 mt-0.5">
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
    <View className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-2 border border-orange-100">
      <Ionicons
        name={icon}
        size={18}
        color="#EA580C"
      />
    </View>
    <Text className="text-xs text-gray-600">
      {title}
    </Text>
    <Text
      className="text-xs font-bold text-ruvo-ink mt-0.5 text-center"
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
        <Ionicons
          name="alert-circle-outline"
          size={50}
          color="#F5B700"
        />

        <Text className="text-lg font-bold text-ruvo-ink mt-3">
          Product not found
        </Text>

        <TouchableOpacity
          className="bg-ruvo-yellow px-6 py-3 rounded-lg mt-5"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold text-center">
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
        {/* PRODUCT IMAGE */}
        <View className="h-80 bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative items-center justify-center mb-2">
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
        </View>

        {/* PRODUCT INFO */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
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

          {/* BENEFITS */}
          <View className="bg-gray-50 border border-gray-100 rounded-xl mt-4 px-2 py-3.5 flex-row items-center shadow-sm">
            <Benefit
              icon="shield-checkmark-outline"
              title="100%"
              subtitle="Original"
            />

            <View className="w-px h-8 bg-gray-200 mx-1" />

            <Benefit
              icon="ribbon-outline"
              title="Quality"
              subtitle="Guaranteed"
            />

            <View className="w-px h-8 bg-gray-200 mx-1" />

            <Benefit
              icon="flash-outline"
              title="Fast"
              subtitle="Delivery"
            />
          </View>
        </View>

        {/* SHOP */}
        <View className="bg-white rounded-2xl p-4 mt-3 border border-gray-100 shadow-sm flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 items-center justify-center mr-3">
            <Ionicons
              name="storefront"
              size={20}
              color="#3B82F6"
            />
          </View>

          <View className="flex-1">
            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
              Sold by
            </Text>

            <Text className="text-ruvo-ink text-base font-black mt-0.5">
              {product.shopName || 'Local RuVo Shop'}
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
        </View>

        {/* PRODUCT DETAILS */}
        <View className="bg-white rounded-2xl p-5 mt-3 border border-gray-100 shadow-sm">
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
        </View>

        {/* QUANTITY */}
        {available && (
          <View className="bg-white rounded-2xl p-4 mt-3 mb-6 border border-gray-100 shadow-sm flex-row items-center justify-between">
            <Text className="text-ruvo-ink font-black text-sm uppercase tracking-wide">
              Quantity
            </Text>

            <View className="flex-row items-center bg-gray-50 rounded-full border border-gray-200 p-1">
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
          </View>
        )}

        <View className="h-28" />
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-gray-100 px-4 pt-3 pb-safe items-center shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
        <View className="flex-row w-full gap-3 pb-2">
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={!available}
            className={`flex-1 h-14 rounded-xl flex-row items-center justify-center gap-2 ${
              available
                ? 'bg-gray-100'
                : 'bg-gray-100 opacity-60'
            }`}
            onPress={handleAddToCart}
          >
            <Ionicons
              name="cart"
              size={20}
              color={available ? "#1A1A1A" : "#9CA3AF"}
            />
            <Text className={`font-black tracking-wide ${available ? 'text-ruvo-ink' : 'text-gray-400'}`}>
              Add to Cart
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            disabled={!available || submitting}
            className={`flex-1 h-14 rounded-xl flex-row items-center justify-center shadow-sm ${
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
      </View>
    </View>
  );
};

export default ProductDetailsScreen;