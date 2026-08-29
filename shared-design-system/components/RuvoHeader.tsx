/**
 * RuvoHeader — Universal Header Component
 * 
 * Premium page header for all RuVo apps
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticShadows,
} from '../tokens';

export interface RuvoHeaderProps {
  /** Header title */
  title: string;
  /** Subtitle below title */
  subtitle?: string;
  /** Show back button */
  showBack?: boolean;
  /** Back button press handler */
  onBackPress?: () => void;
  /** Left icon instead of back */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Left icon press handler */
  onLeftPress?: () => void;
  /** Right icon */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  /** Right icon press handler */
  onRightPress?: () => void;
  /** Second right icon */
  rightIcon2?: keyof typeof Ionicons.glyphMap;
  /** Second right icon press handler */
  onRightPress2?: () => void;
  /** Show bottom border */
  showBorder?: boolean;
  /** Show shadow */
  showShadow?: boolean;
  /** Transparent background */
  transparent?: boolean;
  /** Large title variant */
  large?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom title style */
  titleStyle?: TextStyle;
}

export const RuvoHeader: React.FC<RuvoHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  rightIcon2,
  onRightPress2,
  showBorder = true,
  showShadow = false,
  transparent = false,
  large = false,
  style,
  titleStyle,
}) => {
  return (
    <View
      style={[
        styles.container,
        !transparent && { backgroundColor: RuvoQuickColors.surfaceWhite },
        showBorder && styles.bordered,
        showShadow && RuvoSemanticShadows.header,
        large && styles.containerLarge,
        style,
      ]}
    >
      {/* Left Section */}
      <View style={styles.left}>
        {(showBack || leftIcon || onLeftPress) && (
          <TouchableOpacity
            onPress={onBackPress || onLeftPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.iconButton}
          >
            <Ionicons
              name={leftIcon || 'arrow-back'}
              size={24}
              color={RuvoQuickColors.textPrimary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Center Section */}
      <View style={styles.center}>
        <Text
          style={[
            large ? styles.titleLarge : styles.title,
            titleStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Section */}
      <View style={styles.right}>
        {rightIcon2 && onRightPress2 && (
          <TouchableOpacity
            onPress={onRightPress2}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.iconButton, styles.iconButtonSpaced]}
          >
            <Ionicons
              name={rightIcon2}
              size={22}
              color={RuvoQuickColors.textPrimary}
            />
          </TouchableOpacity>
        )}
        {rightIcon && onRightPress && (
          <TouchableOpacity
            onPress={onRightPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.iconButton}
          >
            <Ionicons
              name={rightIcon}
              size={22}
              color={RuvoQuickColors.textPrimary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: RuvoSemanticSpacing.headerHeight,
    paddingHorizontal: RuvoSemanticSpacing.screenPaddingX,
  },
  containerLarge: {
    height: 72,
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: RuvoQuickColors.borderLight,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  right: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconButton: {
    padding: 4,
  },
  iconButtonSpaced: {
    marginRight: 8,
  },
  title: {
    ...RuvoTypography.h5,
    color: RuvoQuickColors.textPrimary,
  },
  titleLarge: {
    ...RuvoTypography.h3,
    color: RuvoQuickColors.textPrimary,
  },
  subtitle: {
    ...RuvoTypography.captionSmall,
    color: RuvoQuickColors.textSecondary,
    marginTop: 2,
  },
});
