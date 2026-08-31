import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  showViewAll?: boolean;
  onViewAllPress?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  showViewAll = false,
  onViewAllPress,
}) => {
  return (
    <View className="flex-row items-center justify-between px-md py-lg">
      <View className="flex-1">
        <Text className="text-lg font-bold text-ruvo-ink">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-sm text-warm-600 mt-xs">
            {subtitle}
          </Text>
        )}
      </View>

      {showViewAll && onViewAllPress && (
        <Pressable
          onPress={onViewAllPress}
          className="flex-row items-center gap-xs"
        >
          <Text className="text-sm font-semibold text-ruvo-yellow">
            View All
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#F5B700" />
        </Pressable>
      )}
    </View>
  );
};
