/**
 * HistoryScreen - RuvoPartner (Redesigned with Premium UI/UX)
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

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
      <SafeAreaView className="flex-1 bg-ruvo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#16A34A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ruvo-ink">Delivery History</Text>
          <Text className="text-xs text-warm-600 font-medium mt-xs">
            Completed runs · Today: <Text className="text-ruvo-accent font-extrabold">+₹{totalToday.toFixed(0)}</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { setRefreshing(true); fetchHistory(); }}
          className="w-10 h-10 bg-green-100 rounded-full items-center justify-center"
        >
          <Ionicons name="refresh" size={20} color="#16A34A" />
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No completed runs yet"
          description="Completed delivery runs will show up here."
        />
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
              <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
                <Card className="mb-sm">
                  {/* Header Row */}
                  <View className="flex-row items-center justify-between mb-sm">
                    <View>
                      <Text className="text-base font-extrabold text-ruvo-ink">
                        Run #{item.id} · Order #{item.orderId}
                      </Text>
                      <Text className="text-xs text-warm-600 font-medium mt-xs">{date}</Text>
                    </View>
                    <Text className="text-xl font-extrabold text-ruvo-accent">
                      +₹{item.deliveryFee}
                    </Text>
                  </View>

                  {/* Route Display */}
                  <View className="bg-warm-100 rounded-lg p-sm mb-sm">
                    <View className="flex-row items-center gap-xs mb-xs">
                      <Ionicons name="storefront-outline" size={14} color="#64748B" />
                      <Text className="flex-1 text-xs text-warm-700 font-semibold" numberOfLines={1}>
                        {item.shopName ?? item.pickupLocation?.split(',')[0]}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-xs">
                      <Ionicons name="location-outline" size={14} color="#EF4444" />
                      <Text className="flex-1 text-xs text-warm-700 font-semibold" numberOfLines={1}>
                        {item.deliveryLocation}
                      </Text>
                    </View>
                  </View>

                  {/* COD Section */}
                  {isCod && (
                    <View className="flex-row items-center justify-between pt-sm border-t border-warm-200">
                      <View className="flex-row items-center gap-xs">
                        <View className="bg-orange-100 px-sm py-xs rounded-md flex-row items-center gap-xs">
                          <Ionicons name="cash-outline" size={14} color="#D97706" />
                          <Text className="text-xs font-bold text-orange-700">
                            COD: ₹{item.codCollected ?? item.totalAmount ?? 0}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => generateHandoverOtp(item.orderId)}
                        className="bg-green-100 px-sm py-xs rounded-md flex-row items-center gap-xs"
                      >
                        <Ionicons name="key-outline" size={14} color="#16A34A" />
                        <Text className="text-xs font-bold text-ruvo-accent">Handover OTP</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </Animated.View>
            );
          }}
          renderSectionHeader={({ section }) => (
            <View className="bg-warm-200 px-md py-xs rounded-lg mb-sm mt-xs">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider">
                {section.title}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHistory(); }}
              tintColor="#16A34A"
              colors={['#16A34A']}
            />
          }
          contentContainerClassName="px-lg pt-lg pb-2xl"
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
};
