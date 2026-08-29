/**
 * RuvoCard — Universal Card Component
 * 
 * Premium card container for all RuVo apps
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import {
  RuvoQuickColors,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
} from '../tokens';

export type RuvoCardVariant = 'elevated' | 'outlined' | 'filled';
export type RuvoCardSize = 'small' | 'medium' | 'large';

export interface RuvoCardProps {
  /** Card content */
  children: React.ReactNode;
  /** Card variant */
  variant?: RuvoCardVariant;
  /** Card size (affects padding) */
  size?: RuvoCardSize;
  /** Make card pressable */
  onPress?: TouchableOpacityProps['onPress'];
  /** Disable press feedback */
  activeOpacity?: number;
  /** Custom style */
  style?: ViewStyle;
  /** Remove padding */
  noPadding?: boolean;
  /** Remove border radius */
  noRadius?: boolean;
  /** Full width card */
  fullWidth?: boolean;
}

export const RuvoCard: React.FC<RuvoCardProps> = ({
  children,
  variant = 'elevated',
  size = 'medium',
  onPress,
  activeOpacity = 0.9,
  style,
  noPadding = false,
  noRadius = false,
  fullWidth = false,
}) => {
  // Padding by size
  const paddingConfig = {
    small: RuvoSemanticSpacing.cardPaddingSmall,
    medium: RuvoSemanticSpacing.cardPadding,
    large: RuvoSemanticSpacing.cardPaddingLarge,
  };

  // Variant styles
  const variantStyles = {
    elevated: {
      backgroundColor: RuvoQuickColors.surfaceWhite,
      borderWidth: 0,
      ...RuvoSemanticShadows.card,
    },
    outlined: {
      backgroundColor: RuvoQuickColors.surfaceWhite,
      borderWidth: 1,
      borderColor: RuvoQuickColors.border,
    },
    filled: {
      backgroundColor: RuvoQuickColors.bgSecondary,
      borderWidth: 0,
    },
  };

  const cardStyle: ViewStyle = {
    ...variantStyles[variant],
    padding: noPadding ? 0 : paddingConfig[size],
    borderRadius: noRadius ? 0 : RuvoSemanticRadius.card,
    width: fullWidth ? '100%' : undefined,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
};

/**
 * RuvoCardHeader — Card header component
 */
export interface RuvoCardHeaderProps {
  /** Header content */
  children: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
}

export const RuvoCardHeader: React.FC<RuvoCardHeaderProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

/**
 * RuvoCardContent — Card main content
 */
export interface RuvoCardContentProps {
  /** Content */
  children: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
}

export const RuvoCardContent: React.FC<RuvoCardContentProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>{children}</View>
);

/**
 * RuvoCardFooter — Card footer
 */
export interface RuvoCardFooterProps {
  /** Footer content */
  children: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
}

export const RuvoCardFooter: React.FC<RuvoCardFooterProps> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  header: {
    marginBottom: RuvoSemanticSpacing.contentGap,
  },
  content: {
    marginBottom: RuvoSemanticSpacing.contentGap,
  },
  footer: {
    marginTop: RuvoSemanticSpacing.contentGap,
  },
});
