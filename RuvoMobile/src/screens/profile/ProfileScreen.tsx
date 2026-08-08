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
      onPress: () => Alert.alert('Coming Soon', 'Order history coming soon.'),
      showArrow: true,
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Contact us for assistance',
      icon: 'help-circle',
      color: '#00838F',
      onPress: () => Alert.alert('Coming Soon', 'Help & support coming soon.'),
      showArrow: true,
    },
  ];

  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
            <Text style={styles.profileName}>{userName}</Text>
            {userEmail ? (
              <Text style={styles.profileEmail}>{userEmail}</Text>
            ) : null}
            <View style={styles.memberBadge}>
              <Ionicons name={user?.role === 'ROLE_ADMIN' ? 'shield-checkmark' : 'leaf'} size={12} color="#2E7D32" />
              <Text style={styles.memberText}>
                {user?.role === 'ADMIN' ? 'RuVo Admin' : 'RuVo Member'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller Zone</Text>
          {menuItems.slice(0, 2).map(item => (
            <MenuRow key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {menuItems.slice(2, 3).map(item => (
            <MenuRow key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          {menuItems.slice(3).map(item => (
            <MenuRow key={item.id} item={item} />
          ))}
        </View>

        {user?.role === 'ADMIN' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#E53935' }]}>Admin Settings</Text>
            <MenuRow
              item={{
                id: 'admin_dashboard',
                title: 'Admin Dashboard',
                subtitle: 'Manage pending shop registrations',
                icon: 'shield-checkmark',
                color: '#E53935',
                onPress: () => navigation.navigate(ROUTES.ADMIN_DASHBOARD as never),
                showArrow: true,
              }}
            />
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E53935" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const MenuRow = ({ item }: { item: MenuItem }) => (
  <TouchableOpacity style={styles.menuRow} onPress={item.onPress} activeOpacity={0.7}>
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
      <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 6,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  memberText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
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
    color: '#212121',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFEBEE',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E53935',
  },
});
