import React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'premium';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '' 
}: BadgeProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-ruvo-accent-soft';
      case 'warning':
        return 'bg-orange-100';
      case 'error':
        return 'bg-red-100';
      case 'info':
        return 'bg-blue-100';
      case 'premium':
        return 'bg-ruvo-gold-soft border border-ruvo-gold-border';
      default:
        return 'bg-warm-200';
    }
  };

  const getTextVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'text-ruvo-accent';
      case 'warning':
        return 'text-ruvo-warning';
      case 'error':
        return 'text-ruvo-error';
      case 'info':
        return 'text-ruvo-info';
      case 'premium':
        return 'text-ruvo-gold-dark';
      default:
        return 'text-warm-800';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-xs py-0.5';
      case 'lg':
        return 'px-lg py-xs';
      default:
        return 'px-md py-xs';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-sm';
      default:
        return 'text-xs';
    }
  };

  return (
    <View className={`${getVariantClasses()} ${getSizeClasses()} rounded-full ${className}`}>
      {typeof children === 'string' ? (
        <Text className={`${getTextSizeClasses()} ${getTextVariantClasses()} font-semibold`}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};

// Dot Badge (notification indicator)
interface DotBadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const DotBadge = ({ variant = 'error', size = 'sm', className = '' }: DotBadgeProps) => {
  const getSizeClasses = () => {
    return size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  };

  const getColorClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-ruvo-accent';
      case 'warning':
        return 'bg-ruvo-warning';
      case 'error':
        return 'bg-ruvo-error';
      case 'info':
        return 'bg-ruvo-info';
      default:
        return 'bg-warm-500';
    }
  };

  return <View className={`${getSizeClasses()} ${getColorClasses()} rounded-full ${className}`} />;
};
