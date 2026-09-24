/**
 * EarningsScreen - RuvoPartner (Premium Dark Bento UI)
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { Delivery, Earnings, partnerService } from '../services/partnerService';

export const EarningsScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();

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
    <SafeAreaView className="flex-1 bg-ruvo-ink" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Decorative Glow Elements */}
      <View className="absolute top-0 right-[-100px] w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Header */}
      <View className="bg-ruvo-ink/90 border-b border-gray-800 px-6 py-4 flex-row items-center justify-between z-10">
        <View className="flex-1">
          <Text className="text-xl text-white tracking-tight" style={{ fontFamily: 'Poppins_800ExtraBold' }}>Earnings & Payouts</Text>
          <Text className="text-xs text-gray-400 uppercase tracking-widest mt-1" style={{ fontFamily: 'Poppins_700Bold' }}>
            Track daily income & wallet
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

      {loading ? (
        <View className="flex-1 items-center justify-center bg-ruvo-ink">
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={x => String(x.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#10B981"
              colors={['#10B981']}
              progressBackgroundColor="#1C2026"
            />
          }
          ListHeaderComponent={
            <>
              {/* Hero Earnings Banner */}
              <Animated.View entering={FadeInUp.duration(500)} className="px-6 pt-6">
                <View 
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-[32px] p-8 relative overflow-hidden"
                  style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 }}
                >
                  <View className="absolute w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl top-[-20px] right-[-20px] pointer-events-none" />

                  <Text className="text-[11px] text-emerald-400 uppercase tracking-widest mb-2" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                    TODAY'S TOTAL EARNINGS
                  </Text>
                  <Text className="text-5xl text-white tracking-tighter mb-8 shadow-sm" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                    ₹{earnings?.todayEarnings ?? 0}
                  </Text>

                  {/* Meta Row */}
                  <View className="flex-row items-center justify-between pt-5 border-t border-emerald-500/20">
                    <View>
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <Ionicons name="wallet" size={14} color="#10B981" />
                        <Text className="text-[10px] text-gray-300 uppercase tracking-widest" style={{ fontFamily: 'Poppins_700Bold' }}>Wallet</Text>
                      </View>
                      <Text className="text-lg text-white" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                        ₹{earnings?.walletBalance ?? 0}
                      </Text>
                    </View>
                    <View className="w-px h-8 bg-emerald-500/20" />
                    <View>
                      <View className="flex-row items-center gap-1.5 mb-1 justify-end">
                        <Text className="text-[10px] text-gray-300 uppercase tracking-widest" style={{ fontFamily: 'Poppins_700Bold' }}>All Time</Text>
                        <Ionicons name="trending-up" size={14} color="#10B981" />
                      </View>
                      <Text className="text-lg text-white text-right" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                        ₹{earnings?.totalEarnings ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* Shop Settlements Shortcut */}
              <Animated.View entering={FadeInUp.delay(50).duration(500)} className="px-6 mt-4">
                <TouchableOpacity
                  onPress={() => navigation.navigate('ShopSettlements')}
                  className="bg-[#10B981] rounded-[20px] p-4 flex-row items-center justify-between shadow-lg shadow-[#10B981]/40"
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-12 h-12 bg-white/20 rounded-[16px] items-center justify-center">
                      <Ionicons name="storefront" size={22} color="#FFF" />
                    </View>
                    <View>
                      <Text className="text-white text-base tracking-tight mb-0.5" style={{ fontFamily: 'Poppins_800ExtraBold' }}>Shop Settlements</Text>
                      <Text className="text-[#ECFDF5] text-[10px] uppercase tracking-widest" style={{ fontFamily: 'Poppins_700Bold' }}>Pay collected COD cash</Text>
                    </View>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                    <Ionicons name="chevron-forward" size={16} color="#FFF" />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Section Header */}
              <Animated.View entering={FadeInUp.delay(100).duration(500)} className="px-6 mt-8 mb-4 flex-row items-center justify-between">
                <Text className="text-[11px] text-gray-500 uppercase tracking-widest pl-1" style={{ fontFamily: 'Poppins_800ExtraBold' }}>Delivery History</Text>
                <View className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                  <Text className="text-white text-[10px] tracking-widest uppercase" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                    {history.length} runs
                  </Text>
                </View>
              </Animated.View>
            </>
          }
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-10">
              <View className="w-24 h-24 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-3xl items-center justify-center mb-6">
                <Ionicons name="receipt" size={44} color="#FF7A00" />
              </View>
              <Text className="text-lg text-white mb-2 text-center" style={{ fontFamily: 'Poppins_800ExtraBold' }}>No completed runs yet</Text>
              <Text className="text-xs text-gray-400 text-center leading-5 px-6" style={{ fontFamily: 'Poppins_700Bold' }}>
                Completed delivery earnings will appear here once you start accepting runs.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View className="h-4" />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(400)} className="px-6">
              <View className="bg-[#1C2026] border border-gray-800 rounded-[24px] p-5 shadow-lg shadow-black/40">
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl items-center justify-center">
                    <Ionicons name="checkmark-done" size={20} color="#10B981" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-base text-white tracking-tight mb-0.5" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                      Order #{item.orderId}
                    </Text>
                    <Text className="text-[11px] text-gray-400 uppercase tracking-widest" style={{ fontFamily: 'Poppins_700Bold' }}>
                      Run #{item.id}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-xl text-emerald-400" style={{ fontFamily: 'Poppins_800ExtraBold' }}>
                      +₹{item.deliveryFee}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
};
