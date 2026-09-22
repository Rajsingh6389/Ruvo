import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  InAppNotification,
} from '../../services/notificationService';

const formatAgo = (isoDate: string): string => {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { userId, user } = useAuth();
  
  const [filter, setFilter] = useState<'ALL' | 'ORDERS' | 'ALERTS'>('ALL');
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const effectiveUserId = userId || (user as any)?.mobileNumber || user?.id;

  const load = useCallback(async () => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchUserNotifications(String(effectiveUserId));
      setNotifications(data);
    } catch (e) {
      console.warn('Failed to load shop notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleMarkAllRead = async () => {
    if (!effectiveUserId) return;
    await markAllNotificationsAsRead(String(effectiveUserId));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationPress = async (item: InAppNotification) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }

    let parsedData: any = {};
    if (item.data) {
      try {
        parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      } catch {}
    }

    const notifType = item.type || parsedData.type;
    const orderId = item.orderId || parsedData.orderId;

    if (notifType === 'NEW_ORDER' || notifType === 'ORDER_CANCELLED' || notifType === 'ORDER_PLACED') {
      navigation.navigate('ShopOrders', orderId ? { orderId: String(orderId) } : undefined);
    } else if (notifType === 'DELIVERY_PARTNER_ASSIGNED' || notifType === 'DELIVERY_PARTNER_ARRIVED') {
      if (orderId) {
        navigation.navigate('DeliveryPartnerAssignment', { orderId: String(orderId) });
      } else {
        navigation.navigate('ShopOrders');
      }
    } else if (notifType === 'LOW_STOCK' || notifType?.startsWith('PRODUCT_')) {
      navigation.navigate('MyProducts');
    } else if (notifType?.includes('BANK') || notifType?.includes('ACCOUNT')) {
      navigation.navigate('EditBankAccount');
    }
  };

  const filteredNotifs = filter === 'ALL' ? notifications : notifications.filter(n => {
    const isOrder = n.type?.includes('ORDER') || n.type?.includes('DELIVERY');
    return filter === 'ORDERS' ? isOrder : !isOrder;
  });

  const getIconColor = (type: string) => {
    if (type?.includes('ORDER') || type?.includes('DELIVERY')) return '#10B981';
    if (type?.includes('ALERT') || type?.includes('CANCEL') || type?.includes('FAIL')) return '#EF4444';
    return '#3B82F6';
  };

  const getIconBg = (type: string) => {
    if (type?.includes('ORDER') || type?.includes('DELIVERY')) return '#D1FAE5';
    if (type?.includes('ALERT') || type?.includes('CANCEL') || type?.includes('FAIL')) return '#FEE2E2';
    return '#DBEAFE';
  };

  const getIconName = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type?.includes('ORDER')) return 'fast-food';
    if (type?.includes('DELIVERY')) return 'bicycle';
    if (type?.includes('STOCK')) return 'cube-outline';
    if (type?.includes('BANK') || type?.includes('PAYMENT')) return 'wallet';
    if (type?.includes('CANCEL') || type?.includes('FAIL')) return 'close-circle';
    return 'notifications';
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</Text>
        <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done" size={20} color={unreadCount > 0 ? '#10B981' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['ALL', 'ORDERS', 'ALERTS'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabContent, filter === tab && styles.tabContentActive]}
            onPress={() => setFilter(tab as any)}
          >
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
              {tab === 'ALL' ? 'All' : tab === 'ORDERS' ? 'Orders' : 'Alerts & Updates'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
      >
        {loading && !refreshing ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : filteredNotifs.length > 0 ? (
          filteredNotifs.map((item) => (
             <TouchableOpacity
               key={item.id}
               style={[
                 styles.notifCard,
                 !item.isRead && { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
               ]}
               activeOpacity={0.8}
               onPress={() => handleNotificationPress(item)}
             >
               <View style={[styles.iconBox, { backgroundColor: getIconBg(item.type) }]}>
                 <Ionicons name={getIconName(item.type)} size={22} color={getIconColor(item.type)} />
               </View>
               <View style={styles.textContent}>
                 <View style={styles.titleRow}>
                   <Text style={[styles.title, !item.isRead && { color: '#065F46' }]}>{item.title}</Text>
                   <Text style={styles.time}>{formatAgo(item.createdAt)}</Text>
                 </View>
                 <Text style={styles.message}>{item.body}</Text>
               </View>
             </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>You're all caught up! ✨</Text>
            <Text style={styles.emptySub}>No new notifications right now.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: '#111827', textAlign: 'center', marginRight: -16 },
  markReadBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabContentActive: {
    backgroundColor: '#111827',
  },
  tabText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: { flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#111827', flex: 1 },
  time: { fontSize: 11, fontFamily: 'Poppins_500Medium', color: '#6B7280' },
  message: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: '#4B5563', lineHeight: 20 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: '#374151', marginTop: 16 },
  emptySub: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: '#6B7280', marginTop: 8 },
});

