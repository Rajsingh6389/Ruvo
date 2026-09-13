import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type NotifType = 'order' | 'promo' | 'info';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const SAMPLE: Notif[] = [
  { id: '1', type: 'order',  title: 'Order Delivered 🎉',       body: 'Your order has been delivered successfully. Enjoy!', time: '2 min ago',   read: false },
  { id: '2', type: 'order',  title: 'Rider Assigned 🛵',        body: 'A delivery partner has been assigned to your order.',  time: '15 min ago',  read: false },
  { id: '3', type: 'promo',  title: 'Weekend Offer! 🛒',        body: 'Get free delivery on your next 3 orders this weekend.', time: '1 hr ago',   read: true  },
  { id: '4', type: 'info',   title: 'Welcome to RuVo 👋',       body: 'Discover local shops, order fresh products and more.', time: '1 day ago',   read: true  },
];

const TYPE_CONFIG: Record<NotifType, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  order: { icon: 'bag-handle-outline', color: '#C46000', bg: '#FFF0DC' },
  promo: { icon: 'pricetag-outline',   color: '#065F46', bg: '#D1FAE5' },
  info:  { icon: 'information-circle-outline', color: '#1E40AF', bg: '#DBEAFE' },
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, radius, shadows } = useTheme();
  const [notifs, setNotifs] = useState<Notif[]>(SAMPLE);

  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const renderItem = ({ item }: { item: Notif }) => {
    const cfg = TYPE_CONFIG[item.type];
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: item.read ? colors.surface : colors.primarySoft + '55',
            borderColor: item.read ? colors.border : colors.primary + '60',
            borderRadius: radius.card,
          },
          shadows.sm,
        ]}
        activeOpacity={0.85}
        onPress={() => markRead(item.id)}
      >
        {/* Left accent dot for unread */}
        {!item.read && (
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
            <Text style={[typography.caption, { color: colors.textHint, fontSize: 11 }]}>{item.time}</Text>
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
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[typography.headingL, { color: colors.textPrimary }]}>Notifications</Text>
          {unread > 0 && (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{unread} unread</Text>
          )}
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── List ───────────────────────────────────────────── */}
      {notifs.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft, borderRadius: 48 }]}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 20 }]}>No notifications</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
            You're all caught up! We'll notify you about orders and offers.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={n => n.id}
          renderItem={renderItem}
          extraData={notifs}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 80 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, padding: 14, borderWidth: 0.5, position: 'relative',
  },
  unreadDot: {
    position: 'absolute', top: 16, right: 14,
    width: 8, height: 8, borderRadius: 4,
  },
  iconWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
});
