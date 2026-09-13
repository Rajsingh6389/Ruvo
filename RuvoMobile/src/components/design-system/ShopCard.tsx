import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shop } from '../../types';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const rating = shop.rating || 0;
  const ratingText = `${rating.toFixed(1)} (${shop.reviewCount || 0})`;

  const bannerUrl = shop.bannerUrl || shop.imageUrl || shop.image;
  const logoUrl = shop.logoUrl || shop.imageUrl || shop.image;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? colors.border : '#FFE4D6',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.3 : 0.12,
        shadowRadius: 8,
        elevation: 5,
      }}
      className="ruvo-card mb-md overflow-hidden border-2 rounded-2xl"
    >
      {/* Banner Image */}
      <View style={{ backgroundColor: colors.surfaceSunken }} className="w-full h-32 relative">
        {bannerUrl ? (
          <Image
            source={{ uri: bannerUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View style={{ backgroundColor: colors.surfaceSunken }} className="w-full h-full items-center justify-center">
            <Ionicons name="storefront" size={40} color={colors.textHint} />
          </View>
        )}

        {/* Floating Rounded Shop Logo */}
        <View style={{ borderColor: colors.border, backgroundColor: colors.surface }} className="absolute -bottom-5 left-4 w-12 h-12 rounded-full border overflow-hidden shadow-md items-center justify-center">
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
            <Text style={{ color: colors.textPrimary }} className="text-base font-extrabold leading-tight" numberOfLines={1}>
              {shop.name}
            </Text>

            {/* Category Tag */}
            <View className="mt-xs flex-row items-center">
              <View style={{ backgroundColor: 'rgba(245,183,0,0.18)' }} className="px-sm py-[2px] rounded-md flex-row items-center gap-xs">
                <Ionicons name="pricetag" size={10} color="#F5B700" />
                <Text style={{ color: colors.textPrimary }} className="text-xs font-bold">
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
        <View style={{ borderTopColor: colors.border }} className="flex-row items-center justify-between mt-md pt-md border-t">
          {/* Rating */}
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#F5B700" />
            <Text style={{ color: colors.textPrimary }} className="text-xs font-extrabold ml-xs">
              {ratingText}
            </Text>
          </View>

          {/* Distance */}
          {showDistance && (
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold ml-[2px]">
                {distance !== undefined && distance > 0 ? `${distance < 1 ? Math.round(distance * 10) / 10 : distance.toFixed(1)} km away` : '0 km away'}
              </Text>
            </View>
          )}

          {/* Dynamic Delivery Fee based on distance */}
          <View className="flex-row items-center">
            <Ionicons name="bicycle" size={14} color="#10B981" />
            <Text className="text-xs font-bold text-emerald-500 ml-xs">
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
            <View style={{ backgroundColor: shop.status === 'open' ? 'rgba(34,197,94,0.15)' : colors.surfaceSunken }} className="px-sm py-xs rounded-md self-start">
              <Text style={{ color: shop.status === 'open' ? '#22C55E' : colors.textSecondary }} className="text-xs font-semibold">
                {shop.status === 'open' ? '🕐 Open now' : 'Closed'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
};
