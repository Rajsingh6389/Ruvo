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

  const bannerUrl = shop.bannerUrl || shop.imageUrl || shop.image;
  const logoUrl = shop.logoUrl || shop.imageUrl || shop.image;

  return (
    <Pressable
      onPress={onPress}
      className="ruvo-card mb-md overflow-hidden bg-ruvo-surface border border-warm-300 rounded-2xl"
    >
      {/* Banner Image */}
      <View className="w-full h-32 bg-warm-200 relative">
        {bannerUrl ? (
          <Image
            source={{ uri: bannerUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-warm-300 items-center justify-center">
            <Ionicons name="storefront" size={40} color="#A79E92" />
          </View>
        )}

        {/* Floating Rounded Shop Logo */}
        <View className="absolute -bottom-5 left-4 w-12 h-12 rounded-full border-2 border-white bg-white overflow-hidden shadow-md items-center justify-center">
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              className="w-full h-full rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-ruvo-yellow items-center justify-center">
              <Ionicons name="business" size={20} color="#231C10" />
            </View>
          )}
        </View>

        {/* Status Badge on Top Right */}
        {shop.status && (
          <View className="absolute top-2 right-2">
            <View className={`px-sm py-xs rounded-full ${
              shop.status === 'open' ? 'bg-emerald-500/90' : 'bg-warm-800/80'
            }`}>
              <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                {shop.status === 'open' ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Shop Details Info */}
      <View className="pt-6 px-md pb-md">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-xs">
            <Text className="text-base font-extrabold text-ruvo-ink leading-tight" numberOfLines={1}>
              {shop.name}
            </Text>

            {/* Category Tag */}
            <View className="mt-xs flex-row items-center">
              <View className="bg-ruvo-yellow/20 px-sm py-[2px] rounded-md flex-row items-center gap-xs">
                <Ionicons name="pricetag" size={10} color="#F5B700" />
                <Text className="text-xs font-bold text-ruvo-ink">
                  {shop.category || 'General Store'}
                </Text>
              </View>
            </View>
          </View>

          {shop.verified && (
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          )}
        </View>

        {/* Rating, Distance & Delivery Fee Row */}
        <View className="flex-row items-center justify-between mt-md pt-md border-t border-warm-200">
          {/* Rating */}
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#F5B700" />
            <Text className="text-xs font-extrabold text-ruvo-ink ml-xs">
              {ratingText}
            </Text>
          </View>

          {/* Distance */}
          {showDistance && (
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text className="text-xs font-semibold text-warm-700 ml-[2px]">
                {distance !== undefined && distance > 0 ? `${distance < 1 ? Math.round(distance * 10) / 10 : distance.toFixed(1)} km away` : '0 km away'}
              </Text>
            </View>
          )}

          {/* Dynamic Delivery Fee based on distance */}
          <View className="flex-row items-center">
            <Ionicons name="bicycle" size={14} color="#10B981" />
            <Text className="text-xs font-bold text-emerald-700 ml-xs">
              {(() => {
                const dist = distance ?? 0;
                if (dist <= 1) return 'FREE Delivery';
                if (dist <= 3) return '₹15 Delivery';
                if (dist <= 5) return '₹25 Delivery';
                return `₹${Math.min(99, 25 + Math.ceil(dist - 5) * 5)} Delivery`;
              })()}
            </Text>
          </View>
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
