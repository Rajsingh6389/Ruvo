import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CategoryCardProps {
  name: string;
  icon?: string;
  image?: string;
  onPress: () => void;
  count?: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  name,
  icon,
  image,
  onPress,
  count,
}) => {
  return (
    <Pressable
      onPress={onPress}
      className="items-center mr-lg"
    >
      {/* Icon/Image Container */}
      <View className="w-16 h-16 rounded-full bg-ruvo-yellow-soft items-center justify-center mb-sm overflow-hidden">
        {image ? (
          <Image
            source={{ uri: image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : icon ? (
          <Ionicons name={icon as any} size={28} color="#F5B700" />
        ) : (
          <Ionicons name="shapes" size={28} color="#F5B700" />
        )}
      </View>

      {/* Label */}
      <Text className="text-sm font-semibold text-ruvo-ink text-center" numberOfLines={2}>
        {name}
      </Text>

      {/* Count Badge */}
      {count !== undefined && (
        <Text className="text-xs text-warm-600 mt-xs">
          {count} items
        </Text>
      )}
    </Pressable>
  );
};
