import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

type EarningStats = {
  todayEarnings: number;
  totalEarnings: number;
  walletBalance: number;
};

type Delivery = {
  id: number;
  orderId: number;
  status: string;
  pickupLocation: string;
  deliveryLocation: string;
  deliveryFee: number;
};

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, token, refreshProfile } = useAuth();

  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<EarningStats>({ todayEarnings: 0, totalEarnings: 0, walletBalance: 0 });
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Earning stats
      const statsRes = await fetch(`${API_BASE_URL}/api/partner/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Active Deliveries
      const activeRes = await fetch(`${API_BASE_URL}/api/partner/deliveries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeRes.ok) {
        const activeData: Delivery[] = await activeRes.json();
        if (activeData.length > 0) {
          setActiveDelivery(activeData[0]); // Take first active delivery
        } else {
          setActiveDelivery(null);
        }
      }

      // 3. Fetch Completed deliveries history count
      const historyRes = await fetch(`${API_BASE_URL}/api/partner/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (historyRes.ok) {
        const historyData: Delivery[] = await historyRes.json();
        setCompletedCount(historyData.length);
      }
    } catch (err) {
      console.log('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (token) {
        refreshProfile();
        fetchDashboardData();
      }
    }, [token])
  );

  useEffect(() => {
    if (user) {
      setIsOnline(user.isAvailable);
    }
  }, [user]);

  const toggleSwitch = async (value: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/availability?available=${value}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Could not update status.');

      setIsOnline(value);
      Alert.alert('Status Updated', `You are now ${value ? 'ONLINE' : 'OFFLINE'}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update availability.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.greetingText}>Hello, Partner</Text>
          <Text style={styles.partnerName}>{user?.name || 'Loading...'}</Text>
        </View>

        {/* Availability Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          <Switch
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#D1D5DB"
            onValueChange={toggleSwitch}
            value={isOnline}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Active Delivery Highlight */}
          {activeDelivery ? (
            <TouchableOpacity
              style={styles.activeCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ActiveDelivery', { deliveryId: activeDelivery.id })}
            >
              <View style={styles.activeHeader}>
                <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
                <Text style={styles.activeTitle}>Active Delivery</Text>
              </View>
              <Text style={styles.activeDetails}>
                Pickup: {activeDelivery.pickupLocation.split(',')[0]}
              </Text>
              <Text style={styles.activeDetails}>
                Drop: {activeDelivery.deliveryLocation}
              </Text>
              <View style={styles.activeFooter}>
                <Text style={styles.activeEarning}>Earning: ₹{activeDelivery.deliveryFee}</Text>
                <Text style={styles.activeLink}>Resume Run →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.noActiveCard, { borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
              <Text style={[styles.noActiveText, { color: colors.textPrimary }]}>
                No active delivery at the moment.
              </Text>
              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Deliveries')}
              >
                <Text style={styles.searchBtnText}>Find Runs</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stats Grid */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
          <View style={styles.grid}>
            {/* Today's Earnings */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="today" size={26} color="#3B82F6" />
              <Text style={[styles.cardVal, { color: colors.textPrimary }]}>₹{stats.todayEarnings}</Text>
              <Text style={[styles.cardLbl, { color: colors.textSecondary }]}>Today's Earnings</Text>
            </View>

            {/* Total Earnings */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="wallet" size={26} color={colors.primary} />
              <Text style={[styles.cardVal, { color: colors.textPrimary }]}>₹{stats.totalEarnings}</Text>
              <Text style={[styles.cardLbl, { color: colors.textSecondary }]}>Total Earnings</Text>
            </View>

            {/* Completed Runs */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="checkbox" size={26} color={colors.success} />
              <Text style={[styles.cardVal, { color: colors.textPrimary }]}>{completedCount}</Text>
              <Text style={[styles.cardLbl, { color: colors.textSecondary }]}>Completed Runs</Text>
            </View>

            {/* Wallet Balance */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="cash" size={26} color="#E59866" />
              <Text style={[styles.cardVal, { color: colors.textPrimary }]}>₹{stats.walletBalance}</Text>
              <Text style={[styles.cardLbl, { color: colors.textSecondary }]}>Wallet Balance</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
  },
  greetingText: {
    color: '#E0E7FF',
    fontSize: 14,
    fontWeight: '500',
  },
  partnerName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  toggleContainer: {
    alignItems: 'center',
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  activeCard: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    elevation: 4,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  activeDetails: {
    color: '#F5F3FF',
    fontSize: 14,
    marginBottom: 4,
  },
  activeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#C084FC',
    paddingTop: 10,
  },
  activeEarning: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeLink: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  noActiveCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  noActiveText: {
    fontSize: 15,
    marginTop: 10,
    marginBottom: 16,
  },
  searchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  cardVal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  cardLbl: {
    fontSize: 12,
    marginTop: 2,
  },
});
