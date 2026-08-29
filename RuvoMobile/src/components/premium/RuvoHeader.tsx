import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';

interface RuvoHeaderProps {
  greeting?: string;
  userName?: string;
  locationText?: string;
  onLocationPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  notificationCount?: number;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onSearchSubmit?: () => void;
}

export const RuvoHeader: React.FC<RuvoHeaderProps> = ({
  greeting,
  userName,
  locationText,
  onLocationPress,
  onNotificationPress,
  onProfilePress,
  notificationCount = 0,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
}) => {
  const { colors, typography, radius, shadows, theme } = useTheme();
  const { sf, sw, sh } = useResponsive();
  const insets = useSafeAreaInsets();

  const getGreeting = () => {
    if (greeting) return greeting;
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = userName || 'RuVo';

  // Action buttons need to stay visible in both light and dark mode.
  // Use a semi-transparent white overlay in light mode, a slightly lighter
  // surface in dark mode — both always contrast against the header background.
  const btnBg  = theme === 'dark' ? colors.surfaceElevated : colors.primarySoft;
  const iconColor = theme === 'dark' ? colors.textPrimary   : colors.primaryDeep;

  // Avatar URL — strip the '#' from the hex colour so the URL is valid
  const avatarBg = colors.primary.replace('#', '');
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${avatarBg}&color=231C10&bold=true&size=128`;

  return (
    <View style={[styles.container, { paddingTop: insets.top + sh(12), backgroundColor: colors.surface }]}>
      <View style={styles.topRow}>
        {/* ── Left: greeting + location ─────────────────────────── */}
        <View style={styles.greetingSection}>
          <Text style={[typography.headingS, { color: colors.textPrimary, fontSize: sf(14) }]}>
            RuVo
          </Text>
          <Text style={[typography.headingL, { color: colors.textPrimary, fontSize: sf(20), marginTop: sh(2) }]}>
            {getGreeting()}, {displayName} 👋
          </Text>

          {locationText && (
            <TouchableOpacity
              style={styles.locationRow}
              onPress={onLocationPress}
              activeOpacity={0.7}
            >
              <Text style={[typography.caption, { color: colors.textHint, fontSize: sf(11) }]}>
                Delivering to
              </Text>
              <View style={styles.locationContent}>
                <Ionicons name="location" size={sf(13)} color={colors.primary} />
                <Text
                  style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: sf(13), flexShrink: 1 }]}
                  numberOfLines={1}
                >
                  {locationText}
                </Text>
                <Ionicons name="chevron-down" size={sf(13)} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Right: notification bell + avatar ─────────────────── */}
        <View style={styles.actions}>
          {/* Notification bell */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: btnBg, borderRadius: 21 }]}
            onPress={onNotificationPress}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={sf(20)} color={iconColor} />
            {notificationCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={[typography.overline, { color: '#FFFFFF', fontSize: sf(9) }]}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity
            style={[styles.avatarButton, { borderRadius: radius.pill }]}
            onPress={onProfilePress}
            activeOpacity={0.75}
          >
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ──────────────────────────────────────────── */}
      {showSearch && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceSunken,
              borderColor: colors.border,
              borderRadius: radius.input,
            },
          ]}
          onPress={onSearchSubmit}
        >
          <Ionicons name="search-outline" size={sf(18)} color={colors.textHint} />
          <Text style={[typography.body, { color: colors.textHint, flex: 1 }]} numberOfLines={1}>
            {searchValue || 'Search products, shops...'}
          </Text>
          <Ionicons name="mic-outline" size={sf(18)} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingSection: {
    flex: 1,
    paddingRight: 10,
  },
  locationRow: {
    marginTop: 8,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingTop: 4,
  },
  actionButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  avatarButton: {
    width: 42,
    height: 42,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    gap: 10,
  },
});
