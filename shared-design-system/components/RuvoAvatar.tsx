/**
 * RuvoAvatar — Universal Avatar Component
 * 
 * Premium avatars and profile images
 */

import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
} from '../tokens';

export type RuvoAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type RuvoAvatarShape = 'circle' | 'square' | 'rounded';

export interface RuvoAvatarProps {
  /** Image source URI */
  source?: string;
  /** Name for fallback initials */
  name?: string;
  /** Size preset */
  size?: RuvoAvatarSize;
  /** Custom size in pixels */
  customSize?: number;
  /** Shape */
  shape?: RuvoAvatarShape;
  /** Icon fallback */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show online status indicator */
  online?: boolean;
  /** Show shadow */
  showShadow?: boolean;
  /** Custom style */
  style?: ViewStyle;
  /** Background color for fallback */
  backgroundColor?: string;
}

export const RuvoAvatar: React.FC<RuvoAvatarProps> = ({
  source,
  name,
  size = 'md',
  customSize,
  shape = 'circle',
  icon,
  online,
  showShadow = false,
  style,
  backgroundColor,
}) => {
  // Size configurations
  const sizeConfig = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 72,
    '2xl': 96,
  };

  const avatarSize = customSize || sizeConfig[size];
  const fontSize = avatarSize * 0.4;
  const iconSize = avatarSize * 0.5;
  const statusSize = avatarSize * 0.25;

  // Border radius by shape
  const getBorderRadius = () => {
    switch (shape) {
      case 'circle':
        return avatarSize / 2;
      case 'square':
        return 0;
      case 'rounded':
        return RuvoSemanticRadius.avatarSquare;
    }
  };

  // Generate initials from name
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate color from name
  const getColorFromName = (name?: string) => {
    if (backgroundColor) return backgroundColor;
    if (!name) return RuvoQuickColors.bgSecondary;
    
    const colors = [
      '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: getBorderRadius(),
            backgroundColor: source ? 'transparent' : getColorFromName(name),
          },
          showShadow && RuvoSemanticShadows.avatar,
        ]}
      >
        {source ? (
          <Image
            source={{ uri: source }}
            style={[
              styles.image,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: getBorderRadius(),
              },
            ]}
          />
        ) : icon ? (
          <Ionicons
            name={icon}
            size={iconSize}
            color="#FFFFFF"
          />
        ) : (
          <Text
            style={[
              styles.initials,
              { fontSize },
            ]}
          >
            {getInitials(name)}
          </Text>
        )}
      </View>

      {/* Online Status Indicator */}
      {online !== undefined && (
        <View
          style={[
            styles.statusIndicator,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              backgroundColor: online ? RuvoQuickColors.success : RuvoQuickColors.textTertiary,
              borderWidth: avatarSize > 40 ? 2 : 1.5,
            },
          ]}
        />
      )}
    </View>
  );
};

/**
 * RuvoAvatarGroup — Stacked avatar group
 */
export interface RuvoAvatarGroupProps {
  /** Avatar data */
  avatars: Array<{
    source?: string;
    name?: string;
  }>;
  /** Maximum avatars to show */
  max?: number;
  /** Avatar size */
  size?: RuvoAvatarSize;
  /** Custom size */
  customSize?: number;
  /** Custom style */
  style?: ViewStyle;
}

export const RuvoAvatarGroup: React.FC<RuvoAvatarGroupProps> = ({
  avatars,
  max = 3,
  size = 'sm',
  customSize,
  style,
}) => {
  const displayAvatars = avatars.slice(0, max);
  const remaining = Math.max(0, avatars.length - max);

  const sizeConfig = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 72,
    '2xl': 96,
  };

  const avatarSize = customSize || sizeConfig[size];
  const overlap = avatarSize * 0.3;

  return (
    <View style={[styles.group, style]}>
      {displayAvatars.map((avatar, index) => (
        <View
          key={index}
          style={[
            styles.groupAvatar,
            {
              marginLeft: index > 0 ? -overlap : 0,
              zIndex: displayAvatars.length - index,
            },
          ]}
        >
          <RuvoAvatar
            {...avatar}
            size={size}
            customSize={customSize}
            showShadow
          />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.groupAvatar,
            { marginLeft: -overlap, zIndex: 0 },
          ]}
        >
          <View
            style={[
              styles.remainingBadge,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.remainingText,
                { fontSize: avatarSize * 0.35 },
              ]}
            >
              +{remaining}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    ...RuvoTypography.bodySemiBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: RuvoQuickColors.surfaceWhite,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupAvatar: {
    borderWidth: 2,
    borderColor: RuvoQuickColors.surfaceWhite,
    borderRadius: 999,
  },
  remainingBadge: {
    backgroundColor: RuvoQuickColors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: RuvoQuickColors.surfaceWhite,
  },
  remainingText: {
    ...RuvoTypography.labelSmall,
    color: RuvoQuickColors.textSecondary,
    fontWeight: '700',
  },
});
