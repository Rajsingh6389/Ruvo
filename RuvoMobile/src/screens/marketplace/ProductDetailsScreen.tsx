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

type Product = {
  id?: number;
  shopId?: number;
  name: string;
  category?: string;
  brandName?: string;
  description?: string;
  actualPrice: number;
  sellingPrice: number;
  discount?: number;
  stockQuantity: number;
  unit?: string;
  imageUrl?: string;
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
    <Ionicons
      name={icon}
      size={22}
      color="#2E7D32"
    />
    <View>
      <Text className="text-xs font-bold text-ruvo-ink">
        {title}
      </Text>
      <Text className="text-xs text-gray-600 mt-0.5">
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
    <View className="w-9 h-9 rounded-lg bg-ruvo-accent-soft flex items-center justify-center mb-1.5">
      <Ionicons
        name={icon}
        size={17}
        color="#2E7D32"
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
          color="#2E7D32"
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
        <View className="h-80 bg-white rounded-2xl overflow-hidden border border-gray-200 relative items-center justify-center">
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              className="w-11/12 h-11/12"
              resizeMode="contain"
            />
          ) : (
            <View className="items-center justify-center">
              <Ionicons
                name="image-outline"
                size={65}
                color="#BFC7C0"
              />
              <Text className="text-xs text-gray-500 mt-2">
                No product image
              </Text>
            </View>
          )}

          {discount > 0 && (
            <View className="absolute left-3 bottom-3 bg-ruvo-accent px-3 py-2 rounded-lg">
              <Text className="text-white text-xs font-black">
                {discount}% OFF
              </Text>
            </View>
          )}

          <View className="absolute right-3 bottom-3 bg-white px-3 py-1.5 rounded-2xl">
            <Text className="text-ruvo-ink text-xs font-bold">
              1 / 1
            </Text>
          </View>
        </View>

        {/* PRODUCT INFO */}
        <View className="bg-white rounded-lg p-4 mt-2.5 border border-gray-200">
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
              className={`px-2 py-1.5 rounded-lg border ${
                available
                  ? 'bg-ruvo-accent-soft border-ruvo-accent'
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <Text
                className={`text-xs font-black ${
                  available
                    ? 'text-ruvo-accent'
                    : 'text-red-600'
                }`}
              >
                {available
                  ? 'In Stock'
                  : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* RATING */}
          <View className="flex-row items-center mb-3">
            <View className="bg-ruvo-accent px-2 py-1 rounded flex-row items-center gap-1">
              <Ionicons
                name="star"
                size={15}
                color="#FFFFFF"
              />
              <Text className="text-white text-xs font-black">
                4.6
              </Text>
            </View>

            <Text className="text-gray-600 text-xs ml-2">
              128 reviews
            </Text>
          </View>

          {/* PRICE */}
          <View className="flex-row items-center mb-3">
            <Text className="text-3xl font-black text-ruvo-accent">
              ₹{product.sellingPrice}
            </Text>

            {product.actualPrice >
              product.sellingPrice && (
              <Text className="text-gray-500 text-sm ml-2 line-through">
                ₹{product.actualPrice}
              </Text>
            )}

            {discount > 0 && (
              <View className="bg-ruvo-accent-soft px-2 py-1 rounded ml-2">
                <Text className="text-ruvo-accent text-xs font-black">
                  {discount}% OFF
                </Text>
              </View>
            )}
          </View>

          {product.unit && (
            <Text className="text-gray-600 text-xs">
              ₹
              {(
                product.sellingPrice /
                parseUnit(product.unit)
              ).toFixed(2)}{' '}
              per unit
            </Text>
          )}

          {/* BENEFITS */}
          <View className="bg-green-50 rounded-lg mt-3 px-2 py-3 flex-row items-center">
            <Benefit
              icon="shield-checkmark-outline"
              title="100%"
              subtitle="Original"
            />

            <View className="w-px h-8 bg-green-200 mx-1" />

            <Benefit
              icon="ribbon-outline"
              title="Quality"
              subtitle="Guaranteed"
            />

            <View className="w-px h-8 bg-green-200 mx-1" />

            <Benefit
              icon="bicycle-outline"
              title="Fast"
              subtitle="Delivery"
            />
          </View>
        </View>

        {/* SHOP */}
        <View className="bg-white rounded-lg p-3 mt-2.5 border border-gray-200 flex-row items-center">
          <View className="w-14 h-14 rounded-xl bg-ruvo-accent-soft items-center justify-center mr-3">
            <Ionicons
              name="storefront"
              size={25}
              color="#2E7D32"
            />
          </View>

          <View className="flex-1">
            <Text className="text-gray-600 text-xs">
              Sold by
            </Text>

            <Text className="text-ruvo-ink text-base font-black mt-0.5">
              Local RuVo Shop
            </Text>

            <View className="flex-row items-center mt-0.5">
              <Ionicons
                name="location-outline"
                size={14}
                color="#2E7D32"
              />

              <Text className="text-gray-600 text-xs ml-0.5">
                Nearby shop
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            className="border border-ruvo-accent px-2.5 py-2 rounded-lg"
            onPress={() => {
              if (product.shopId) {
                navigation.navigate('ShopDetails', {
                  shopId: product.shopId,
                });
              }
            }}
          >
            <Text className="text-ruvo-accent text-xs font-black">
              View Shop
            </Text>
          </TouchableOpacity>
        </View>

        {/* PRODUCT DETAILS */}
        <View className="bg-white rounded-lg p-3.5 mt-2.5 border border-gray-200">
          <Text className="text-base font-black text-ruvo-ink mb-2">
            Product Details
          </Text>

          <Text className="text-gray-600 text-sm leading-5 mb-3">
            {product.description ||
              'Quality product available from your nearby local shop on RuVo.'}
          </Text>

          <View className="flex-row items-stretch">
            <Spec
              icon="pricetag-outline"
              title="Brand"
              value={product.brandName || 'N/A'}
            />

            <View className="w-px bg-gray-200 mx-0.5" />

            <Spec
              icon="cube-outline"
              title="Category"
              value={product.category || 'General'}
            />

            <View className="w-px bg-gray-200 mx-0.5" />

            <Spec
              icon="layers-outline"
              title="Stock"
              value={`${product.stockQuantity}`}
            />
          </View>
        </View>

        {/* QUANTITY */}
        {available && (
          <View className="bg-white rounded-lg p-3.5 mt-2.5 border border-gray-200 flex-row items-center justify-between">
            <Text className="text-ruvo-ink font-black">
              Quantity
            </Text>

            <View className="flex-row items-center border border-gray-200 rounded overflow-hidden">
              <TouchableOpacity
                activeOpacity={0.7}
                className="w-10 h-10 items-center justify-center bg-gray-50"
                onPress={decreaseQuantity}
              >
                <Ionicons
                  name="remove"
                  size={19}
                  color="#2E7D32"
                />
              </TouchableOpacity>

              <Text className="w-10 text-center text-ruvo-ink font-bold">
                {quantity}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                className="w-10 h-10 items-center justify-center bg-gray-50"
                onPress={increaseQuantity}
              >
                <Ionicons
                  name="add"
                  size={19}
                  color="#2E7D32"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="h-28" />
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-gray-200 px-3 pt-2.5 pb-3.5 flex-row gap-2.5">

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={!available}
          className={`flex-1 h-14 rounded-lg flex-row items-center justify-center gap-2 ${
            available
              ? 'bg-ruvo-accent'
              : 'bg-gray-400'
          }`}
          onPress={handleAddToCart}
        >
          <Ionicons
            name="cart-outline"
            size={21}
            color="#FFFFFF"
          />

          <Text className="text-white font-black">
            Add to Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={!available || submitting}
          className={`flex-1 h-14 rounded-lg border-2 items-center justify-center ${
            !available || submitting
              ? 'border-gray-400'
              : 'border-ruvo-accent'
          }`}
          onPress={handleBuyNow}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#2E7D32" />
          ) : (
            <Text
              className={`font-black ${
                !available
                  ? 'text-gray-600'
                  : 'text-ruvo-accent'
              }`}
            >
              Buy Now
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProductDetailsScreen;