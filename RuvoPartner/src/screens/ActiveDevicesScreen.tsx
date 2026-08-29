import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

export const ActiveDevicesScreen = () => {
  const { authenticatedFetch, logout } = useAuth();
  const { colors } = useTheme();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/partner/auth/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data);
      }
    } catch {
      // Failed to fetch sessions
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out of the current device?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log Out', style: 'destructive', onPress: logout },
        ]
      );
      return;
    }

    Alert.alert(
      'Remove Device',
      'Are you sure you want to revoke this session? The device will be logged out immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: async () => {
            try {
              const res = await authenticatedFetch(`${API_BASE_URL}/api/partner/auth/sessions/${sessionId}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                Alert.alert('Success', 'Device session revoked.');
                fetchSessions();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to revoke session.');
            }
          }
        },
      ]
    );
  };

  const handleLogoutAll = () => {
    Alert.alert(
      'Log Out From All Devices',
      'This will revoke all active refresh tokens and log you out of all devices. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out All', style: 'destructive', onPress: async () => {
            try {
              const res = await authenticatedFetch(`${API_BASE_URL}/api/partner/auth/logout-all`, {
                method: 'POST',
              });
              if (res.ok) {
                logout(); // Local clean logout
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to log out of all devices.');
            }
          }
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Active Devices</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Review and manage devices currently logged into your partner account
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.sessionId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.sessionCard}>
              <View style={styles.deviceIconBox}>
                <Text style={styles.deviceIcon}>
                  {item.platform === 'IOS' ? '📱' : '📱'}
                </Text>
              </View>
              <View style={styles.sessionInfo}>
                <Text style={[styles.deviceName, { color: colors.textPrimary }]}>
                  {item.deviceName} {item.isCurrent && <Text style={styles.badge}>(Current)</Text>}
                </Text>
                <Text style={[styles.deviceMeta, { color: colors.textSecondary }]}>
                  Platform: {item.platform} • Active: {new Date(item.lastActiveAt).toLocaleTimeString()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRevokeSession(item.sessionId, item.isCurrent)}
                style={styles.revokeBtn}
              >
                <Ionicons name={item.isCurrent ? "log-out-outline" : "close-circle-outline"} size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={
            sessions.length > 1 ? (
              <TouchableOpacity style={[styles.logoutAllBtn, { borderColor: '#E53935' }]} onPress={handleLogoutAll}>
                <Text style={styles.logoutAllText}>Log Out From All Devices</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    padding: 24,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  deviceIconBox: {
    marginRight: 16,
  },
  deviceIcon: {
    fontSize: 32,
  },
  sessionInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  badge: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'normal',
  },
  deviceMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  revokeBtn: {
    padding: 8,
  },
  logoutAllBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  logoutAllText: {
    color: '#E53935',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
