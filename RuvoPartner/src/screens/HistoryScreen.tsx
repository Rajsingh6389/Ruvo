/**
 * HistoryScreen - RuvoPartner (Premium Dark Bento UI)
 * 
 * Features:
 * - Delivery history list grouped by date
 * - Today's earnings summary in header
 * - COD handover OTP generation
 * - Route display (pickup → delivery)
 * - Pull-to-refresh
 * - Empty state
 * - Smooth animations
 * - Responsive layout
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

type HistoryItem = {
  id: number;
  orderId: number;
  status: string;
  pickupLocation: string;
  deliveryLocation: string;
  deliveryFee: number;
  deliveredAt?: string;
  paymentMethod?: string;
  totalAmount?: number;
  codCollected?: number;
  shopId?: number;
  shopName?: string;
  items?: { productName: string; quantity: number }[];
};

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export const HistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const bottomClearance = Math.max(insets.bottom, 16) + 28;
  const { token } = useAuth();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load history.');
      const data: HistoryItem[] = await res.json();
      setHistory(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (token) fetchHistory();
    }, [token])
  );

  const generateHandoverOtp = async (orderId: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/partner/settlements/${orderId}/generate-handover-otp`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate OTP');
      Alert.alert(
        '💰 Cash Handover OTP',
        `Your OTP is: ${data.handoverOtp}\n\nShow this to the shopkeeper to confirm COD cash handover.`,
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const sections = useMemo(() => {
    const today = history.filter(h => isToday(h.deliveredAt));
    const prev = history.filter(h => !isToday(h.deliveredAt));
    const result: { title: string; data: HistoryItem[] }[] = [];
    if (today.length > 0) result.push({ title: "Today's Deliveries", data: today });
    if (prev.length > 0) result.push({ title: 'Previous Deliveries', data: prev });
    return result;
  }, [history]);

  const totalToday = history
    .filter(h => isToday(h.deliveredAt))
    .reduce((s, d) => s + (d.deliveryFee ?? 0), 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-ink items-center justify-center">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ruvo-ink" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Decorative Glow Elements */}
      <View className="absolute top-0 right-[-100px] w-64 h-64 bg-[#10B981]/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Header */}
      <View className="bg-ruvo-ink/90 border-b border-gray-800 px-6 py-4 flex-row items-center justify-between z-10">
        <View className="flex-1">
          <Text className="text-xl font-black text-white tracking-tight">Delivery History</Text>
          <Text className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            Completed · Today: <Text className="text-emerald-400 font-black">+₹{totalToday.toFixed(0)}</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { setRefreshing(true); fetchHistory(); }}
          className="w-10 h-10 bg-white/5 border border-white/10 rounded-full items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View className="flex-1 items-center justify-center mt-10">
          <View className="w-24 h-24 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-3xl items-center justify-center mb-6">
            <Ionicons name="receipt" size={44} color="#FF7A00" />
          </View>
          <Text className="text-lg font-black text-white mb-2 text-center">No completed runs yet</Text>
          <Text className="text-xs text-gray-400 font-bold text-center leading-5 px-6">
            Completed delivery runs will show up here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => {
            const isCod = item.paymentMethod === 'COD';
            const date = item.deliveredAt
              ? new Date(item.deliveredAt).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })
              : '—';

            return (
              <Animated.View entering={FadeInDown.delay(index * 50).duration(400)} className="px-6 mb-4">
                <View className="bg-[#1C2026] border border-gray-800 rounded-[28px] p-5 shadow-lg shadow-black/40">
                  {/* Header Row */}
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-lg font-black text-white" numberOfLines={1}>
                          Order #{item.orderId}
                        </Text>
                        <View className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <Text className="text-emerald-400 font-black text-[9px] uppercase tracking-wider">DONE</Text>
                        </View>
                      </View>
                      
                      {item.items && item.items.length > 0 ? (
                        <Text className="text-xs text-gray-400 font-bold leading-tight" numberOfLines={2}>
                          {item.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                        </Text>
                      ) : null}
                      <Text className="text-[10px] text-gray-500 font-black mt-2 uppercase tracking-widest">{date}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xl font-black text-emerald-400">
                        +₹{item.deliveryFee}
                      </Text>
                      <Text className="text-[9px] text-emerald-500/80 font-black uppercase tracking-widest">Earned</Text>
                    </View>
                  </View>

                  {/* Route Display */}
                  <View className="bg-[#171A1F] border border-gray-800 rounded-[16px] p-3 mb-4">
                    <View className="flex-row items-center gap-3 mb-2">
                      <Ionicons name="storefront" size={14} color="#FF7A00" />
                      <Text className="flex-1 text-[11px] text-gray-300 font-bold" numberOfLines={1}>
                        {item.shopName ?? item.pickupLocation?.split(',')[0]}
                      </Text>
                    </View>
                    <View className="w-px h-2 bg-gray-700 ml-1.5" />
                    <View className="flex-row items-center gap-3 mt-1">
                      <Ionicons name="location" size={14} color="#3B82F6" />
                      <Text className="flex-1 text-[11px] text-gray-300 font-bold" numberOfLines={1}>
                        {item.deliveryLocation}
                      </Text>
                    </View>
                  </View>

                  {/* COD Section */}
                  {isCod && (
                    <View className="flex-row items-center justify-between pt-4 border-t border-gray-800">
                      <View className="bg-[#FF7A00]/10 border border-[#FF7A00]/20 px-3 py-2.5 rounded-[12px] flex-row items-center gap-1.5">
                        <Ionicons name="cash" size={16} color="#FF7A00" />
                        <Text className="text-[11px] font-black text-[#FF7A00] tracking-widest uppercase">
                          COD: ₹{item.codCollected ?? item.totalAmount ?? 0}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => generateHandoverOtp(item.orderId)}
                        className="bg-[#171A1F] border border-gray-700 px-3 py-2.5 rounded-[12px] flex-row items-center gap-1.5"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="key" size={16} color="#FFF" />
                        <Text className="text-[11px] font-black text-white tracking-widest uppercase">Handover OTP</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          }}
          renderSectionHeader={({ section }) => (
            <View className="px-6 py-3 mt-4 mb-2">
              <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                {section.title}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHistory(); }}
              tintColor="#10B981"
              colors={['#10B981']}
              progressBackgroundColor="#1C2026"
            />
          }
          contentContainerStyle={{ paddingBottom: bottomClearance }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
};
