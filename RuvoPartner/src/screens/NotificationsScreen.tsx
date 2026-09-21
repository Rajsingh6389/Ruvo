/**
 * NotificationsScreen - RuvoPartner (Redesigned)
 * Full NativeWind + Reanimated premium UI.
 * All API calls and business logic preserved.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { partnerService } from '../services/partnerService';
import { EmptyState } from '../components/ui/EmptyState';

type NotifItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  orderId?: number;
};

const formatAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const iconForType = (type: string): keyof typeof Ionicons.glyphMap => {
  if (type === 'DELIVERY_REQUEST') return 'bicycle';
  if (type === 'DELIVERY_ASSIGNED') return 'checkmark-circle';
  if (type === 'OUT_FOR_DELIVERY') return 'navigate';
  if (type === 'DELIVERED') return 'cube';
  if (type === 'CANCELLED_NO_PARTNER_FOUND') return 'close-circle';
  return 'notifications';
};

const colorForType = (type: string): string => {
  if (type === 'DELIVERY_REQUEST') return '#F97316';
  if (type === 'DELIVERY_ASSIGNED') return '#16A34A';
  if (type === 'OUT_FOR_DELIVERY') return '#3B82F6';
  if (type === 'DELIVERED') return '#16A34A';
  if (type === 'CANCELLED_NO_PARTNER_FOUND') return '#EF4444';
  return '#8B5CF6';
};

export const NotificationsScreen = () => {
  const { token } = useAuth();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ORDERS' | 'ALERTS'>('ALL');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await partnerService.notifications(token);
      setItems(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (item: NotifItem) => {
    if (!token || item.isRead) return;
    try {
      await partnerService.markNotificationRead(token, item.id);
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    if (!token) return;
    setMarkingAll(true);
    const unread = items.filter(n => !n.isRead);
    await Promise.allSettled(unread.map(n => partnerService.markNotificationRead(token, n.id)));
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const unreadCount = items.filter(n => !n.isRead).length;

  const filteredNotifs = filter === 'ALL' ? items : items.filter(n => {
    const isOrder = n.type !== 'CANCELLED_NO_PARTNER_FOUND' && n.type !== 'SYSTEM_ALERT';
    if (filter === 'ORDERS') return isOrder;
    if (filter === 'ALERTS') return !isOrder;
    return true;
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View className="px-lg py-md flex-row items-center justify-between border-b" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <View>
          <Text className="text-xl font-extrabold" style={{ color: colors.textPrimary }}>Notifications</Text>
          {unreadCount > 0 && (
            <Text className="text-xs font-bold text-ruvo-accent mt-xs">{unreadCount} unread</Text>
          )}
        </View>
        <View className="flex-row items-center gap-sm">
          <TouchableOpacity
            onPress={load}
            style={{ backgroundColor: colors.successSoft }}
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <Ionicons name="refresh" size={18} color={colors.success} />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllRead}
              disabled={markingAll}
              style={{ backgroundColor: colors.successSoft }}
              className="px-md py-xs rounded-lg min-w-[32px] items-center"
            >
              {markingAll
                ? <ActivityIndicator size="small" color={colors.success} />
                : <Text className="text-xs font-bold" style={{ color: colors.success }}>Mark all read</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row px-lg py-md border-b gap-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        {['ALL', 'ORDERS', 'ALERTS'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            activeOpacity={0.8}
            className={`px-lg py-sm rounded-[20px]`}
            style={{ backgroundColor: filter === tab ? colors.primary : colors.surfaceSunken }}
            onPress={() => setFilter(tab as any)}
          >
            <Text className={`text-[13px] font-bold`} style={{ color: filter === tab ? '#171A1F' : colors.textSecondary }}>
              {tab === 'ALL' ? 'All' : tab === 'ORDERS' ? 'Orders' : 'Alerts & Updates'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredNotifs}
        keyExtractor={x => String(x.id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.success} colors={[colors.success]} />
        }
        contentContainerClassName={`px-lg pt-lg pb-2xl ${items.length === 0 ? 'flex-grow' : ''}`}
        ItemSeparatorComponent={() => <View className="h-sm" />}
        ListEmptyComponent={
          loading
            ? <View className="flex-1 items-center justify-center py-3xl"><ActivityIndicator color={colors.success} size="large" /></View>
            : <EmptyState icon="notifications-off-outline" title="All caught up!" description="No notifications yet. Delivery requests and updates will appear here." />
        }
        renderItem={({ item, index }) => {
          const accent = colorForType(item.type);
          return (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(400)}>
              <TouchableOpacity
                onPress={() => markRead(item)}
                activeOpacity={0.75}
                className={`rounded-xl p-md flex-row items-start gap-md border`}
                style={{
                  backgroundColor: item.isRead ? colors.surface : colors.successSoft,
                  borderColor: item.isRead ? colors.border : colors.success
                }}
              >
                {/* Type icon */}
                <View
                  className="w-11 h-11 rounded-full items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: accent + '18' }}
                >
                  <Ionicons name={iconForType(item.type)} size={20} color={accent} />
                </View>

                {/* Content */}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-xs gap-sm">
                    <Text className="flex-1 text-sm font-extrabold" style={{ color: colors.textPrimary }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-xs font-semibold flex-shrink-0" style={{ color: colors.textSecondary }}>
                      {item.createdAt ? formatAgo(item.createdAt) : ''}
                    </Text>
                  </View>
                  <Text className="text-sm leading-5" style={{ color: colors.textSecondary }} numberOfLines={3}>
                    {item.message}
                  </Text>
                  {item.orderId && (
                    <View className="mt-xs self-start px-sm py-xs rounded-md flex-row items-center gap-xs" style={{ backgroundColor: colors.surfaceSunken }}>
                      <Ionicons name="receipt-outline" size={11} color={colors.textHint} />
                      <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>Order #{item.orderId}</Text>
                    </View>
                  )}
                </View>

                {/* Unread dot */}
                {!item.isRead && (
                  <View className="w-2 h-2 rounded-full absolute top-md right-md" style={{ backgroundColor: accent }} />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
};
