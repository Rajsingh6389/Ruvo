import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center justify-between px-md py-lg">
      <View className="flex-1">
        <Text style={{ color: colors.textPrimary }} className="text-lg font-bold">
          {title}
        </Text>
        {subtitle && (
          <Text style={{ color: colors.textSecondary }} className="text-sm mt-xs">
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
