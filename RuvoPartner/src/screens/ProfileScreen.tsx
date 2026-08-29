import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const ProfileScreen = () => {
  const { colors, typography, radius, shadows, spacing } = useTheme();
  const { user, logout, verificationStatus } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your delivery partner account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
      ],
    );
  };

  const isApproved = verificationStatus === 'APPROVED';
  const userName = user?.name || 'Delivery Partner';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[typography.headingL, { color: colors.textPrimary }]}>Account</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
          Manage your partner details and security
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.gutter }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PROFILE CARD ────────────────────────────────────── */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.md]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary, borderRadius: radius.pill }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[typography.headingM, { color: colors.textPrimary }]} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              RuVo Delivery Partner
            </Text>
            <View style={[
              styles.statusPill,
              {
                backgroundColor: isApproved ? colors.successSoft : colors.warningSoft,
                borderRadius: radius.xs,
              },
            ]}>
              <Ionicons
                name={isApproved ? 'checkmark-circle' : 'time'}
                size={12}
                color={isApproved ? colors.success : '#D97706'}
              />
              <Text style={[typography.overline, {
                color: isApproved ? colors.success : '#B45309',
                fontSize: 10,
                fontWeight: '700',
              }]}>
                {verificationStatus?.replaceAll?.('_', ' ') ?? 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── PERSONAL INFO ────────────────────────────────────── */}
        <SectionTitle title="Personal Details" colors={colors} typography={typography} />
        <InfoBox colors={colors} radius={radius} shadows={shadows}>
          <InfoRow label="Mobile Number" value={user?.mobileNumber || 'N/A'} colors={colors} typography={typography} />
          <InfoRow label="Role" value="Partner Driver" colors={colors} typography={typography} divider />
        </InfoBox>

        {/* ── VEHICLE ──────────────────────────────────────────── */}
        <SectionTitle title="Assigned Vehicle" colors={colors} typography={typography} />
        <InfoBox colors={colors} radius={radius} shadows={shadows}>
          {user?.vehicle ? (
            <>
              <InfoRow label="Vehicle Type" value={user.vehicle.vehicleType} colors={colors} typography={typography} />
              <InfoRow label="Registration" value={user.vehicle.vehicleNumber} colors={colors} typography={typography} divider />
            </>
          ) : (
            <Text style={[typography.body, { color: colors.textSecondary, paddingVertical: 14 }]}>
              Vehicle details have not been submitted.
            </Text>
          )}
        </InfoBox>

        {/* ── SECURITY ─────────────────────────────────────────── */}
        <SectionTitle title="Security & Access" colors={colors} typography={typography} />
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.sm]}>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => navigation.navigate('ActiveDevices')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primarySoft, borderRadius: radius.sm }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>
              Active Devices & Sessions
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.border} />
          </TouchableOpacity>
        </View>

        {/* ── LOGOUT ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.logoutBtn, {
            backgroundColor: colors.errorSoft,
            borderColor: colors.error + '30',
            borderRadius: radius.card,
          }]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[typography.button, { color: colors.error }]}>Sign Out Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────
const SectionTitle = ({ title, colors, typography }: any) => (
  <Text style={[
    typography.label,
    { color: colors.textHint, fontSize: 11, letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  ]}>
    {title}
  </Text>
);

const InfoBox = ({ children, colors, radius, shadows }: any) => (
  <View style={[
    styles.infoBox,
    { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card, marginBottom: 20 },
    shadows.sm,
  ]}>
    {children}
  </View>
);

const InfoRow = ({ label, value, colors, typography, divider }: any) => (
  <View style={[styles.infoRow, divider && { borderTopWidth: 1, borderTopColor: colors.surfaceSunken }]}>
    <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13 }]}>{label}</Text>
    <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  scrollContent: { paddingTop: 20, paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },

  infoBox: {
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: 4,
  },
});
