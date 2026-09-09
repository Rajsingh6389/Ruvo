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
        return 'bg-emerald-50 border border-emerald-200';
      case 'warning':
        return 'bg-amber-50 border border-amber-200';
      case 'error':
        return 'bg-red-50 border border-red-200';
      case 'info':
        return 'bg-blue-50 border border-blue-200';
      case 'premium':
        return 'bg-ruvo-yellow-soft border border-ruvo-gold-border';
      default:
        return 'bg-warm-100 border border-warm-300';
    }
  };

  const getTextVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'text-emerald-700';
      case 'warning':
        return 'text-amber-700';
      case 'error':
        return 'text-red-600';
      case 'info':
        return 'text-blue-700';
      case 'premium':
        return 'text-amber-800';
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
