import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearchPress?: () => void;
  onClearPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search shops, products...',
  value,
  onChangeText,
  onSearchPress,
  onClearPress,
  onFocus,
  onBlur,
  isFocused = false,
}) => {
  return (
    <View className="flex-row items-center px-md py-sm gap-sm">
      {/* Search Icon */}
      <Ionicons name="search" size={20} color="#A79E92" />

      {/* Input */}
      <TextInput
        className="flex-1 bg-ruvo-surface rounded-lg px-md py-sm text-base text-ruvo-ink"
        placeholder={placeholder}
        placeholderTextColor="#A79E92"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
      />

      {/* Clear Button */}
      {value && onClearPress && (
        <Pressable onPress={onClearPress} className="p-xs">
          <Ionicons name="close-circle" size={20} color="#A79E92" />
        </Pressable>
      )}

      {/* Search Button */}
      {onSearchPress && (
        <Pressable
          onPress={onSearchPress}
          className="p-xs"
        >
          <Ionicons name="arrow-forward" size={20} color="#F5B700" />
        </Pressable>
      )}
    </View>
  );
};
