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

  const menuItems: MenuItem[] = [
    {
      id: 'shop',
      title: 'Register Your Shop',
      subtitle: 'List your business on RuVo',
      icon: 'storefront',
      color: '#2E7D32',
      onPress: () => navigation.navigate(ROUTES.REGISTER_SHOP),
      showArrow: true,
    },
    {
      id: 'myshops',
      title: 'My Shops',
      subtitle: 'Manage your listed shops',
      icon: 'briefcase',
      color: '#1565C0',
      onPress: () => navigation.navigate(ROUTES.MY_SHOPS),
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
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Contact us for assistance',
      icon: 'help-circle',
      color: '#00838F',
      onPress: () => Alert.alert('sorry for apologies we are implementing this features'),
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
                name={user?.role === 'ROLE_ADMIN' ? 'shield-checkmark' : 'leaf'}
                size={12}
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
          <Text style={styles.sectionTitle}>Seller Zone</Text>
          {menuItems.slice(0, 2).map((item, index) => (
            <MenuRow key={item.id} item={item} isLast={index === 1} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {menuItems.slice(2, 3).map((item, index) => (
            <MenuRow key={item.id} item={item} isLast={index === 0} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          {menuItems.slice(3).map((item, index) => (
            <MenuRow key={item.id} item={item} isLast={index === 0} />
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
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>RuVo</Text>
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
      <Ionicons name={item.icon} size={22} color={item.color} />
    </View>
    <View style={styles.menuText}>
      <Text style={styles.menuTitle}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      ) : null}
    </View>
    {item.showArrow && (
      <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
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
  scrollContent: { paddingBottom: 24 },

  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: 0.2,
  },

  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  memberText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },

  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitleDanger: {
    color: COLORS.error,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    minHeight: 48,
  },
  menuRowLast: {
    // no additional bottom border needed; section already clips corners
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: { flex: 1 },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FDECEA',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.6,
    marginBottom: 8,
  },
});