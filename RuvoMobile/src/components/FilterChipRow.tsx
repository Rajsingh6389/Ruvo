import React from 'react';
import { FlatList, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { PressableScale } from './PressableScale';

interface FilterChipRowProps {
  options: string[];
  active: string;
  onChange: (option: string) => void;
  /** Accessible name for the group, e.g. "Product categories". */
  label?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Horizontal filter chips — product categories, shop categories.
 *
 * Reimplemented in ShopDetails, NearbyShops and Groceries. Beyond the visual
 * drift, two of those versions marked the active chip with colour alone, which
 * fails §16: here the selection also carries a checkmark and
 * `accessibilityState.selected`, so it survives colour-blindness and screen readers.
 *
 * A `FlatList` rather than a mapped `ScrollView` so a shop with forty categories
 * does not mount forty chips at once.
 */
export const FilterChipRow = ({
  options,
  active,
  onChange,
  label = 'Filters',
  style,
  contentStyle,
}: FilterChipRowProps) => {
  const { colors, typography, radius } = useTheme();
  const { sf, isCompact } = useResponsive();

  if (options.length <= 1) return null;

  return (
    <FlatList
      horizontal
      data={options}
      showsHorizontalScrollIndicator={false}
      keyExtractor={option => option}
      accessibilityLabel={label}
      style={style}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: isCompact ? 12 : 16 },
        contentStyle,
      ]}
      renderItem={({ item }) => {
        const isActive = item === active;

        return (
          <PressableScale
            onPress={() => onChange(item)}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item}
            style={[
              styles.chip,
              {
                borderRadius: radius.pill,
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            {isActive ? (
              <Ionicons name="checkmark" size={13} color={colors.onPrimary} />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                typography.caption,
                styles.chipText,
                {
                  color: isActive ? colors.onPrimary : colors.textSecondary,
                  fontSize: sf(12.5),
                },
              ]}
            >
              {item}
            </Text>
          </PressableScale>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    // 36px painted + the row's vertical padding clears a comfortable target.
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 220,
  },
  chipText: {
    fontWeight: '700',
    flexShrink: 1,
  },
});
