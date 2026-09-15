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
import { useTheme } from '../../context/ThemeContext';

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
  const { colors } = useTheme();
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
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      className="flex-1 ruvo-card mx-xs mb-md overflow-visible border rounded-2xl"
    >
      {/* Image Container */}
      <View style={{ backgroundColor: colors.surfaceSunken }} className="w-full h-28 mb-md relative overflow-hidden rounded-lg">
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View style={{ backgroundColor: colors.surfaceSunken }} className="w-full h-full items-center justify-center">
            <Ionicons name="image" size={32} color={colors.textHint} />
          </View>
        )}

        {/* Favorite Button */}
        <Pressable
          onPress={() => setIsFavorite(!isFavorite)}
          style={{ backgroundColor: colors.surface }}
          className="absolute top-xs right-xs rounded-full p-xs"
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? '#DC2626' : colors.textHint}
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
          <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold" numberOfLines={2}>
            {product.name}
          </Text>
          {product.variant && (
            <Text style={{ color: colors.textSecondary }} className="text-xs mt-xs">
              {product.variant}
            </Text>
          )}
          {(product as any).shopName && (
            <View className="flex-row items-center mt-xs">
               <Ionicons name="storefront-outline" size={10} color="#FF6B35" />
               <Text style={{ color: '#FF6B35' }} className="text-[10px] font-bold ml-1" numberOfLines={1}>
                 {(product as any).shopName}
               </Text>
            </View>
          )}
        </View>

        {/* Rating */}
        {rating > 0 && (
          <View className="flex-row items-center mb-xs">
            <Ionicons name="star" size={14} color="#F5B700" />
            <Text style={{ color: colors.textSecondary }} className="text-xs ml-xs">
              {rating.toFixed(1)} ({reviewCount})
            </Text>
          </View>
        )}

        {/* Price */}
        <View className="flex-row items-center mb-md">
          <Text style={{ color: colors.textPrimary }} className="text-lg font-bold">
            ₹{product.price.toFixed(0)}
          </Text>
          {originalPrice > product.price && (
            <Text style={{ color: colors.textHint }} className="text-sm line-through ml-sm">
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
    fontFamily: 'Poppins_700Bold',
    color: '#231C10',
  },
  flyDot: {
    position: 'absolute',
    bottom: 6,
    left: '30%',
    zIndex: 999,
  },
});
