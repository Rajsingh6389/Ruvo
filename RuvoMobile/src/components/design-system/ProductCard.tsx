import React, { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  showDiscount?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  showDiscount = true,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const originalPrice = product.originalPrice || product.price;
  const discount = showDiscount && originalPrice > product.price
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0;

  const rating = product.rating || 0;
  const reviewCount = product.reviewCount || 0;

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 ruvo-card mx-xs mb-md overflow-hidden"
    >
      {/* Image Container */}
      <View className="w-full h-28 bg-warm-200 mb-md relative overflow-hidden rounded-lg">
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-warm-300 items-center justify-center">
            <Ionicons name="image" size={32} color="#A79E92" />
          </View>
        )}

        {/* Favorite Button */}
        <Pressable
          onPress={() => setIsFavorite(!isFavorite)}
          className="absolute top-xs right-xs bg-ruvo-surface rounded-full p-xs"
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? '#DC2626' : '#A79E92'}
          />
        </Pressable>

        {/* Discount Badge */}
        {discount > 0 && (
          <View className="absolute top-xs left-xs bg-ruvo-error px-sm py-xs rounded-md">
            <Text className="text-white text-xs font-bold">
              {discount}% OFF
            </Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View className="px-md pb-md flex-1 justify-between">
        {/* Name & Category */}
        <View className="mb-xs">
          <Text className="text-sm font-semibold text-ruvo-ink" numberOfLines={2}>
            {product.name}
          </Text>
          {product.variant && (
            <Text className="text-xs text-warm-600 mt-xs">
              {product.variant}
            </Text>
          )}
        </View>

        {/* Rating */}
        {rating > 0 && (
          <View className="flex-row items-center mb-xs">
            <Ionicons name="star" size={14} color="#F5B700" />
            <Text className="text-xs text-warm-700 ml-xs">
              {rating.toFixed(1)} ({reviewCount})
            </Text>
          </View>
        )}

        {/* Price */}
        <View className="flex-row items-center mb-md">
          <Text className="text-lg font-bold text-ruvo-ink">
            ₹{product.price.toFixed(0)}
          </Text>
          {originalPrice > product.price && (
            <Text className="text-sm text-warm-500 line-through ml-sm">
              ₹{originalPrice.toFixed(0)}
            </Text>
          )}
        </View>

        {/* Add to Cart Button */}
        {onAddToCart && (
          <Pressable
            onPress={onAddToCart}
            className="bg-ruvo-yellow rounded-lg py-xs flex-row items-center justify-center"
          >
            <Ionicons name="add" size={18} color="#231C10" />
            <Text className="text-sm font-bold text-ruvo-ink ml-xs">
              Add
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};
