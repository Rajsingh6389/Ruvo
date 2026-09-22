/**
 * AvailableDeliveriesScreen - RuvoPartner (Premium Dark Bento UI)
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Delivery } from '../services/partnerService';
import { OfflineBar } from '../components/OfflineBar';
import { NotificationPopup } from '../components/NotificationPopup';
import { useNewDeliverySound } from '../hooks/useNotificationSound';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { getTabBarTotalHeight } from '../constants/layout';

export const AvailableDeliveriesScreen = () => {
  const insets = useSafeAreaInsets();
  const totalTabBarHeight = getTabBarTotalHeight(insets.bottom);
  const { token } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation<any>();

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
      const [availableRuns, activeRuns] = await Promise.all([
        api<Delivery[]>('/api/partner/deliveries/available', token).catch(() => []),
        api<Delivery[]>('/api/partner/deliveries', token).catch(() => []),
      ]);
      const act = Array.isArray(activeRuns) ? activeRuns : [];
      const av = Array.isArray(availableRuns) ? availableRuns : [];
      const seen = new Set<number>();
      const combined: Delivery[] = [];
      for (const d of [...act, ...av]) {
        if (d && d.id && !seen.has(d.id)) {
          seen.add(d.id);
          combined.push(d);
        }
      }
      setRuns(combined);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAction = async (run: Delivery) => {
    if (!token) return;
    const isAssigned = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(run.status);
    if (isAssigned) {
      navigation.navigate('ActiveDelivery', { deliveryId: run.id });
      return;
    }

    setBusy(run.id);
    try {
      await api(`/api/partner/deliveries/${run.id}/accept`, token, { method: 'POST' });
      showToast('Delivery run accepted!', 'success');
      
      const activeDeliveries = await api<Delivery[]>('/api/partner/deliveries', token);
      const activeOnly = activeDeliveries.filter(d => ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(d.status));
      if (activeOnly.length > 0) {
        navigation.navigate('ActiveDelivery', { deliveryId: activeOnly[0].id });
      } else {
        navigation.navigate('Dashboard');
      }
    } catch (e: any) {
      showToast(e.message || 'Run unavailable', 'error');
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ruvo-ink" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <OfflineBar />

      <NotificationPopup
        visible={showPopup}
        message={popupMessage}
        subtitle="Tap to view available deliveries"
        onDismiss={dismissPopup}
      />

      {/* Decorative Glow Elements */}
      <View className="absolute top-0 right-[-100px] w-64 h-64 bg-[#FF7A00]/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Header */}
      <View className="bg-ruvo-ink/90 border-b border-gray-800 px-6 py-4 flex-row items-center justify-between z-10">
        <View className="flex-1">
          <Text className="text-xl font-black text-white tracking-tight">Available Deliveries</Text>
          <Text className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            Real-time matching runs
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => load(true)}
          className="w-10 h-10 bg-white/5 border border-white/10 rounded-full items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View className="px-6 pt-6 gap-5">
          <Skeleton height={200} className="rounded-[28px] bg-gray-800" />
          <Skeleton height={200} className="rounded-[28px] bg-gray-800" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.duration(300)} className="items-center">
            <View className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-3xl items-center justify-center mb-6">
              <Ionicons name="cloud-offline-outline" size={44} color="#EF4444" />
            </View>
            <Text className="text-xl font-black text-white mb-2">Connection Error</Text>
            <Text className="text-sm text-gray-400 text-center mb-8 leading-5 font-bold">{error}</Text>
            <TouchableOpacity 
              onPress={() => load()}
              className="bg-[#FF7A00] h-12 px-6 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text className="text-white font-black tracking-widest uppercase">Retry</Text>
            </TouchableOpacity>
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
              tintColor="#FF7A00"
              colors={['#FF7A00']}
              progressBackgroundColor="#1C2026"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: totalTabBarHeight + 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-10">
              <View className="w-24 h-24 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-3xl items-center justify-center mb-6">
                <Ionicons name="bicycle" size={44} color="#FF7A00" />
              </View>
              <Text className="text-lg font-black text-white mb-2 text-center">No Active Deliveries</Text>
              <Text className="text-xs text-gray-400 font-bold text-center leading-5 px-6">
                Stay online and keep this tab active to receive automated delivery orders.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View className="h-5" />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
              <View className="bg-[#1C2026] border border-gray-800 rounded-[28px] p-6 shadow-lg shadow-black/40">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-5">
                  <View className="flex-row items-center gap-3">
                    <Text className="text-lg font-black text-white">
                      Order #{item.orderId}
                    </Text>
                    <View className="bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-full">
                      <Text className="text-blue-400 font-black text-[9px] tracking-wider uppercase">
                        {item.status.replaceAll('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xl font-black text-emerald-400">
                    +₹{item.deliveryFee}
                  </Text>
                </View>

                {/* Items Summary */}
                {item.items && item.items.length > 0 ? (
                  <View className="bg-[#171A1F] border border-gray-800 rounded-xl p-3 mb-4 flex-row items-center gap-2">
                    <Ionicons name="basket" size={16} color="#FF7A00" />
                    <Text className="text-[11px] font-bold text-white flex-1 tracking-wide" numberOfLines={1}>
                      {item.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                    </Text>
                  </View>
                ) : item.productName ? (
                  <View className="bg-[#171A1F] border border-gray-800 rounded-xl p-3 mb-4 flex-row items-center gap-2">
                    <Ionicons name="basket" size={16} color="#FF7A00" />
                    <Text className="text-[11px] font-bold text-white flex-1 tracking-wide" numberOfLines={1}>
                      {item.quantity ? `${item.quantity}x ` : ''}{item.productName}
                    </Text>
                  </View>
                ) : null}

                {/* Route Section */}
                <View className="bg-[#171A1F] border border-gray-800 rounded-xl p-4 mb-5">
                  {/* Pickup */}
                  <View className="flex-row items-center gap-4 mb-2">
                    <View className="w-3 h-3 bg-blue-500 shadow-[0_0_8px_#3B82F6] rounded-full" />
                    <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-12">
                      Pickup
                    </Text>
                    <View className="flex-1">
                      {item.shopName ? (
                        <Text className="text-xs font-black text-white mb-0.5">{item.shopName}</Text>
                      ) : null}
                      <Text className="text-[13px] font-bold text-gray-400" numberOfLines={1}>
                        {item.shopAddress || item.pickupLocation}
                      </Text>
                    </View>
                  </View>

                  {/* Connector */}
                  <View className="w-px h-6 bg-gray-700 ml-1.5 my-1" />

                  {/* Drop */}
                  <View className="flex-row items-center gap-4 mt-1">
                    <View className="w-3 h-3 bg-[#FF7A00] shadow-[0_0_8px_#FF7A00] rounded-full" />
                    <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-12">
                      Drop
                    </Text>
                    <Text className="flex-1 text-[13px] font-bold text-white" numberOfLines={1}>
                      {item.deliveryLocation}
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  onPress={() => handleAction(item)}
                  disabled={busy === item.id}
                  activeOpacity={0.8}
                  className={`h-14 rounded-2xl flex-row items-center justify-center gap-2 ${busy === item.id ? 'bg-[#FF7A00]/70' : 'bg-[#FF7A00]'}`}
                  style={{ shadowColor: '#FF7A00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 }}
                >
                  {busy === item.id ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons
                        name={['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(item.status) ? 'arrow-forward-circle' : 'checkmark-circle'}
                        size={18}
                        color="#FFF"
                      />
                      <Text className="text-white font-black tracking-widest uppercase">
                        {['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(item.status)
                          ? 'Open Active Delivery'
                          : 'Accept Delivery Run'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
};
