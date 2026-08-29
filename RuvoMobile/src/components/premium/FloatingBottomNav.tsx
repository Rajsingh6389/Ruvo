import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';
import { ROUTES } from '../../constants/routes';
import { useCart } from '../../context/CartContext';
import { DURATIONS } from '../../theme/motion';

interface FloatingBottomNavProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
}

const TAB_ITEMS = [
  { id: ROUTES.HOME, icon: 'home', label: 'Home' },
  { id: ROUTES.CART, icon: 'cart', label: 'Cart' },
  { id: ROUTES.JOBS, icon: 'briefcase', label: 'Local Jobs' },
  { id: ROUTES.PROFILE, icon: 'person', label: 'Account' },
] as const;

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  activeRoute,
  onNavigate,
}) => {
  const { colors, typography, radius, shadows } = useTheme();
  const { sf, sw, sh } = useResponsive();
  const insets = useSafeAreaInsets();
  const { cartCount } = useCart();

  const activeScale = React.useRef(new Animated.Value(activeRoute === ROUTES.HOME ? 1 : 0)).current;

  const animatedStyle = {
    transform: [{ scale: activeScale }],
  };

  React.useEffect(() => {
    Animated.timing(activeScale, {
      toValue: activeRoute === ROUTES.HOME ? 1 : 0,
      duration: DURATIONS.base,
      useNativeDriver: true,
    }).start();
  }, [activeRoute]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 16,
          backgroundColor: colors.translucent,
          borderColor: colors.translucentBorder,
          borderRadius: radius.nav,
          marginHorizontal: sw(16),
          marginBottom: sh(16),
        },
        shadows.nav,
      ]}
    >
      {TAB_ITEMS.map((item) => {
        const isActive = activeRoute === item.id;
        const showBadge = item.id === ROUTES.CART && cartCount > 0;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.tabItem}
            onPress={() => onNavigate(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              {isActive && item.id === ROUTES.HOME && (
                <Animated.View
                  style={[
                    styles.activePill,
                    {
                      backgroundColor: colors.primarySoft,
                      borderRadius: radius.sm,
                    },
                    animatedStyle,
                  ]}
                />
              )}
              <Ionicons
                name={isActive ? (item.icon as any) : `${item.icon}-outline` as any}
                size={sf(22)}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              {showBadge && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.error,
                      borderRadius: radius.xs,
                    },
                  ]}
                >
                  <Text style={[typography.overline, { color: '#FFFFFF', fontSize: sf(9) }]}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                typography.navLabel,
                styles.label,
                { color: isActive ? colors.primary : colors.textSecondary },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  activePill: {
    position: 'absolute',
    width: 40,
    height: 28,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  label: {
    textAlign: 'center',
  },
});
