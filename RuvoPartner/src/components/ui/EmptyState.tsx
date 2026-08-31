import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) => {
  return (
    <View className={`flex-1 items-center justify-center px-xl py-2xl ${className}`}>
      {/* Icon Container with subtle 3D effect */}
      <View
        className="w-24 h-24 bg-warm-200 rounded-full items-center justify-center mb-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Ionicons name={icon} size={48} color="#A79E92" />
      </View>

      {/* Title */}
      <Text className="text-xl font-bold text-ruvo-ink mb-sm text-center">
        {title}
      </Text>

      {/* Description */}
      <Text className="text-base text-warm-600 text-center mb-xl max-w-sm leading-6">
        {description}
      </Text>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button onPress={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

// Compact Empty State (for sections)
interface CompactEmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const CompactEmptyState = ({
  icon,
  message,
  actionLabel,
  onAction,
  className = '',
}: CompactEmptyStateProps) => {
  return (
    <View className={`items-center py-xl px-lg ${className}`}>
      <View className="w-16 h-16 bg-warm-200 rounded-full items-center justify-center mb-md">
        <Ionicons name={icon} size={32} color="#A79E92" />
      </View>
      <Text className="text-sm text-warm-600 text-center mb-md">{message}</Text>
      {actionLabel && onAction && (
        <Button onPress={onAction} variant="outline" size="sm">
          {actionLabel}
        </Button>
      )}
    </View>
  );
};
