import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

type Delivery = {
  id: number;
  orderId: number;
  status: string; // "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"
  pickupLocation: string;
  deliveryLocation: string;
  deliveryFee: number;
};

export const ActiveDeliveryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { token } = useAuth();

  const deliveryId = route.params?.deliveryId;

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchDeliveryDetails = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/deliveries/${deliveryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load run details.');
      const data: Delivery = await res.json();
      setDelivery(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not fetch details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deliveryId && token) {
      fetchDeliveryDetails();
    }
  }, [deliveryId, token]);

  const updateDeliveryStatus = async (endpoint: string, successMessage: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/deliveries/${deliveryId}/${endpoint}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed.');

      Alert.alert('Status Update', successMessage);
      fetchDeliveryDetails(); // Refresh details
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update run status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Google Maps or Apple Maps could not be opened.');
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!delivery) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Active Order Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Indicator */}
        <View style={styles.trackerBox}>
          <View style={styles.stepRow}>
            <View style={[styles.bullet, { backgroundColor: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(delivery.status) ? colors.primary : '#E5E7EB' }]} />
            <Text style={[styles.stepText, { color: colors.textPrimary, fontWeight: delivery.status === 'ASSIGNED' ? 'bold' : 'normal' }]}>Accepted Run (Assigned)</Text>
          </View>
          <View style={[styles.line, { backgroundColor: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(delivery.status) ? colors.primary : '#E5E7EB' }]} />

          <View style={styles.stepRow}>
            <View style={[styles.bullet, { backgroundColor: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(delivery.status) ? colors.primary : '#E5E7EB' }]} />
            <Text style={[styles.stepText, { color: colors.textPrimary, fontWeight: delivery.status === 'PICKED_UP' ? 'bold' : 'normal' }]}>Order Picked Up</Text>
          </View>
          <View style={[styles.line, { backgroundColor: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(delivery.status) ? colors.primary : '#E5E7EB' }]} />

          <View style={styles.stepRow}>
            <View style={[styles.bullet, { backgroundColor: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(delivery.status) ? colors.primary : '#E5E7EB' }]} />
            <Text style={[styles.stepText, { color: colors.textPrimary, fontWeight: delivery.status === 'OUT_FOR_DELIVERY' ? 'bold' : 'normal' }]}>Out for Delivery</Text>
          </View>
          <View style={[styles.line, { backgroundColor: delivery.status === 'DELIVERED' ? colors.primary : '#E5E7EB' }]} />

          <View style={styles.stepRow}>
            <View style={[styles.bullet, { backgroundColor: delivery.status === 'DELIVERED' ? colors.success : '#E5E7EB' }]} />
            <Text style={[styles.stepText, { color: colors.textPrimary, fontWeight: delivery.status === 'DELIVERED' ? 'bold' : 'normal' }]}>Delivered Successfully</Text>
          </View>
        </View>

        {/* Pickup location */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>PICKUP ADDRESS</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]}>{delivery.pickupLocation}</Text>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: colors.primary }]}
            onPress={() => handleNavigate(delivery.pickupLocation)}
          >
            <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            <Text style={[styles.navText, { color: colors.primary }]}>Navigate to Shop</Text>
          </TouchableOpacity>
        </View>

        {/* Drop location */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>DELIVERY ADDRESS</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]}>{delivery.deliveryLocation}</Text>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: colors.primary }]}
            onPress={() => handleNavigate(delivery.deliveryLocation)}
          >
            <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            <Text style={[styles.navText, { color: colors.primary }]}>Navigate to Customer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer action button */}
      <View style={styles.footer}>
        {updating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : delivery.status === 'ASSIGNED' ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => updateDeliveryStatus('pickup', 'Order successfully marked as Picked Up.')}
          >
            <Text style={styles.actionBtnText}>Mark as Picked Up</Text>
          </TouchableOpacity>
        ) : delivery.status === 'PICKED_UP' ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => updateDeliveryStatus('out-for-delivery', 'Order is now Out for Delivery.')}
          >
            <Text style={styles.actionBtnText}>Start Delivery (Out for Delivery)</Text>
          </TouchableOpacity>
        ) : delivery.status === 'OUT_FOR_DELIVERY' ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            onPress={() => updateDeliveryStatus('delivered', 'Delivery completed! Earnings added to wallet.')}
          >
            <Text style={styles.actionBtnText}>Mark as Delivered</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.actionBtnText}>Return to Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  trackerBox: {
    paddingLeft: 10,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
  },
  line: {
    width: 2,
    height: 24,
    marginLeft: 6,
    marginVertical: 4,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    gap: 6,
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
