import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput, TextInputProps, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerClassName?: string;
  required?: boolean;
}

export const Input = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerClassName = '',
  required = false,
  ...textInputProps
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = textInputProps.secureTextEntry;

  return (
    <View className={`mb-md ${containerClassName}`}>
      {/* Label */}
      {label && (
        <View className="flex-row items-center mb-xs">
          <Text className="text-sm font-semibold text-warm-800">
            {label}
          </Text>
          {required && <Text className="text-ruvo-error ml-1">*</Text>}
        </View>
      )}

      {/* Input Container */}
      <View
        className={`
          bg-ruvo-surface
          rounded-xl
          flex-row
          items-center
          px-lg
          ${isFocused ? 'border border-ruvo-yellow shadow-xs' : 'border border-warm-300'}
          ${error ? 'border-ruvo-error' : ''}
        `}
      >
        {/* Left Icon */}
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={isFocused ? '#F4B400' : '#77736B'} 
            style={{ marginRight: 8 }}
          />
        )}

        {/* Text Input */}
        <RNTextInput
          {...textInputProps}
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          className="flex-1 py-3 text-base text-ruvo-ink"
          placeholderTextColor="#77736B"
        />

        {/* Password Toggle or Right Icon */}
        {isPassword ? (
          <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#77736B"
            />
          </Pressable>
        ) : rightIcon ? (
          <Pressable onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={20} color="#77736B" />
          </Pressable>
        ) : null}
      </View>

      {/* Error Message */}
      {error && (
        <View className="flex-row items-center mt-xs">
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text className="text-xs text-ruvo-error ml-1">{error}</Text>
        </View>
      )}

      {/* Hint */}
      {hint && !error && (
        <Text className="text-xs text-warm-600 mt-xs">{hint}</Text>
      )}
    </View>
  );
};

// Search Input Component
interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export const SearchInput = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  className = '',
}: SearchInputProps) => {
  return (
    <View className={`bg-ruvo-surface rounded-lg flex-row items-center px-lg py-3 border border-warm-300 ${className}`}>
      <Ionicons name="search" size={20} color="#A79E92" style={{ marginRight: 8 }} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A79E92"
        className="flex-1 text-base text-ruvo-ink"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear || (() => onChangeText(''))}>
          <Ionicons name="close-circle" size={20} color="#A79E92" />
        </Pressable>
      )}
    </View>
  );
};
