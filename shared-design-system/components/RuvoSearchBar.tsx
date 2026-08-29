/**
 * RuvoSearchBar — Universal Search Bar Component
 * 
 * Premium search input with animations
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
  RuvoFontSize,
} from '../tokens';

export interface RuvoSearchBarProps extends TextInputProps {
  /** Search value */
  value: string;
  /** Value change handler */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Show filter button */
  showFilter?: boolean;
  /** Filter button press handler */
  onFilterPress?: () => void;
  /** Show voice search button */
  showVoice?: boolean;
  /** Voice button press handler */
  onVoicePress?: () => void;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Show shadow */
  showShadow?: boolean;
  /** Container style */
  style?: ViewStyle;
}

export const RuvoSearchBar: React.FC<RuvoSearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  showFilter = false,
  onFilterPress,
  showVoice = false,
  onVoicePress,
  autoFocus = false,
  showShadow = false,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          borderColor: isFocused ? RuvoQuickColors.primary : RuvoQuickColors.border,
        },
        showShadow && RuvoSemanticShadows.searchBar,
        style,
      ]}
    >
      {/* Search Icon */}
      <Ionicons
        name="search"
        size={20}
        color={isFocused ? RuvoQuickColors.primary : RuvoQuickColors.textTertiary}
        style={styles.searchIcon}
      />

      {/* Text Input */}
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={RuvoQuickColors.textPlaceholder}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={[styles.input, RuvoTypography.input]}
      />

      {/* Clear Button */}
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.iconButton}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={RuvoQuickColors.textTertiary}
          />
        </TouchableOpacity>
      )}

      {/* Voice Button */}
      {showVoice && onVoicePress && value.length === 0 && (
        <TouchableOpacity
          onPress={onVoicePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.iconButton}
        >
          <Ionicons
            name="mic"
            size={20}
            color={RuvoQuickColors.textTertiary}
          />
        </TouchableOpacity>
      )}

      {/* Filter Button */}
      {showFilter && onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.iconButton, styles.filterButton]}
        >
          <Ionicons
            name="options"
            size={20}
            color={RuvoQuickColors.textPrimary}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

/**
 * RuvoSearchBarHeader — Search bar integrated in header
 */
export interface RuvoSearchBarHeaderProps extends RuvoSearchBarProps {
  /** Show back button */
  showBack?: boolean;
  /** Back button press handler */
  onBackPress?: () => void;
}

export const RuvoSearchBarHeader: React.FC<RuvoSearchBarHeaderProps> = ({
  showBack = true,
  onBackPress,
  ...searchProps
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Back Button */}
      {showBack && (
        <TouchableOpacity
          onPress={onBackPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={RuvoQuickColors.textPrimary}
          />
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <RuvoSearchBar {...searchProps} style={styles.headerSearchBar} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderRadius: RuvoSemanticRadius.searchBar,
    borderWidth: 1.5,
    paddingHorizontal: RuvoSemanticSpacing.inputPaddingX,
    paddingVertical: RuvoSemanticSpacing.inputPaddingY,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: RuvoFontSize.xl,
    color: RuvoQuickColors.textPrimary,
    padding: 0,
    margin: 0,
  },
  iconButton: {
    marginLeft: 8,
    padding: 2,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: RuvoQuickColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: RuvoSemanticSpacing.screenPaddingX,
    paddingVertical: 12,
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: RuvoQuickColors.borderLight,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerSearchBar: {
    flex: 1,
  },
});
