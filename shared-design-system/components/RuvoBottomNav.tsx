/**
 * RuvoBottomNav — Universal Floating Bottom Navigation
 * 
 * Premium floating navigation bar for all RuVo apps
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
  RuvoSpringConfig,
} from '../tokens';

export interface RuvoBottomNavItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Icon name */
  icon: keyof typeof Ionicons.glyphMap;
  /** Active icon (optional, defaults to icon) */
  activeIcon?: keyof typeof Ionicons.glyphMap;
  /** Show badge */
  badge?: number | boolean;
}

export interface RuvoBottomNavProps {
  /** Navigation items */
  items: RuvoBottomNavItem[];
  /** Active item key */
  activeKey: string;
  /** Item press handler */
  onItemPress: (key: string) => void;
  /** Hide labels */
  hideLabels?: boolean;
}

export const RuvoBottomNav: React.FC<RuvoBottomNavProps> = ({
  items,
  activeKey,
  onItemPress,
  hideLabels = false,
}) => {
  const insets = useSafeAreaInsets();
  const activeIndex = items.findIndex(item => item.key === activeKey);

  // Animated indicator position
  const indicatorAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeIndex,
      ...RuvoSpringConfig.snappy,
    }).start();
  }, [activeIndex, indicatorAnim]);

  const itemWidth = 100 / items.length;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Platform.OS === 'ios' ? insets.bottom || 16 : 16 },
      ]}
    >
      {/* Floating Container */}
      <View style={[styles.navContainer, RuvoSemanticShadows.floatingNav]}>
        {/* Active Indicator Background */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              width: `${itemWidth}%`,
              transform: [
                {
                  translateX: indicatorAnim.interpolate({
                    inputRange: items.map((_, i) => i),
                    outputRange: items.map((_, i) => i * (100 / items.length)),
                  }),
                },
              ],
            },
          ]}
        />

        {/* Navigation Items */}
        {items.map((item, index) => {
          const isActive = item.key === activeKey;
          return (
            <NavItem
              key={item.key}
              item={item}
              isActive={isActive}
              onPress={() => onItemPress(item.key)}
              hideLabel={hideLabels}
            />
          );
        })}
      </View>
    </View>
  );
};

/**
 * Individual Nav Item
 */
interface NavItemProps {
  item: RuvoBottomNavItem;
  isActive: boolean;
  onPress: () => void;
  hideLabel: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, isActive, onPress, hideLabel }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(iconAnim, {
      toValue: isActive ? 1 : 0,
      ...RuvoSpringConfig.snappy,
    }).start();
  }, [isActive, iconAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      ...RuvoSpringConfig.stiff,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...RuvoSpringConfig.snappy,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.navItem}
    >
      <Animated.View
        style={[
          styles.navItemContent,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Icon Container */}
        <View style={styles.iconContainer}>
          <Animated.View
            style={{
              transform: [
                {
                  scale: iconAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            }}
          >
            <Ionicons
              name={isActive && item.activeIcon ? item.activeIcon : item.icon}
              size={24}
              color={isActive ? RuvoQuickColors.primary : RuvoQuickColors.textTertiary}
            />
          </Animated.View>

          {/* Badge */}
          {item.badge && (
            <View style={styles.badge}>
              {typeof item.badge === 'number' && (
                <Text style={styles.badgeText}>
                  {item.badge > 99 ? '99+' : item.badge}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Label */}
        {!hideLabel && (
          <Text
            style={[
              styles.label,
              { color: isActive ? RuvoQuickColors.primary : RuvoQuickColors.textTertiary },
              isActive && styles.labelActive,
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  navContainer: {
    flexDirection: 'row',
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderRadius: RuvoSemanticRadius.bottomNav,
    paddingVertical: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    backgroundColor: RuvoQuickColors.primarySoft,
    borderRadius: RuvoSemanticRadius.bottomNav - 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: RuvoQuickColors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...RuvoTypography.overline,
    fontSize: 9,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  label: {
    ...RuvoTypography.captionSmall,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '600',
  },
});
