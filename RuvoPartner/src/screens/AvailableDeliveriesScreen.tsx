/**
 * AvailableDeliveriesScreen - RuvoPartner (Redesigned with Premium UI/UX)
 * 
 * Features:
 * - Real-time list of available delivery runs
 * - Location-based matching with visual route display
 * - Accept delivery flow with loading states
 * - Empty state with helpful messaging
 * - Pull-to-refresh
 * - Error handling with retry
 * - Smooth animations
 * - Responsive layout
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Delivery } from '../services/partnerService';
import { OfflineBar } from '../components/OfflineBar';
import { NotificationPopup } from '../components/NotificationPopup';
import { useNewDeliverySound } from '../hooks/useNotificationSound';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

export const AvailableDeliveriesScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [runs, setRuns] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { showPopup, popupMessage, dismissPopup } = useNewDeliverySound(runs.length);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      setError(null);
      setRuns(await api<Delivery[]>('/api/partner/deliveries/available', token));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const accept = async (run: Delivery) => {
    if (!token) return;
    setBusy(run.id);
    try {
      await api(`/api/partner/deliveries/${run.id}/accept`, token, { method: 'POST' });
      navigation.navigate('ActiveDelivery', { deliveryId: run.id });
    } catch (e: any) {
      Alert.alert('Run Unavailable', e.message);
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      <OfflineBar />

      <NotificationPopup
        visible={showPopup}
        message={popupMessage}
        subtitle="Tap to view available deliveries"
        onDismiss={dismissPopup}
      />

      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ruvo-ink">Available Deliveries</Text>
          <Text className="text-xs text-warm-600 font-medium mt-xs">
            Real-time runs matching your location
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => load(true)}
          className="w-10 h-10 bg-green-100 rounded-full items-center justify-center"
        >
          <Ionicons name="refresh" size={20} color="#16A34A" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View className="px-lg pt-lg">
          <Skeleton height={180} className="mb-md" />
          <Skeleton height={180} className="mb-md" />
          <Skeleton height={180} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-xl">
          <Animated.View entering={FadeIn.duration(300)} className="items-center">
            <View className="w-24 h-24 bg-red-100 rounded-3xl items-center justify-center mb-lg">
              <Ionicons name="cloud-offline-outline" size={44} color="#DC2626" />
            </View>
            <Text className="text-xl font-extrabold text-ruvo-ink mb-sm">Connection Error</Text>
            <Text className="text-sm text-warm-600 text-center mb-xl leading-5">{error}</Text>
            <Button variant="primary" onPress={() => load()} icon="refresh">
              Retry
            </Button>
          </Animated.View>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={x => String(x.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#16A34A"
              colors={['#16A34A']}
            />
          }
          contentContainerClassName={`px-lg pt-lg pb-2xl ${runs.length === 0 ? 'flex-grow' : ''}`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="bicycle"
              title="No Active Deliveries"
              description="Stay online and keep this tab active to receive automated delivery orders."
            />
          }
          ItemSeparatorComponent={() => <View className="h-md" />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
              <Card>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-md">
                  <View className="flex-row items-center gap-sm">
                    <Text className="text-lg font-extrabold text-ruvo-ink">
                      Order #{item.orderId}
                    </Text>
                    <Badge variant="info" size="sm">
                      {item.status.replaceAll('_', ' ')}
                    </Badge>
                  </View>
                  <Text className="text-xl font-extrabold text-ruvo-accent">
                    +₹{item.deliveryFee}
                  </Text>
                </View>

                {/* Route Section */}
                <View className="bg-warm-100 rounded-lg p-md mb-md">
                  {/* Pickup */}
                  <View className="flex-row items-center gap-md mb-xs">
                    <View className="w-2 h-2 bg-ruvo-accent rounded-full" />
                    <Text className="text-xs font-extrabold text-warm-700 uppercase w-12">
                      Pickup
                    </Text>
                    <Text className="flex-1 text-sm font-semibold text-ruvo-ink" numberOfLines={1}>
                      {item.pickupLocation}
                    </Text>
                  </View>

                  {/* Connector */}
                  <View className="w-px h-3 bg-warm-300 ml-1" />

                  {/* Drop */}
                  <View className="flex-row items-center gap-md">
                    <View className="w-2 h-2 bg-orange-500 rounded-full" />
                    <Text className="text-xs font-extrabold text-warm-700 uppercase w-12">
                      Drop
                    </Text>
                    <Text className="flex-1 text-sm font-semibold text-ruvo-ink" numberOfLines={1}>
                      {item.deliveryLocation}
                    </Text>
                  </View>
                </View>

                {/* Accept Button */}
                <Button
                  variant="primary"
                  onPress={() => accept(item)}
                  loading={busy === item.id}
                  disabled={busy === item.id}
                  icon="checkmark-circle-outline"
                >
                  Accept Delivery Run
                </Button>
              </Card>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
};
