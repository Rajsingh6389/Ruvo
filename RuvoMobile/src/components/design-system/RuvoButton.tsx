import React from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RuvoButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export const RuvoButton: React.FC<RuvoButtonProps> = ({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
}) => {
  const sizeClasses = {
    sm: 'px-md py-xs',
    md: 'px-lg py-md',
    lg: 'px-xl py-lg',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const variantClasses = {
    primary: 'bg-ruvo-yellow',
    secondary: 'bg-warm-100 border border-warm-300',
    danger: 'bg-ruvo-error',
    outline: 'bg-transparent border-2 border-ruvo-yellow',
  };

  const textColorClasses = {
    primary: 'text-ruvo-ink',
    secondary: 'text-ruvo-ink',
    danger: 'text-white',
    outline: 'text-ruvo-yellow',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        rounded-xl flex-row items-center justify-center
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'flex-1' : ''}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      {loading ? (
        <ActivityIndicator color={textColorClasses[variant].includes('text-white') ? '#FFFFFF' : '#231C10'} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon as any}
              size={size === 'sm' ? 16 : size === 'md' ? 18 : 20}
              color={textColorClasses[variant].includes('text-white') ? '#FFFFFF' : '#231C10'}
              style={{ marginRight: 8 }}
            />
          )}
          <Text className={`font-bold ${textSizeClasses[size]} ${textColorClasses[variant]}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};
