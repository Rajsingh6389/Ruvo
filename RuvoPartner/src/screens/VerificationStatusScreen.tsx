import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

export const VerificationStatusScreen = () => {
  const { logout, token, verificationStatus, setVerificationStatus, startResubmit } = useAuth();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [adminReason, setAdminReason] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/verification/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setVerificationStatus(data.data.profileStatus);
        setAdminReason(data.data.adminReason);
      }
    } catch {
      // Failed to check verification status
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleResubmit = async () => {
    await startResubmit();
    setVerificationStatus('NEW');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <Text style={[styles.appTitle, { color: colors.primary }]}>RuVo Partner</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
        ) : verificationStatus === 'UNDER_REVIEW' ? (
          <View style={styles.statusBox}>
            <Text style={styles.icon}>🟡</Text>
            <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>Under Review</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Your verification profile and vehicle details are currently under review.
            </Text>
            <Text style={[styles.info, { color: colors.textSecondary }]}>
              You will be able to start accepting deliveries once the administrator approves your request.
            </Text>
          </View>
        ) : verificationStatus === 'REJECTED' ? (
          <View style={styles.statusBox}>
            <Text style={styles.icon}>🔴</Text>
            <Text style={[styles.statusTitle, { color: '#E53935' }]}>Verification Rejected</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Unfortunately, your verification request has been rejected.
            </Text>
            {adminReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Rejection Reason:</Text>
                <Text style={styles.reasonText}>{adminReason}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.resubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleResubmit}
            >
              <Text style={styles.resubmitText}>Resubmit Verification</Text>
            </TouchableOpacity>
          </View>
        ) : verificationStatus === 'SUSPENDED' || verificationStatus === 'INACTIVE' ? (
          <View style={styles.statusBox}>
            <Text style={styles.icon}>🚫</Text>
            <Text style={[styles.statusTitle, { color: '#E53935' }]}>Account Suspended</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Your delivery partner account has been suspended or blocked.
            </Text>
            <Text style={[styles.info, { color: colors.textSecondary }]}>
              Please contact RuVo administrator support for assistance.
            </Text>
          </View>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.icon}>⏳</Text>
            <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>Verification Pending</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>Complete your profile and vehicle details. Ruvo will review them before enabling delivery requests.</Text>
            <TouchableOpacity style={[styles.resubmitBtn, { backgroundColor: colors.primary }]} onPress={handleResubmit}>
              <Text style={styles.resubmitText}>Complete Verification</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.refreshBtn, { borderColor: colors.border }]} onPress={checkStatus}>
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  statusBox: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  icon: {
    fontSize: 60,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  info: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  reasonBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginVertical: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
  },
  reasonLabel: {
    fontWeight: 'bold',
    color: '#B71C1C',
    fontSize: 13,
    marginBottom: 4,
  },
  reasonText: {
    color: '#B71C1C',
    fontSize: 14,
  },
  resubmitBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  resubmitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  refreshBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutBtn: {
    paddingVertical: 8,
  },
  logoutText: {
    color: '#757575',
    fontWeight: '500',
  },
});
