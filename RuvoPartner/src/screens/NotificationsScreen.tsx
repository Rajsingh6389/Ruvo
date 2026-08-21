import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { partnerService } from '../services/partnerService';

const PRIMARY_EMERALD = '#059669';
const EMERALD_LIGHT = '#ECFDF5';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';

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
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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
  if (type === 'DELIVERY_ASSIGNED') return PRIMARY_EMERALD;
  if (type === 'OUT_FOR_DELIVERY') return '#3B82F6';
  if (type === 'DELIVERED') return PRIMARY_EMERALD;
  if (type === 'CANCELLED_NO_PARTNER_FOUND') return '#EF4444';
  return '#8B5CF6';
};

export const NotificationsScreen = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await partnerService.notifications(token);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const markRead = async (item: NotifItem) => {
    if (!token || item.isRead) return;
    try {
      await partnerService.markNotificationRead(token, item.id);
      setItems(prev => prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n)));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    setMarkingAll(true);
    const unread = items.filter(n => !n.isRead);
    await Promise.allSettled(
      unread.map(n => partnerService.markNotificationRead(token, n.id))
    );
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const unreadCount = items.filter(n => !n.isRead).length;

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadSub}>{unreadCount} unread</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={load}
            style={{ padding: 8, backgroundColor: EMERALD_LIGHT, borderRadius: 20 }}
          >
            <Ionicons name="refresh" size={18} color={PRIMARY_EMERALD} />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllRead}
              disabled={markingAll}
              style={styles.markAllBtn}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={PRIMARY_EMERALD} />
              ) : (
                <Text style={styles.markAllText}>Mark all read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={x => String(x.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={PRIMARY_EMERALD} />}
        contentContainerStyle={items.length ? styles.list : styles.empty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={PRIMARY_EMERALD} size="large" />
          ) : (
            <View style={styles.emptyContent}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={36} color={TEXT_MUTED} />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>No notifications yet. New delivery requests and updates will appear here.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const accent = colorForType(item.type);
          return (
            <TouchableOpacity
              onPress={() => markRead(item)}
              activeOpacity={0.75}
              style={[
                styles.card,
                !item.isRead && styles.cardUnread,
              ]}
            >
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
              <View style={[styles.iconCircle, { backgroundColor: accent + '18' }]}>
                <Ionicons name={iconForType(item.type)} size={20} color={accent} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardTime}>
                    {item.createdAt ? formatAgo(item.createdAt) : ''}
                  </Text>
                </View>
                <Text style={styles.cardMessage} numberOfLines={3}>{item.message}</Text>
                {item.orderId && (
                  <View style={styles.orderChip}>
                    <Ionicons name="receipt-outline" size={11} color={TEXT_MUTED} />
                    <Text style={styles.orderChipText}>Order #{item.orderId}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#FFF',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  title: { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  unreadSub: { fontSize: 12, color: PRIMARY_EMERALD, fontWeight: '600', marginTop: 2 },

  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: EMERALD_LIGHT,
    borderRadius: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  markAllText: { color: PRIMARY_EMERALD, fontSize: 13, fontWeight: '700' },

  list: { padding: 16 },
  separator: { height: 10 },

  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyContent: { alignItems: 'center' },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 6 },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    position: 'relative',
  },
  cardUnread: {
    borderColor: PRIMARY_EMERALD + '55',
    backgroundColor: EMERALD_LIGHT + 'CC',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, flex: 1 },
  cardTime: { fontSize: 11, color: TEXT_MUTED, fontWeight: '600', flexShrink: 0 },
  cardMessage: { fontSize: 13, color: TEXT_MUTED, lineHeight: 18 },
  orderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderChipText: { fontSize: 11, color: TEXT_MUTED, fontWeight: '600' },
});
