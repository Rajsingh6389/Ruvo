import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  className?: string;
  fullWidth?: boolean;
}

export const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  fullWidth = false,
}: ButtonProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-ruvo-yellow active:bg-ruvo-yellow-dark';
      case 'secondary':
        return 'bg-warm-200 active:bg-warm-300';
      case 'outline':
        return 'border-2 border-warm-300 active:bg-warm-100';
      case 'ghost':
        return 'active:bg-warm-100';
      case 'danger':
        return 'bg-red-500 active:bg-red-600';
      default:
        return 'bg-ruvo-yellow active:bg-ruvo-yellow-dark';
    }
  };

  const getTextClasses = () => {
    const baseClass = 'font-bold';
    const sizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
    const colorClass = variant === 'danger' ? 'text-white' : 'text-ruvo-ink';
    return `${baseClass} ${sizeClass} ${colorClass}`;
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-md py-2';
      case 'lg':
        return 'px-xl py-4';
      default:
        return 'px-lg py-3';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 16;
      case 'lg':
        return 24;
      default:
        return 20;
    }
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={animatedStyle} className={fullWidth ? 'w-full' : ''}>
      <Pressable
        onPressIn={() => {
          if (!isDisabled) scale.value = withSpring(0.95);
        }}
        onPressOut={() => {
          if (!isDisabled) scale.value = withSpring(1);
        }}
        onPress={isDisabled ? undefined : onPress}
        className={`
          ${getVariantClasses()}
          ${getSizeClasses()}
          rounded-lg
          flex-row
          items-center
          justify-center
          gap-sm
          ${isDisabled ? 'opacity-50' : ''}
          ${className}
        `}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'danger' ? '#FFF' : '#231C10'} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <Ionicons name={icon} size={getIconSize()} color={variant === 'danger' ? '#FFF' : '#231C10'} />
            )}
            {typeof children === 'string' || typeof children === 'number' ? (
              <Text className={getTextClasses()}>{children}</Text>
            ) : Array.isArray(children) && children.length > 0 && typeof children[0] === 'string' ? (
              <Text className={getTextClasses()}>{children}</Text>
            ) : Array.isArray(children) && children.every(c => ['string', 'number'].includes(typeof c)) ? (
              <Text className={getTextClasses()}>{children}</Text>
            ) : (
              children
            )}
            {icon && iconPosition === 'right' && (
              <Ionicons name={icon} size={getIconSize()} color={variant === 'danger' ? '#FFF' : '#231C10'} />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

// Icon Button Component
interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  className?: string;
}

export const IconButton = ({
  icon,
  onPress,
  size = 'md',
  variant = 'default',
  disabled = false,
  className = '',
}: IconButtonProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-9 h-9';
      case 'lg':
        return 'w-14 h-14';
      default:
        return 'w-11 h-11';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 18;
      case 'lg':
        return 28;
      default:
        return 24;
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-ruvo-yellow active:bg-ruvo-yellow-dark';
      case 'danger':
        return 'bg-red-500 active:bg-red-600';
      default:
        return 'bg-warm-200 active:bg-warm-300';
    }
  };

  const getIconColor = () => {
    return variant === 'danger' ? '#FFF' : '#231C10';
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => {
          if (!disabled) scale.value = withSpring(0.9);
        }}
        onPressOut={() => {
          if (!disabled) scale.value = withSpring(1);
        }}
        onPress={disabled ? undefined : onPress}
        className={`
          ${getSizeClasses()}
          ${getVariantClasses()}
          rounded-lg
          items-center
          justify-center
          ${disabled ? 'opacity-50' : ''}
          ${className}
        `}
        disabled={disabled}
      >
        <Ionicons name={icon} size={getIconSize()} color={getIconColor()} />
      </Pressable>
    </Animated.View>
  );
};
