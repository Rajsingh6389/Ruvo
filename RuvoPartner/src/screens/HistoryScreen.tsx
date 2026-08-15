import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  deliveredAt?: string;
};

export const HistoryScreen = () => {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [history, setHistory] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load history.');
      const data: Delivery[] = await res.json();
      
      // Sort history descending by delivered time or id
      const sorted = data.sort((a, b) => b.id - a.id);
      setHistory(sorted);
    } catch (err) {
      console.log('Error loading history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchHistory();
      }
    }, [token])
  );

  const renderHistoryItem = ({ item }: { item: Delivery }) => {
    const formattedDate = item.deliveredAt
      ? new Date(item.deliveredAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Delivered';

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerInfo}>
            <Text style={[styles.runId, { color: colors.textPrimary }]}>Run #{item.id}</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>
          </View>
          <Text style={[styles.feeText, { color: colors.success }]}>+₹{item.deliveryFee}</Text>
        </View>

        <View style={styles.details}>
          <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
            <Ionicons name="storefront" size={13} color={colors.textSecondary} /> {item.pickupLocation.split(',')[0]}
          </Text>
          <Text style={[styles.location, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
            <Ionicons name="location" size={13} color="#EF4444" /> {item.deliveryLocation}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Delivery History</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Completed runs and earnings logs
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No runs completed yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Completed delivery runs will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHistoryItem}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchHistory();
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerInfo: {
    flexDirection: 'column',
  },
  runId: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  feeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  details: {
    flexDirection: 'column',
  },
  location: {
    fontSize: 12,
  },
});
