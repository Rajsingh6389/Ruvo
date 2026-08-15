import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

type Delivery = {
  id: number;
  orderId: number;
  status: string;
  pickupLocation: string;
  deliveryLocation: string;
  deliveryFee: number;
};

export const AvailableDeliveriesScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { token, user } = useAuth();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ignoredIds, setIgnoredIds] = useState<number[]>([]);

  const fetchAvailableDeliveries = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/deliveries/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load runs');
      const data: Delivery[] = await res.json();
      setDeliveries(data);
    } catch (err) {
      console.log('Error fetching available runs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchAvailableDeliveries();
      }
    }, [token])
  );

  const acceptRun = async (deliveryId: number) => {
    if (user && !user.isAvailable) {
      Alert.alert('Offline', 'Please set your status to ONLINE on the Dashboard tab to accept deliveries.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/deliveries/${deliveryId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to accept run.');

      Alert.alert('Run Assigned', 'This delivery has been assigned to you. Opening active details...');
      navigation.navigate('ActiveDelivery', { deliveryId });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept delivery.');
      fetchAvailableDeliveries(); // Refresh list to get accurate state
    }
  };

  const ignoreRun = (deliveryId: number) => {
    setIgnoredIds((prev) => [...prev, deliveryId]);
  };

  const filteredDeliveries = deliveries.filter(
    (d) => !ignoredIds.includes(d.id) && d.status === 'CREATED'
  );

  const renderRun = ({ item }: { item: Delivery }) => {
    // Generate a mock distance between 1.5 and 8 km for realistic feel
    const mockDistance = ((item.id * 1.7) % 7 + 1.2).toFixed(1);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.runId, { color: colors.textPrimary }]}>Run #{item.id}</Text>
          <View style={styles.earningBadge}>
            <Text style={styles.earningText}>₹{item.deliveryFee}</Text>
          </View>
        </View>

        <View style={styles.runDetails}>
          <View style={styles.row}>
            <Ionicons name="storefront-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.locationText, { color: colors.textPrimary }]}>
              Pickup: <Text style={{ fontWeight: '500' }}>{item.pickupLocation}</Text>
            </Text>
          </View>

          <View style={[styles.row, { marginTop: 8 }]}>
            <Ionicons name="location-outline" size={17} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={[styles.locationText, { color: colors.textPrimary }]}>
              Drop: <Text style={{ fontWeight: '500' }}>{item.deliveryLocation}</Text>
            </Text>
          </View>

          <View style={[styles.row, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 }]}>
            <Ionicons name="git-commit-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Estimated distance: {mockDistance} km
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.rejectBtn, { borderColor: colors.border }]}
            onPress={() => ignoreRun(item.id)}
          >
            <Text style={[styles.rejectText, { color: colors.textSecondary }]}>Ignore</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.acceptBtn, { backgroundColor: colors.primary }]}
            onPress={() => acceptRun(item.id)}
          >
            <Text style={styles.acceptText}>Accept Run</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Available Deliveries</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Toggle Online on Home to accept requests
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading runs...</Text>
        </View>
      ) : filteredDeliveries.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bicycle-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No deliveries available</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            We'll search for new ready-for-pickup orders automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRun}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAvailableDeliveries();
          }}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
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
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  list: {
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
    marginBottom: 10,
  },
  runId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  earningBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  earningText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  runDetails: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  rejectText: {
    fontWeight: '600',
    fontSize: 14,
  },
  acceptBtn: {
    elevation: 1,
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
