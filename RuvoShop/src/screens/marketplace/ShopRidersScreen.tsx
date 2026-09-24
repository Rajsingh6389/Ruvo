import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { getMyShops } from '../../services/shopService';
import { getDeliveryPartnersByShop } from '../../services/deliveryPartnerService';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';

interface DeliveryPartner {
  id: number;
  name: string;
  phone: string;
  active: boolean;
  available: boolean;
  approved: boolean;
  lastActiveAt?: string;
  shopId?: number;
}

export default function ShopRidersScreen({ navigation, route }: any) {
  const { token, user, userId } = useAuth();
  const { showToast } = useToast();

  const [shopId, setShopId] = useState<number | null>(route?.params?.shopId || null);
  const [riders, setRiders] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE' | 'PENDING'>('ALL');

  const fetchRiders = useCallback(async (showLoader = true) => {
    if (!token) { setLoading(false); return; }
    let currentShopId = shopId;

    if (!currentShopId && (userId || user)) {
      try {
        const ownerId = userId || user?.email || '';
        const mineData = await getMyShops(ownerId, token);
        if (mineData && mineData.length > 0) {
          currentShopId = mineData[0].id;
          setShopId(currentShopId);
        }
      } catch {}
    }

    if (!currentShopId) { setLoading(false); return; }

    if (showLoader) setLoading(true);
    try {
      const data = await getDeliveryPartnersByShop(currentShopId, token);
      setRiders(data);
    } catch (e: any) {
      showToast(e.message || 'Could not fetch riders', 'error');
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [shopId, token, user, userId]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRiders(false);
  };

  const dialPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderRider = ({ item, index }: { item: DeliveryPartner; index: number }) => {
    const isOnline = item.active && item.available;
    const isPending = !item.approved;

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100 flex-row items-center relative overflow-hidden">
          {/* Status Indicator Bar on Left */}
          <View className={`absolute left-0 top-0 bottom-0 w-1.5 ${isPending ? 'bg-yellow-400' : isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />

          {/* Avatar Section */}
          <View className="relative mr-4">
            <View className={`w-14 h-14 rounded-full border-2 items-center justify-center bg-gray-50
              ${isPending ? 'border-yellow-200' : isOnline ? 'border-green-200' : 'border-gray-200'}`}>
              <Ionicons name="bicycle-outline" size={26} color={isPending ? '#EAB308' : isOnline ? '#22C55E' : '#9CA3AF'} />
            </View>
            <View className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white
              ${isPending ? 'bg-yellow-400' : isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          </View>

          {/* Details */}
          <View className="flex-1">
            <Text className="text-base font-black text-gray-900 tracking-tight" numberOfLines={1}>{item.name}</Text>
            
            <View className="flex-row items-center gap-1.5 mt-1">
              <View className={`px-2 py-0.5 rounded-md flex-row items-center gap-1
                ${isPending ? 'bg-yellow-50' : isOnline ? 'bg-green-50' : 'bg-gray-100'}`}>
                <Text className={`text-[10px] font-black uppercase tracking-wider
                  ${isPending ? 'text-yellow-700' : isOnline ? 'text-green-700' : 'text-gray-500'}`}>
                  {isPending ? 'Pending Approval' : isOnline ? 'Online • Ready' : 'Offline'}
                </Text>
              </View>
            </View>

            {item.lastActiveAt && (
              <Text className="text-[10px] items-center text-gray-400 font-bold mt-1.5 uppercase">
                Last seen: {new Date(item.lastActiveAt).toLocaleString()}
              </Text>
            )}
          </View>

          {/* Call Action */}
          <TouchableOpacity 
            onPress={() => dialPhone(item.phone)}
            className="w-10 h-10 bg-green-50 rounded-full items-center justify-center ml-2 border border-green-100 active:opacity-75"
          >
            <Ionicons name="call" size={18} color="#16A34A" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-6 py-4 flex-row items-center shadow-sm border-b border-gray-100 z-0">
        <TouchableOpacity
          onPress={() => navigation.toggleDrawer ? navigation.toggleDrawer() : navigation.goBack()}
          className="w-10 h-10 bg-gray-50 rounded-full border border-gray-100 items-center justify-center active:bg-gray-100"
        >
          <Ionicons name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1 ml-4">
          <Text className="text-xl font-black text-gray-900 tracking-tight">My Riders</Text>
          <Text className="text-[11px] text-[#FF7A00] font-black uppercase tracking-widest mt-0.5">Manage Delivery Fleet</Text>
        </View>
        <Ionicons name="people" size={24} color="#FF7A00" />
      </View>

      <View className="flex-1 px-5 pt-4">
        {/* Navigator for Active/Offline */}
        <View className="flex-row items-center justify-between mb-4 bg-gray-100 rounded-2xl p-1">
          <TouchableOpacity 
            onPress={() => setFilter('ALL')} 
            className={`flex-1 items-center py-2 rounded-xl ${filter === 'ALL' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
          >
            <Text className={`font-bold text-xs ${filter === 'ALL' ? 'text-gray-900' : 'text-gray-500'}`}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilter('ONLINE')} 
            className={`flex-1 items-center py-2 rounded-xl ${filter === 'ONLINE' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
          >
            <Text className={`font-bold text-xs ${filter === 'ONLINE' ? 'text-green-600' : 'text-gray-500'}`}>Online</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilter('OFFLINE')} 
            className={`flex-1 items-center py-2 rounded-xl ${filter === 'OFFLINE' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
          >
            <Text className={`font-bold text-xs ${filter === 'OFFLINE' ? 'text-gray-500' : 'text-gray-400'}`}>Offline</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilter('PENDING')} 
            className={`flex-1 items-center py-2 rounded-xl ${filter === 'PENDING' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
          >
            <Text className={`font-bold text-xs ${filter === 'PENDING' ? 'text-yellow-600' : 'text-gray-500'}`}>Pending</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FF7A00" />
            <Text className="text-sm font-bold text-gray-400 mt-4 uppercase tracking-widest">Loading Fleet...</Text>
          </View>
        ) : (
          <FlatList
            data={riders.filter(r => {
              if (filter === 'ONLINE') return r.active && r.available && r.approved;
              if (filter === 'OFFLINE') return (!r.active || !r.available) && r.approved;
              if (filter === 'PENDING') return !r.approved;
              return true;
            })}
            keyExtractor={r => r.id.toString()}
            renderItem={renderRider}
            contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7A00']} />}
            ListHeaderComponent={
              riders.length > 0 ? (
                <Animated.View entering={FadeInUp.duration(400)} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex-row items-center justify-between mb-5">
                  <View className="items-center flex-1">
                    <Text className="text-lg font-black text-gray-900">{riders.length}</Text>
                    <Text className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Total Fleet</Text>
                  </View>
                  <View className="h-8 w-[1px] bg-gray-200" />
                  <View className="items-center flex-1">
                    <Text className="text-lg font-black text-green-600">
                      {riders.filter(r => r.active && r.available && r.approved).length}
                    </Text>
                    <Text className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Online</Text>
                  </View>
                  <View className="h-8 w-[1px] bg-gray-200" />
                  <View className="items-center flex-1">
                    <Text className="text-lg font-black text-gray-400">
                      {riders.filter(r => (!r.active || !r.available) && r.approved).length}
                    </Text>
                    <Text className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Offline</Text>
                  </View>
                </Animated.View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState 
                icon="bicycle" 
                title="No Riders Found" 
                description="Your shop doesn't have any assigned delivery partners yet."  
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
