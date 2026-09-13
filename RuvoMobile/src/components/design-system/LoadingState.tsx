import React from 'react';
import { View, ActivityIndicator, Text, DimensionValue } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors } = useTheme();
  const displayText = message || title || subtitle;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
      <ActivityIndicator size={size} color={colors.primary} />
      {displayText && (
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
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
  const { colors } = useTheme();

  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: colors.border + '60',
      }}
    />
  );
};
