import React from 'react';
import { TextInput, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RuvoInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  icon?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  onIconPress?: () => void;
}

export const RuvoInput: React.FC<RuvoInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  icon,
  error,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  onIconPress,
}) => {
  return (
    <View className="mb-lg">
      {label && (
        <Text className="ruvo-label mb-xs">
          {label}
        </Text>
      )}
      <View className={`flex-row items-center ruvo-input ${error ? 'border-ruvo-error' : ''}`}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={20}
            color="#A79E92"
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          className="flex-1 text-base text-ruvo-ink"
          placeholder={placeholder}
          placeholderTextColor="#A79E92"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={{ padding: 0 }}
        />
        {icon && onIconPress && (
          <Pressable onPress={onIconPress} className="ml-md">
            <Ionicons name="close" size={20} color="#A79E92" />
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-ruvo-error text-xs mt-xs">
          {error}
        </Text>
      )}
    </View>
  );
};
