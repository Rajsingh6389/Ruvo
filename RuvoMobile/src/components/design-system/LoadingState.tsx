import React from 'react';
import { View, ActivityIndicator, Text, DimensionValue } from 'react-native';

interface LoadingStateProps {
  message?: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  size?: 'small' | 'large';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  title,
  subtitle,
  size = 'large',
}) => {
  const displayText = message || title || subtitle;
  return (
    <View className="flex-1 items-center justify-center px-lg py-3xl">
      <ActivityIndicator size={size} color="#F5B700" />
      {displayText && (
        <Text className="text-base text-warm-600 mt-lg text-center">
          {displayText}
        </Text>
      )}
    </View>
  );
};

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
}) => {
  return (
    <View
      className="bg-warm-200 animate-pulse"
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
};
