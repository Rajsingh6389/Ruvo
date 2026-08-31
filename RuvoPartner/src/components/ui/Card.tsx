import React from 'react';
import { View, Pressable, ViewStyle, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outline' | 'flat';
  className?: string;
  style?: ViewStyle;
}

export const Card = ({
  children,
  onPress,
  variant = 'default',
  className = '',
  style,
}: CardProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getVariantClasses = () => {
    switch (variant) {
      case 'elevated':
        return 'bg-ruvo-surface rounded-xl shadow-lg';
      case 'outline':
        return 'bg-ruvo-surface rounded-lg border-2 border-warm-300';
      case 'flat':
        return 'bg-warm-100 rounded-lg';
      default:
        return 'bg-ruvo-surface rounded-lg border border-warm-300 shadow-sm';
    }
  };

  const getShadowStyle = (): ViewStyle | undefined => {
    if (variant === 'elevated') {
      return {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      };
    }
    if (variant === 'default') {
      return {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      };
    }
    return undefined;
  };

  const combinedStyle = [getShadowStyle(), style];

  if (onPress) {
    return (
      <Animated.View style={[animatedStyle, combinedStyle]}>
        <Pressable
          onPressIn={() => {
            scale.value = withSpring(0.98);
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
          }}
          onPress={onPress}
          className={`${getVariantClasses()} p-lg active:bg-warm-50 ${className}`}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View className={`${getVariantClasses()} p-lg ${className}`} style={combinedStyle}>
      {children}
    </View>
  );
};

// Card Section Component
interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const CardSection = ({ children, className = '', noPadding = false }: CardSectionProps) => {
  return (
    <View className={`${!noPadding ? 'py-md' : ''} ${className}`}>
      {children}
    </View>
  );
};

// Card Header Component
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader = ({ title, subtitle, action, className = '' }: CardHeaderProps) => {
  return (
    <View className={`flex-row items-center justify-between mb-md ${className}`}>
      <View className="flex-1">
        <Text className="text-lg font-bold text-ruvo-ink">{title}</Text>
        {subtitle && <Text className="text-sm text-warm-600 mt-xs">{subtitle}</Text>}
      </View>
      {action && <View className="ml-md">{action}</View>}
    </View>
  );
};
