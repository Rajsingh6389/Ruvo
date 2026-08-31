import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shop } from '../../types';

interface ShopCardProps {
  shop: Shop;
  onPress: () => void;
  showDistance?: boolean;
  distance?: number;
}

export const ShopCard: React.FC<ShopCardProps> = ({
  shop,
  onPress,
  showDistance = true,
  distance,
}) => {
  const rating = shop.rating || 0;
  const ratingText = `${rating.toFixed(1)} (${shop.reviewCount || 0})`;

  return (
    <Pressable
      onPress={onPress}
      className="ruvo-card mb-md overflow-hidden"
    >
      {/* Shop Image */}
      <View className="w-full h-32 bg-warm-200 mb-md overflow-hidden rounded-lg">
        {shop.image ? (
          <Image
            source={{ uri: shop.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-warm-300 items-center justify-center">
            <Ionicons name="storefront" size={40} color="#A79E92" />
          </View>
        )}
      </View>

      {/* Shop Info */}
      <View className="px-md pb-md">
        <View className="flex-row items-start justify-between mb-xs">
          <View className="flex-1">
            <Text className="text-lg font-bold text-ruvo-ink">
              {shop.name}
            </Text>
            <Text className="text-xs text-warm-600 mt-xs">
              {shop.category || 'General Store'}
            </Text>
          </View>
          {shop.verified && (
            <View className="ml-sm">
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            </View>
          )}
        </View>

        {/* Rating & Distance Row */}
        <View className="flex-row items-center justify-between mt-md pt-md border-t border-warm-200">
          {/* Rating */}
          <View className="flex-row items-center">
            <Ionicons name="star" size={16} color="#F5B700" />
            <Text className="text-sm font-semibold text-ruvo-ink ml-xs">
              {ratingText}
            </Text>
          </View>

          {/* Distance */}
          {showDistance && distance !== undefined && (
            <Text className="text-sm text-warm-600">
              {distance < 1 ? '<1' : distance.toFixed(1)} km away
            </Text>
          )}

          {/* Delivery Time */}
          {shop.deliveryTime && (
            <View className="flex-row items-center">
              <Ionicons name="time" size={14} color="#A79E92" />
              <Text className="text-xs text-warm-600 ml-xs">
                {shop.deliveryTime} min
              </Text>
            </View>
          )}
        </View>

        {/* Status Badge */}
        {shop.status && (
          <View className="mt-md">
            <View className={`px-sm py-xs rounded-md self-start ${
              shop.status === 'open' ? 'bg-ruvo-accent-soft' : 'bg-warm-100'
            }`}>
              <Text className={`text-xs font-semibold ${
                shop.status === 'open' ? 'text-ruvo-accent' : 'text-warm-600'
              }`}>
                {shop.status === 'open' ? '🕐 Open now' : 'Closed'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
};
