/**
 * RuvoChip — Universal Chip/Tag Component
 * 
 * Premium selectable chips and tags
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticRadius,
} from '../tokens';

export type RuvoChipVariant = 'filled' | 'outlined' | 'tonal';
export type RuvoChipSize = 'small' | 'medium' | 'large';

export interface RuvoChipProps {
  /** Chip label */
  children: string;
  /** Chip variant */
  variant?: RuvoChipVariant;
  /** Chip size */
  size?: RuvoChipSize;
  /** Selected state */
  selected?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Icon before text */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show close/remove button */
  onRemove?: () => void;
  /** Chip press handler */
  onPress?: () => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
}

export const RuvoChip: React.FC<RuvoChipProps> = ({
  children,
  variant = 'filled',
  size = 'medium',
  selected = false,
  disabled = false,
  icon,
  onRemove,
  onPress,
  style,
  textStyle,
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 11,
      iconSize: 14,
      height: 24,
    },
    medium: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 13,
      iconSize: 16,
      height: 32,
    },
    large: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 14,
      iconSize: 18,
      height: 40,
    },
  };

  const config = sizeConfig[size];

  // Variant styles
  const getVariantStyle = () => {
    if (selected) {
      return {
        backgroundColor: RuvoQuickColors.primary,
        borderWidth: 0,
        color: RuvoQuickColors.textPrimary,
      };
    }

    switch (variant) {
      case 'filled':
        return {
          backgroundColor: RuvoQuickColors.bgSecondary,
          borderWidth: 0,
          color: RuvoQuickColors.textPrimary,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: RuvoQuickColors.border,
          color: RuvoQuickColors.textPrimary,
        };
      case 'tonal':
        return {
          backgroundColor: RuvoQuickColors.primarySoft,
          borderWidth: 0,
          color: '#B78103',
        };
    }
  };

  const variantStyle = getVariantStyle();

  const content = (
    <View
      style={[
        styles.chip,
        {
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          height: config.height,
          backgroundColor: variantStyle.backgroundColor,
          borderWidth: variantStyle.borderWidth || 0,
          borderColor: (variantStyle as any).borderColor,
          borderRadius: RuvoSemanticRadius.chip,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={config.iconSize}
          color={variantStyle.color}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          RuvoTypography.labelSmall,
          {
            fontSize: config.fontSize,
            color: variantStyle.color,
            fontWeight: selected ? '600' : '500',
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={disabled}
          style={styles.removeButton}
        >
          <Ionicons
            name="close-circle"
            size={config.iconSize}
            color={variantStyle.color}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

/**
 * RuvoChipGroup — Horizontal scrollable chip group
 */
export interface RuvoChipGroupProps {
  /** Chip items */
  items: Array<{
    key: string;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
  }>;
  /** Selected chip key */
  selectedKey?: string;
  /** Multiple selection */
  selectedKeys?: string[];
  /** Chip selection handler */
  onSelect?: (key: string) => void;
  /** Chip size */
  size?: RuvoChipSize;
  /** Chip variant */
  variant?: RuvoChipVariant;
  /** Container style */
  style?: ViewStyle;
}

export const RuvoChipGroup: React.FC<RuvoChipGroupProps> = ({
  items,
  selectedKey,
  selectedKeys = [],
  onSelect,
  size = 'medium',
  variant = 'filled',
  style,
}) => {
  const multiSelect = selectedKeys.length > 0;

  return (
    <View style={[styles.chipGroup, style]}>
      {items.map((item) => {
        const isSelected = multiSelect
          ? selectedKeys.includes(item.key)
          : selectedKey === item.key;

        return (
          <RuvoChip
            key={item.key}
            size={size}
            variant={variant}
            selected={isSelected}
            icon={item.icon}
            onPress={() => onSelect?.(item.key)}
          >
            {item.label}
          </RuvoChip>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: 4,
  },
  removeButton: {
    marginLeft: 4,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
