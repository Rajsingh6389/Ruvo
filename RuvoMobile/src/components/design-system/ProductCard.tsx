import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  showDiscount?: boolean;
  disabled?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  showDiscount = true,
  disabled = false,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Animation values
  const flyX   = useRef(new Animated.Value(0)).current;
  const flyY   = useRef(new Animated.Value(0)).current;
  const flyOpacity = useRef(new Animated.Value(0)).current;
  const flyScale   = useRef(new Animated.Value(1)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  const originalPrice = product.originalPrice || product.price;
  const discount = showDiscount && originalPrice > product.price
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0;

  const rating = product.rating || 0;
  const reviewCount = product.reviewCount || 0;

  const handleAddToCart = () => {
    if (animating) return;
    setAnimating(true);

    // Reset
    flyX.setValue(0);
    flyY.setValue(0);
    flyOpacity.setValue(1);
    flyScale.setValue(1);
    checkOpacity.setValue(0);

    Animated.parallel([
      // Button bounce
      Animated.sequence([
        Animated.timing(btnScale, { toValue: 0.82, duration: 100, useNativeDriver: true }),
        Animated.spring(btnScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
      // Fly arc: X goes right ~110, Y goes up ~-160 then drops
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flyX, {
            toValue: 110,
            duration: 550,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(flyY, {
            toValue: -160,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(flyY, {
            toValue: -260,
            duration: 270,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(flyScale, {
            toValue: 0.3,
            duration: 270,
            useNativeDriver: true,
          }),
          Animated.timing(flyOpacity, {
            toValue: 0,
            duration: 270,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      // Show checkmark briefly
      Animated.sequence([
        Animated.timing(checkOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(checkOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setAnimating(false));

      onAddToCart?.();
    });
  };

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 ruvo-card mx-xs mb-md overflow-visible"
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
          <View style={{ position: 'relative' }}>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                onPress={disabled ? undefined : handleAddToCart}
                disabled={disabled}
                style={[
                  styles.addBtn,
                  disabled && { backgroundColor: '#E5E7EB' },
                  animating && styles.addBtnAnimating,
                ]}
              >
                {/* Normal state */}
                <Animated.View
                  style={[
                    styles.addBtnInner,
                    { opacity: Animated.subtract(new Animated.Value(1), checkOpacity) },
                  ]}
                >
                  <Ionicons name={disabled ? "lock-closed" : "add"} size={16} color={disabled ? "#9CA3AF" : "#231C10"} />
                  <Text style={[styles.addBtnText, disabled && { color: "#9CA3AF" }]}>
                    {disabled ? 'Closed' : 'Add'}
                  </Text>
                </Animated.View>

                {/* Checkmark after add */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.addBtnInner,
                    { opacity: checkOpacity },
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color="#16A34A" />
                  <Text style={[styles.addBtnText, { color: '#16A34A' }]}>Added!</Text>
                </Animated.View>
              </Pressable>
            </Animated.View>

            {/* Flying product dot */}
            {animating && (
              <Animated.View
                style={[
                  styles.flyDot,
                  {
                    opacity: flyOpacity,
                    transform: [
                      { translateX: flyX },
                      { translateY: flyY },
                      { scale: flyScale },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={{ fontSize: 18 }}>🛒</Text>
              </Animated.View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: '#F4B400',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addBtnAnimating: {
    backgroundColor: '#FFF2C2',
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#231C10',
  },
  flyDot: {
    position: 'absolute',
    bottom: 6,
    left: '30%',
    zIndex: 999,
  },
});
