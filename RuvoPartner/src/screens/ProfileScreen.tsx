import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen = () => {
  const { colors } = useTheme();
  const { user, logout, verificationStatus } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out?', [
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Account Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarBox, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.nameText, { color: colors.textPrimary }]}>{user?.name || 'Loading...'}</Text>
          <Text style={[styles.roleText, { color: colors.textSecondary }]}>Delivery Partner</Text>
        </View>

        {/* Info Fields */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal Information</Text>
        
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mobile Number</Text>
            <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{user?.mobileNumber || 'N/A'}</Text>
          </View>

          <View style={[styles.infoRow, styles.borderTop]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Account Status</Text>
            <Text style={[styles.infoVal, { color: verificationStatus === 'APPROVED' ? colors.success : colors.error, fontWeight: 'bold' }]}>{verificationStatus.replaceAll('_', ' ')}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Vehicle</Text>
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 24 }]}>
          {user?.vehicle ? <>
            <View style={styles.infoRow}><Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text><Text style={[styles.infoVal, { color: colors.textPrimary }]}>{user.vehicle.vehicleType}</Text></View>
            <View style={[styles.infoRow, styles.borderTop]}><Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Number</Text><Text style={[styles.infoVal, { color: colors.textPrimary }]}>{user.vehicle.vehicleNumber}</Text></View>
          </> : <Text style={[styles.infoLabel, { color: colors.textSecondary, paddingVertical: 14 }]}>Vehicle details have not been submitted.</Text>}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Security</Text>
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 24 }]}>
          <TouchableOpacity style={styles.infoRow} onPress={() => navigation.navigate('ActiveDevices')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textPrimary, fontWeight: '500' }]}>Active Devices & Sessions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 1,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  roleText: {
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  infoRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
