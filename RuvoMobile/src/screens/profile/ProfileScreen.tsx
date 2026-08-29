import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { SPACING } from '../../theme/spacing';

type MenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  onPress: () => void;
};

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const { colors, typography, radius, shadows, spacing, theme, toggleTheme, mode, setMode } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [helpVisible, setHelpVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState<'EN' | 'HI' | 'OR'>('EN');

  const userName = user?.name ?? 'User';
  const userMobile = (user as any)?.mobile || (user as any)?.mobileNumber || '';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleNavPress = (route: string) => navigation.navigate(route as never);

  // ─ Menu sections ────────────────────────────────────────────────────────
  const activityItems: MenuItem[] = [
    {
      id: 'orders',
      title: 'My Orders',
      subtitle: 'Track and view past orders',
      icon: 'receipt-outline',
      tint: '#7C3AED',
      onPress: () => navigation.navigate(ROUTES.ORDER_HISTORY as never),
    },
    {
      id: 'edit_profile',
      title: 'Edit Profile',
      subtitle: 'Update name and account details',
      icon: 'create-outline',
      tint: '#2563EB',
      onPress: () => navigation.navigate(ROUTES.EDIT_PROFILE as never),
    },
    {
      id: 'wishlist',
      title: 'Wishlist & Favorites',
      subtitle: 'Saved items and favorite shops',
      icon: 'heart-outline',
      tint: '#E11D48',
      onPress: () => Alert.alert('Wishlist', 'View your bookmarked items on the Home tab.'),
    },
  ];

  const businessItems: MenuItem[] = [
    {
      id: 'register_shop',
      title: 'Open a Shop on RuVo',
      subtitle: 'Start selling via the Ruvo Shop app',
      icon: 'storefront-outline',
      tint: '#0891B2',
      onPress: () => navigation.navigate(ROUTES.REGISTER_SHOP as never),
    },
  ];

  const supportItems: MenuItem[] = [
    {
      id: 'settings',
      title: 'App Settings',
      subtitle: 'Notifications, language & preferences',
      icon: 'settings-outline',
      tint: '#4B5563',
      onPress: () => setSettingsVisible(true),
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'FAQs, contact support, live chat',
      icon: 'help-circle-outline',
      tint: '#0D9488',
      onPress: () => setHelpVisible(true),
    },
    {
      id: 'help_desk',
      title: 'Help Desk',
      subtitle: 'Raise a ticket or browse articles',
      icon: 'chatbubble-ellipses-outline',
      tint: '#D97706',
      onPress: () => navigation.navigate(ROUTES.HELP as never),
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.navClearance }]}
      >
        {/* ─ PROFILE HERO ──────────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={[typography.headingL, styles.pageTitle, { color: colors.textPrimary }]}>Account</Text>

          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.md]}>
            {/* Avatar */}
            <View style={[styles.avatarWrap, { backgroundColor: colors.primary, borderRadius: radius.pill }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            {/* Info */}
            <View style={styles.profileInfo}>
              <Text style={[typography.headingM, { color: colors.textPrimary }]} numberOfLines={1}>
                {userName}
              </Text>
              {userMobile ? (
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                  +91 {userMobile.replace(/[^0-9]/g, '').slice(-10)}
                </Text>
              ) : null}
              <View style={[styles.rolePill, { backgroundColor: colors.primarySoft, borderRadius: radius.xs }]}>
                <Ionicons
                  name={user?.role === 'ADMIN' ? 'shield-checkmark' : 'leaf'}
                  size={12}
                  color={colors.primaryDark}
                />
                <Text style={[typography.overline, { color: colors.primaryDark, fontSize: 10 }]}>
                  {user?.role === 'ADMIN' ? 'RuVo Admin' : 'RuVo Member'}
                </Text>
              </View>
            </View>

            {/* Edit arrow */}
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.surfaceSunken, borderRadius: radius.sm }]}
              onPress={() => navigation.navigate(ROUTES.EDIT_PROFILE as never)}
            >
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─ ACTIVITY ──────────────────────────────────────────────────── */}
        <MenuSection title="Activity" items={activityItems} colors={colors} typography={typography} radius={radius} />

        {/* ─ BUSINESS ──────────────────────────────────────────────────── */}
        <MenuSection title="Sell with RuVo" items={businessItems} colors={colors} typography={typography} radius={radius} />

        {/* ─ SUPPORT ───────────────────────────────────────────────────── */}
        <MenuSection title="Support" items={supportItems} colors={colors} typography={typography} radius={radius} />

        {/* ─ ADMIN ─────────────────────────────────────────────────────── */}
        {user?.role === 'ADMIN' && (
          <MenuSection
            title="Admin"
            items={[{
              id: 'admin',
              title: 'Admin Dashboard',
              subtitle: 'Manage shops and registrations',
              icon: 'shield-checkmark',
              tint: colors.error,
              onPress: () => navigation.navigate(ROUTES.ADMIN_DASHBOARD as never),
            }]}
            colors={colors}
            typography={typography}
            radius={radius}
            dangerTitle
          />
        )}

        {/* ─ LOGOUT ────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.errorSoft, borderRadius: radius.card, borderColor: colors.error + '30', borderWidth: 1 }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[typography.button, { color: colors.error }]}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ─ HELP BOTTOM SHEET ─────────────────────────────────────────── */}
      {/* {helpVisible && (
        <BottomSheetOverlay onClose={() => setHelpVisible(false)} title="Help & Support" colors={colors} typography={typography} radius={radius} shadows={shadows}>
          {[
            { icon: 'call-outline' as const, title: 'RuVo Support Helpline', detail: '+91 9125474036 (24×7)' },
            { icon: 'mail-outline' as const, title: 'Email Support', detail: 'support@ruvo.in' },
            { icon: 'chatbubbles-outline' as const, title: 'Live Chat', detail: 'Chat with our team' },
          ].map((item, i) => (
            <View key={i} style={[styles.helpRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.helpIconBox, { backgroundColor: colors.primarySoft, borderRadius: radius.sm }]}>
                <Ionicons name={item.icon} size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{item.detail}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.faqBox, { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, marginTop: 12 }]}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: 6 }]}>Frequently Asked Questions</Text>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 20 }]}>
              {'• How to track live orders?\n  Go to Orders → Track Live Delivery.\n\n• Cancellation Policy?\n  Cancel before the shopkeeper accepts.'}
            </Text>
          </View>
        </BottomSheetOverlay>
      )} */}

      {/* ─ SETTINGS BOTTOM SHEET ─────────────────────────────────────── */}
      {settingsVisible && (
        <BottomSheetOverlay onClose={() => setSettingsVisible(false)} title="App Settings" colors={colors} typography={typography} radius={radius} shadows={shadows} actionLabel="Save Preferences">
          {/* Theme Toggle */}
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Theme</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {mode === 'system' ? 'Follow system' : theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: theme === 'dark' ? colors.primary : colors.card, borderColor: colors.border, borderRadius: radius.sm }]}
              onPress={toggleTheme}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'}
                size={20}
                color={theme === 'dark' ? colors.onPrimary : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Push Notifications</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Order updates & deals</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.card}
            />
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>App Language</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Select preferred language</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['EN', 'HI', 'OR'] as const).map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.langChip,
                    {
                      borderColor: language === lang ? colors.primary : colors.border,
                      backgroundColor: language === lang ? colors.primarySoft : colors.surfaceSunken,
                      borderRadius: radius.sm,
                    },
                  ]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={[typography.overline, {
                    color: language === lang ? colors.primaryDark : colors.textSecondary,
                    fontSize: 11,
                  }]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </BottomSheetOverlay>
      )}
    </SafeAreaView>
  );
};

