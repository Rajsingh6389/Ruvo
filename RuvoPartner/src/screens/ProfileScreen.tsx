import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PRIMARY_EMERALD = '#059669';
const EMERALD_LIGHT = '#ECFDF5';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';

export const ProfileScreen = () => {
  const { colors } = useTheme();
  const { user, logout, verificationStatus } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your delivery partner account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const isApproved = verificationStatus === 'APPROVED';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: '#F8FAFC' }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
        <Text style={styles.headerSub}>Manage your driver details and security.</Text>
      </View>

      <View style={styles.content}>
        {/* Driver Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={38} color={PRIMARY_EMERALD} />
          </View>
          <Text style={styles.nameText}>{user?.name || 'Delivery Partner'}</Text>
          <Text style={styles.roleText}>RuVo Verified Delivery Partner</Text>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: isApproved ? EMERALD_LIGHT : '#FEF2F2' },
            ]}
          >
            <Ionicons
              name={isApproved ? 'checkmark-circle' : 'time'}
              size={14}
              color={isApproved ? PRIMARY_EMERALD : '#EF4444'}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: isApproved ? PRIMARY_EMERALD : '#EF4444' },
              ]}
            >
              {verificationStatus.replaceAll('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Section 1: Personal Info */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoVal}>{user?.mobileNumber || 'N/A'}</Text>
          </View>

          <View style={[styles.infoRow, styles.borderTop]}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoVal}>Partner Driver</Text>
          </View>
        </View>

        {/* Section 2: Vehicle Info */}
        <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
        <View style={styles.infoBox}>
          {user?.vehicle ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vehicle Type</Text>
                <Text style={styles.infoVal}>{user.vehicle.vehicleType}</Text>
              </View>
              <View style={[styles.infoRow, styles.borderTop]}>
                <Text style={styles.infoLabel}>Registration Number</Text>
                <Text style={styles.infoVal}>{user.vehicle.vehicleNumber}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.noVehicleText}>Vehicle details have not been submitted.</Text>
          )}
        </View>

        {/* Section 3: Security */}
        <Text style={styles.sectionTitle}>Security & Access</Text>
        <View style={styles.infoBox}>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => navigation.navigate('ActiveDevices')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={PRIMARY_EMERALD} />
              <Text style={styles.securityText}>Active Devices & Login Sessions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  contentContainer: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  headerSub: { marginTop: 4, color: TEXT_MUTED, fontSize: 13 },

  content: { padding: 16 },

  profileCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatarBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: EMERALD_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameText: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  roleText: { fontSize: 12, color: TEXT_MUTED, marginTop: 2, fontWeight: '500' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
  },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },

  infoBox: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  infoRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  infoLabel: { fontSize: 13, color: TEXT_MUTED, fontWeight: '500' },
  infoVal: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  securityText: { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  noVehicleText: { color: TEXT_MUTED, fontSize: 13, paddingVertical: 14 },

  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#EF4444' },
});

