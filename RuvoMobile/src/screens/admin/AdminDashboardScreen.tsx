import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../types/navigation';
import { getPendingShops, approveShop, rejectShop, Shop } from '../../services/shopService';

export const AdminDashboardScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token } = useAuth();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingShops = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await getPendingShops(token);
      setShops(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending shops.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPendingShops();
  }, [fetchPendingShops]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingShops();
  };

  const handleApprove = async (shop: Shop) => {
    Alert.alert('Approve Shop', `Are you sure you want to approve ${shop.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        style: 'default',
        onPress: async () => {
          if (!token) return;
          try {
            await approveShop(shop.id, token);
            Alert.alert('Success', `${shop.name} has been approved.`);
            setShops(prev => prev.filter(s => s.id !== shop.id));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to approve shop.');
          }
        },
      },
    ]);
  };

  const handleReject = async (shop: Shop) => {
    Alert.alert('Reject Shop', `Are you sure you want to reject and delete ${shop.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          try {
            await rejectShop(shop.id, token);
            Alert.alert('Rejected', `${shop.name} has been removed.`);
            setShops(prev => prev.filter(s => s.id !== shop.id));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to reject shop.');
          }
        },
      },
    ]);
  };

  const renderShop = ({ item }: { item: Shop }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.shopName, { color: colors.textPrimary }]}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{item.category || 'General'}</Text>
          </View>
        </View>
        {item.logoUrl ? (
          <Image
            source={{ uri: item.logoUrl.startsWith('http') ? item.logoUrl : `http://192.168.1.9:8080/${item.logoUrl.replace(/\\/g, '/')}` }}
            style={styles.logo}
          />
        ) : (
          <View style={[styles.logoPlaceholder, { backgroundColor: colors.border }]}>
            <Ionicons name="storefront" size={24} color={colors.textSecondary} />
          </View>
        )}
      </View>

      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
        <Ionicons name="location-outline" size={14} /> {item.address}
      </Text>
      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
        <Ionicons name="call-outline" size={14} /> {item.phone}
      </Text>
      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
        <Ionicons name="person-outline" size={14} /> Owner ID: {item.ownerId}
      </Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => handleReject(item)}
        >
          <Ionicons name="close-circle-outline" size={18} color="#E53935" />
          <Text style={[styles.actionBtnText, { color: '#E53935' }]}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={() => handleApprove(item)}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
          <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Admin Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>Pending Approvals</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>Loading requests...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={52} color="#E53935" />
          <Text style={[styles.centerText, { color: colors.textPrimary, marginVertical: 12 }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={fetchPendingShops}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={item => item.id.toString()}
          renderItem={renderShop}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>All caught up!</Text>
              <Text style={[styles.centerText, { color: colors.textSecondary }]}>There are no pending shop registrations.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabActive: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabActiveText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 14,
  },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleContainer: { flex: 1, paddingRight: 8 },
  shopName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  logo: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#E0E0E0' },
  logoPlaceholder: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  infoText: { fontSize: 13, marginBottom: 4 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  rejectBtn: {
    backgroundColor: '#FFEBEE',
  },
  approveBtn: {
    backgroundColor: '#2E7D32',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 250 },
  centerText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  emptyText: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
});
