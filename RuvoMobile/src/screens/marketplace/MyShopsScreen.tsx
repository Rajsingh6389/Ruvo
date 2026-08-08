import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyShops, Shop } from '../../services/shopService';
import { ROUTES } from '../../constants/routes';

export const MyShopsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { userId, token } = useAuth();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId && token) {
      getMyShops(userId, token)
        .then(setShops)
        .catch(err => setError(err.message || 'Failed to load your shops'))
        .finally(() => setLoading(false));
    } else {
      setError('User not authenticated properly (id or token missing)');
      setLoading(false);
    }
  }, [userId, token]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderShop = ({ item }: { item: Shop }) => (
    <TouchableOpacity 
      style={[styles.shopCard, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate(ROUTES.SHOP_DETAILS, { shopId: item.id })}
    >
      <View style={styles.shopInfo}>
        <Text style={[styles.shopName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.shopStatus, { color: item.approved ? '#4CAF50' : '#FF9800' }]}>
          {item.approved ? 'Approved' : 'Pending Approval'}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT, { shopId: item.id })}
      >
        <Text style={styles.addButtonText}>Add Product</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>My Shops</Text>
      {error && <Text style={{ color: '#FF3B30', marginBottom: 10 }}>{error}</Text>}
      <FlatList
        data={shops}
        keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderShop}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.textPrimary, marginBottom: 20 }}>You haven't registered any shops yet.</Text>
            <TouchableOpacity 
              style={[styles.registerButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate(ROUTES.REGISTER_SHOP)}
            >
              <Text style={styles.registerButtonText}>Register a Shop</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  list: { paddingBottom: 20 },
  shopCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 18, fontWeight: 'bold' },
  shopStatus: { fontSize: 14, marginTop: 4 },
  addButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, marginLeft: 8 },
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  registerButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  registerButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
