import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { PressableScale } from './PressableScale';

interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** Accessible name. Defaults to the placeholder, then to "Search". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The app's one search input.
 *
 * Home, NearbyShops, ShopDetails and Groceries each had their own version of
 * this row — different heights, different focus treatments, and two of them with
 * no clear button at all, so a typed query could only be erased character by
 * character. The focus ring is the single visual cue that the field is active,
 * and the clear button is a real 44px target rather than a bare icon.
 */
export const SearchField = ({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel,
  style,
  ...props
}: SearchFieldProps) => {
  const { colors, radius } = useTheme();
  const { sf } = useResponsive();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSunken,
          borderRadius: radius.md,
          borderColor: focused ? colors.primary : colors.border,
        },
        style,
      ]}
    >
      <Ionicons name="search-outline" size={18} color={colors.textHint} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, { color: colors.textPrimary, fontSize: sf(13.5) }]}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />

      {value.length > 0 ? (
        <PressableScale
          onPress={() => onChangeText('')}
          scaleTo={0.88}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={colors.textHint} />
        </PressableScale>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    // 46px clears the §16 minimum without the field looking like a button.
    height: 46,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontWeight: '500',
  },
});
