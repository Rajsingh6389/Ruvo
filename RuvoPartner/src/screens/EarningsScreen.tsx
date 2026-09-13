/**
 * EarningsScreen - RuvoPartner (Redesigned with Premium UI/UX)
 * 
 * Features:
 * - Hero banner with today's earnings
 * - Wallet balance and all-time total
 * - Delivery history list with earnings
 * - Pull-to-refresh
 * - Empty state for no completed runs
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
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { Delivery, Earnings, partnerService } from '../services/partnerService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const EarningsScreen = () => {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [e, h] = await Promise.all([
        partnerService.earnings(token),
        partnerService.history(token),
      ]);
      setEarnings(e);
      setHistory(h.sort((a, b) => b.id - a.id));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-ruvo-border px-lg py-md flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ruvo-ink">Earnings & Payouts</Text>
          <Text className="text-xs text-warm-600 font-medium mt-xs">
            Track daily income, wallet, and delivery payouts
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => load(true)}
          className="w-10 h-10 bg-ruvo-bg border border-ruvo-border rounded-full items-center justify-center"
        >
          <Ionicons name="refresh" size={18} color="#171A1F" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F4B400" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={x => String(x.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#F4B400"
              colors={['#F4B400']}
            />
          }
          ListHeaderComponent={
            <>
              {/* Hero Earnings Banner */}
              <Animated.View entering={FadeInUp.duration(500)} className="mx-lg mt-lg">
                  <View
                    className="bg-emerald-700 rounded-2xl p-xl relative overflow-hidden border border-emerald-600/50"
                    style={{
                      shadowColor: '#18A957',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 12,
                      elevation: 5,
                    }}
                  >
                    {/* Decorative background circle */}
                    <View
                      className="absolute w-40 h-40 bg-emerald-600/40 rounded-full"
                      style={{ top: -50, right: -40 }}
                    />
  
                    <Text className="text-xs font-extrabold text-emerald-200 uppercase tracking-wider mb-xs">
                      TODAY'S TOTAL EARNINGS
                    </Text>
                    <Text className="text-4xl font-extrabold text-white mb-md">
                      ₹{earnings?.todayEarnings ?? 0}
                    </Text>
  
                    {/* Meta Row */}
                    <View className="flex-row items-center gap-md pt-sm border-t border-emerald-600/50">
                      <View className="flex-row items-center gap-xs">
                        <Ionicons name="wallet-outline" size={15} color="#A7F3D0" />
                        <Text className="text-xs text-emerald-100 font-medium">Wallet</Text>
                        <Text className="text-sm text-white font-extrabold ml-xs">
                          ₹{earnings?.walletBalance ?? 0}
                        </Text>
                      </View>
                      <View className="w-px h-3.5 bg-emerald-600/50" />
                      <View className="flex-row items-center gap-xs">
                        <Ionicons name="trending-up-outline" size={15} color="#A7F3D0" />
                        <Text className="text-xs text-emerald-100 font-medium">All Time</Text>
                        <Text className="text-sm text-white font-extrabold ml-xs">
                          ₹{earnings?.totalEarnings ?? 0}
                        </Text>
                      </View>
                    </View>
                  </View>
              </Animated.View>

              {/* Section Header */}
              <Animated.View entering={FadeInUp.delay(100).duration(500)} className="px-lg mt-xl mb-md flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-ruvo-ink">Delivery History</Text>
                <Badge variant="info" size="sm">
                  {`${history.length} runs`}
                </Badge>
              </Animated.View>
            </>
          }
          contentContainerClassName={`px-lg pb-2xl ${history.length === 0 ? 'flex-grow' : ''}`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No completed runs yet"
              description="Completed delivery earnings will appear here once you start accepting runs."
            />
          }
          ItemSeparatorComponent={() => <View className="h-sm" />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
              <View className="bg-white rounded-2xl p-4 shadow-sm" style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                <View className="flex-row items-center gap-md">
                  <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center">
                    <Ionicons name="checkmark-done" size={20} color="#18A957" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-extrabold text-ruvo-ink">
                      Order #{item.orderId}
                    </Text>
                    <Text className="text-xs text-warm-600 font-medium mt-xs">
                      Completed · Run #{item.id}
                    </Text>
                  </View>

                  <Text className="text-lg font-extrabold text-emerald-700">
                    +₹{item.deliveryFee}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
};
