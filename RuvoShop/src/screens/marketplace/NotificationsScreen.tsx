import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  
  const [filter, setFilter] = useState<'ALL' | 'ORDERS' | 'ALERTS'>('ALL');

  const notifications = [
    { id: 1, type: 'ORDER', title: 'New Order Received', message: 'Order #3492 from John Doe (₹450).', time: 'Just now', icon: 'fast-food' },
    { id: 2, type: 'ALERT', title: 'Shop Offline Warning', message: 'Your shop was marked offline due to missed orders. Please go online.', time: '1 hr ago', icon: 'warning' },
    { id: 3, type: 'UPDATE', title: 'Weekly Settlement Processed', message: '₹4,592 has been settled to your account xxxx-9032.', time: 'Yesterday', icon: 'wallet' },
    { id: 4, type: 'ORDER', title: 'Order Cancelled', message: 'Order #3488 was cancelled by the customer.', time: 'Yesterday', icon: 'close-circle' },
  ];

  const filteredNotifs = filter === 'ALL' ? notifications : notifications.filter(n => 
    (filter === 'ORDERS' && n.type === 'ORDER') || 
    (filter === 'ALERTS' && n.type !== 'ORDER')
  );

  const getIconColor = (type: string) => {
    switch (type) {
      case 'ORDER': return '#10B981'; // Green
      case 'ALERT': return '#EF4444'; // Red
      default: return '#3B82F6'; // Blue
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'ORDER': return '#D1FAE5'; 
      case 'ALERT': return '#FEE2E2'; 
      default: return '#DBEAFE'; 
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.markReadBtn}>
          <Ionicons name="checkmark-done" size={20} color="#6B7280" />
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredNotifs.length > 0 ? (
          filteredNotifs.map((item) => (
             <View key={item.id} style={styles.notifCard}>
               <View style={[styles.iconBox, { backgroundColor: getIconBg(item.type) }]}>
                 <Ionicons name={item.icon as any} size={22} color={getIconColor(item.type)} />
               </View>
               <View style={styles.textContent}>
                 <View style={styles.titleRow}>
                   <Text style={styles.title}>{item.title}</Text>
                   <Text style={styles.time}>{item.time}</Text>
                 </View>
                 <Text style={styles.message}>{item.message}</Text>
               </View>
             </View>
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