// ─ Sub-components ──────────────────────────────────────────────────────────
interface MenuSectionProps {
  title: string;
  items: MenuItem[];
  colors: any;
  typography: any;
  radius: any;
  dangerTitle?: boolean;
}

const MenuSection: React.FC<MenuSectionProps> = ({ title, items, colors, typography, radius, dangerTitle }) => (
  <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
    <Text style={[
      typography.label,
      styles.sectionTitle,
      { color: dangerTitle ? colors.error : colors.textHint },
    ]}>      {title}
    </Text>
    {items.map((item, i) => (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.menuRow,
          i > 0 && { borderTopWidth: 1, borderTopColor: colors.surfaceSunken },
        ]}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.menuIcon, { backgroundColor: item.tint + '18', borderRadius: radius.sm }]}>
          <Ionicons name={item.icon} size={20} color={item.tint} />
        </View>
        <View style={styles.menuText}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 15 }]}>{item.title}</Text>
          {item.subtitle ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{item.subtitle}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.border} />
      </TouchableOpacity>
    ))}
  </View>
);

interface BottomSheetOverlayProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  colors: any;
  typography: any;
  radius: any;
  shadows: any;
  actionLabel?: string;
}

const BottomSheetOverlay: React.FC<BottomSheetOverlayProps> = ({
  onClose, title, children, colors, typography, radius, shadows, actionLabel = 'Close',
}) => (
  <View style={styles.sheetOverlay}>
    <TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} />
    <View style={[styles.sheetCard, { backgroundColor: colors.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet }, shadows.xl]}>
      {/* Handle */}
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
      {/* Header */}
      <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
        <Text style={[typography.headingM, { color: colors.textPrimary }]}>{title}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {/* Content */}
      <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {/* CTA */}
      <TouchableOpacity
        style={[styles.sheetCta, { backgroundColor: colors.primary, borderRadius: radius.button }]}
        onPress={onClose}
      >
        <Text style={[typography.button, { color: colors.onPrimary }]}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },

  heroSection: {
    paddingHorizontal: SPACING.gutter,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  pageTitle: {
    marginBottom: SPACING.md,
    fontWeight: '800',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#231C10',
  },
  profileInfo: { flex: 1 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  editBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    marginHorizontal: SPACING.gutter,
    marginBottom: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.gutter,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  versionText: {
    textAlign: 'center',
    marginBottom: SPACING.lg,
    opacity: 0.6,
  },

  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  helpIconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqBox: { padding: 14 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  themeToggle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
  },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30,26,21,0.5)',
  },
  sheetCard: {
    paddingHorizontal: SPACING.gutter,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    marginBottom: SPACING.sm,
  },
  sheetContent: { maxHeight: 320 },
  sheetCta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: SPACING.lg,
  },
});
