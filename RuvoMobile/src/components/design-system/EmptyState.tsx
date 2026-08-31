import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RuvoButton } from './RuvoButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search',
  title,
  subtitle,
  action,
}) => {
  return (
    <View className="flex-1 items-center justify-center px-lg py-3xl">
      {/* Icon */}
      <View className="w-20 h-20 rounded-full bg-ruvo-yellow-soft items-center justify-center mb-xl">
        <Ionicons name={icon as any} size={40} color="#F5B700" />
      </View>

      {/* Title */}
      <Text className="text-xl font-bold text-ruvo-ink text-center mb-sm">
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text className="text-base text-warm-600 text-center mb-2xl">
          {subtitle}
        </Text>
      )}

      {/* Action Button */}
      {action && (
        <RuvoButton
          label={action.label}
          onPress={action.onPress}
          variant="primary"
          size="md"
        />
      )}
    </View>
  );
};
