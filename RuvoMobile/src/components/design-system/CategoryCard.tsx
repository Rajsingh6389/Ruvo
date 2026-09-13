import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Pressable
      onPress={onPress}
      className="items-center mr-md my-1"
    >
      {/* Icon/Image Container with Soft Orange Shadow & Border */}
      <View
        style={{
          backgroundColor: isDark ? '#262220' : '#FFFFFF',
          borderColor: isDark ? '#3D3430' : '#FFE4D6',
          shadowColor: '#FF6B35',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.25 : 0.14,
          shadowRadius: 6,
          elevation: 4,
        }}
        className="w-16 h-16 rounded-2xl items-center justify-center mb-sm overflow-hidden border-2"
      >
        {image ? (
          <Image
            source={{ uri: image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : icon ? (
          <Ionicons name={icon as any} size={28} color="#FF6B35" />
        ) : (
          <Ionicons name="shapes" size={28} color="#FF6B35" />
        )}
      </View>

      {/* Label */}
      <Text style={{ color: colors.textPrimary }} className="text-xs font-bold text-center" numberOfLines={2}>
        {name}
      </Text>

      {/* Count Badge */}
      {count !== undefined && (
        <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-xs font-semibold">
          {count} items
        </Text>
      )}
    </Pressable>
  );
};
