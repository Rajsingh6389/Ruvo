import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  InAppNotification,
} from '../../services/notificationService';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

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

const getNotificationConfig = (type: string): { icon: IoniconName; color: string; bg: string } => {
  if (type.includes('ORDER') || type.includes('DELIVERY')) {
    return { icon: 'bag-handle-outline', color: '#C46000', bg: '#FFF0DC' };
  }
  if (type.includes('PAYMENT') || type.includes('REFUND')) {
    return { icon: 'card-outline', color: '#065F46', bg: '#D1FAE5' };
  }
  if (type.includes('PROMO') || type.includes('OFFER')) {
    return { icon: 'pricetag-outline', color: '#7C3AED', bg: '#EDE9FE' };
  }
  return { icon: 'information-circle-outline', color: '#1E40AF', bg: '#DBEAFE' };
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors, typography, radius, shadows } = useTheme();

  const [notifs, setNotifs] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id ? String(user.id) : (user as any)?.mobileNumber;

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchUserNotifications(userId);
      setNotifs(data);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsAsRead(userId);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationPress = async (item: InAppNotification) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
      setNotifs((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }

    // Deep link navigation
    let parsedData: any = {};
    if (item.data) {
      try {
        parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      } catch {}
    }

    const orderId = item.orderId || (parsedData.orderId ? Number(parsedData.orderId) : undefined);
    const screen = parsedData.screen;

    if (screen) {
      navigation.navigate(screen, orderId ? { orderId } : undefined);
    } else if (orderId) {
      if (
        item.type === 'ORDER_DELIVERED' ||
        item.type === 'REFUND_COMPLETED' ||
        item.type === 'REFUND_INITIATED' ||
        item.type === 'ORDER_REJECTED' ||
        item.type === 'ORDER_CANCELLED'
      ) {
        navigation.navigate('OrderHistory', { orderId });
      } else {
        navigation.navigate('CustomerTracking', { orderId });
      }
    }
  };

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  const renderItem = ({ item }: { item: InAppNotification }) => {
    const cfg = getNotificationConfig(item.type || '');
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: item.isRead ? colors.surface : colors.primarySoft + '40',
            borderColor: item.isRead ? colors.border : colors.primary + '50',
            borderRadius: radius.card,
          },
          shadows.sm,
        ]}
        activeOpacity={0.85}
        onPress={() => handleNotificationPress(item)}
      >
        {!item.isRead && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}

        <View style={[styles.iconWrap, { backgroundColor: cfg.bg, borderRadius: radius.md }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.rowBetween}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 13, flex: 1 }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[typography.caption, { color: colors.textHint, fontSize: 11 }]}>
              {formatAgo(item.createdAt)}
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[typography.headingL, { color: colors.textPrimary }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Poppins_700Bold' }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifs.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft, borderRadius: 48 }]}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 20 }]}>No notifications</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
            You're all caught up! We'll notify you about orders and deliveries.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          extraData={notifs}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 80 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 0.5,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
});

