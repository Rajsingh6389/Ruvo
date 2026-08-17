import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { sw, sh, sf } from '../../utils/responsive';

type MenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
  showArrow?: boolean;
};

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const sellerMenuItems: MenuItem[] = [
    {
      id: 'register_shop',
      title: 'Register a Shop',
      subtitle: 'Continue in the dedicated Ruvo Shop app',
      icon: 'add-circle' as const,
      color: '#3B82F6',
      onPress: () => navigation.navigate(ROUTES.REGISTER_SHOP as never),
      showArrow: true,
    },
  ];

  const activityMenuItems: MenuItem[] = [
    {
      id: 'edit_profile',
      title: 'Edit Profile',
      subtitle: 'Update your name and account details',
      icon: 'create-outline',
      color: '#2563EB',
      onPress: () => navigation.navigate(ROUTES.EDIT_PROFILE as never),
      showArrow: true,
    },
    {
      id: 'orders',
      title: 'My Orders',
      subtitle: 'Track your order history',
      icon: 'receipt',
      color: '#6A1B9A',
      onPress: () => navigation.navigate(ROUTES.ORDER_HISTORY as never),
      showArrow: true,
    },
  ];

  const supportMenuItems: MenuItem[] = [
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Contact us for assistance',
      icon: 'help-circle',
      color: '#00838F',
      onPress: () => Alert.alert('Help & Support', 'Our customer support team is available 24/7. Email us at support@ruvo.in'),
      showArrow: true,
    },
  ];

  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName}
            </Text>
            {userEmail ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {userEmail}
              </Text>
            ) : null}
            <View style={styles.memberBadge}>
              <Ionicons
                name={user?.role === 'ADMIN' ? 'shield-checkmark' : 'leaf'}
                size={sf(12)}
                color={COLORS.primaryGreen}
              />
              <Text style={styles.memberText}>
                {user?.role === 'ADMIN' ? 'RuVo Admin' : 'RuVo Member'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sell with Ruvo</Text>
          {sellerMenuItems.map((item, index) => (
            <MenuRow key={item.id} item={item} isLast={index === sellerMenuItems.length - 1} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {activityMenuItems.map((item, index) => (
            <MenuRow key={item.id} item={item} isLast={index === activityMenuItems.length - 1} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          {supportMenuItems.map((item, index) => (
            <MenuRow key={item.id} item={item} isLast={index === supportMenuItems.length - 1} />
          ))}
        </View>

        {user?.role === 'ADMIN' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleDanger]}>
              Admin Settings
            </Text>
            <MenuRow
              isLast
              item={{
                id: 'admin_dashboard',
                title: 'Admin Dashboard',
                subtitle: 'Manage pending shop registrations',
                icon: 'shield-checkmark',
                color: COLORS.error,
                onPress: () => navigation.navigate(ROUTES.ADMIN_DASHBOARD as never),
                showArrow: true,
              }}
            />
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={sf(20)} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>RuVo v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const MenuRow = ({ item, isLast }: { item: MenuItem; isLast?: boolean }) => (
  <TouchableOpacity
    style={[styles.menuRow, isLast && styles.menuRowLast]}
    onPress={item.onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
      <Ionicons name={item.icon} size={sf(22)} color={item.color} />
    </View>
    <View style={styles.menuText}>
      <Text style={styles.menuTitle}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      ) : null}
    </View>
    {item.showArrow && (
      <Ionicons name="chevron-forward" size={sf(18)} color={COLORS.border} />
    )}
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// RUVO DESIGN SYSTEM TOKENS
// ─────────────────────────────────────────────
const COLORS = {
  primaryGreen: '#2E7D32',
  lightGreen: '#E8F5E9',
  background: '#F7F8FA',
  white: '#FFFFFF',
  textMain: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#E53935',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: sh(32) },

  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: sw(20),
    paddingTop: sh(16),
    paddingBottom: sh(8),
  },
  headerTitle: {
    fontSize: sf(24),
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: 0.2,
  },

  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: sw(16),
    marginTop: sh(12),
    marginBottom: sh(16),
    borderRadius: sw(16),
    padding: sw(16),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  avatarCircle: {
    width: sw(56),
    height: sw(56),
    borderRadius: sw(28),
    backgroundColor: COLORS.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sw(14),
  },
  avatarText: {
    fontSize: sf(24),
    fontWeight: '700',
    color: COLORS.white,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: sf(17),
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: sh(2),
  },
  profileEmail: {
    fontSize: sf(13),
    color: COLORS.textSecondary,
    marginBottom: sh(6),
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: sw(8),
    paddingVertical: sh(4),
    borderRadius: sw(10),
    alignSelf: 'flex-start',
    gap: sw(4),
  },
  memberText: {
    fontSize: sf(11),
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },

  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: sw(16),
    marginBottom: sh(12),
    borderRadius: sw(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: sf(12),
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: sw(16),
    paddingTop: sh(14),
    paddingBottom: sh(6),
  },
  sectionTitleDanger: {
    color: COLORS.error,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sw(16),
    paddingVertical: sh(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    minHeight: sh(48),
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: sw(40),
    height: sw(40),
    borderRadius: sw(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sw(14),
  },
  menuText: { flex: 1 },
  menuTitle: {
    fontSize: sf(15),
    fontWeight: '600',
    color: COLORS.textMain,
  },
  menuSubtitle: {
    fontSize: sf(12),
    color: COLORS.textSecondary,
    marginTop: sh(2),
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: sw(16),
    marginTop: sh(4),
    marginBottom: sh(16),
    paddingVertical: sh(14),
    borderRadius: sw(14),
    backgroundColor: '#FDECEA',
    gap: sw(8),
  },
  logoutText: {
    fontSize: sf(15),
    fontWeight: '700',
    color: COLORS.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: sf(12),
    color: COLORS.textSecondary,
    opacity: 0.6,
    marginBottom: sh(8),
  },
});
