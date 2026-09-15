/**
 * ActiveDeliveryScreen - RuvoPartner (Premium Dark Bento UI)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Delivery, partnerService } from '../services/partnerService';
import { OfflineBar } from '../components/OfflineBar';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

const states = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const ActiveDeliveryScreen = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const deliveryId = route.params?.deliveryId as number | undefined;
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [otpModalMode, setOtpModalMode] = useState<'pickup' | 'delivery' | null>(null);
  const [otp, setOtp] = useState('');
  const [focused, setFocused] = useState(false);

  const load = useCallback(async () => {
    if (!token || !deliveryId) return;
    try {
      setDelivery(await partnerService.delivery(token, deliveryId));
    } catch (e: any) {
      showToast(e.message || 'Delivery unavailable', 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [token, deliveryId, navigation, showToast]);

  useEffect(() => {
    load();
    
    // Poll for status changes like cancellations
    const interval = setInterval(async () => {
      if (!token || !deliveryId) return;
      try {
        const updated = await partnerService.delivery(token, deliveryId);
        if (['CANCELLED', 'FAILED', 'REJECTED', 'SHOP_REJECTED'].includes(updated.status)) {
          showToast('Order was cancelled by the shop or customer.', 'error');
          navigation.popToTop();
        } else {
          setDelivery(updated);
        }
      } catch (e) {
        showToast('Order is no longer available.', 'error');
        navigation.popToTop();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [load, token, deliveryId, navigation, showToast]);

  const navigateTo = (address: string) =>
    Linking.openURL(
      Platform.OS === 'android'
        ? `geo:0,0?q=${encodeURIComponent(address)}`
        : `maps:0,0?q=${encodeURIComponent(address)}`
    ).catch(() =>
      showToast('Could not open maps app on this device.', 'warning')
    );

  const update = async (action: 'out-for-delivery') => {
    if (!token || !deliveryId) return;
    setBusy(true);
    try {
      await partnerService.startDelivery(token, deliveryId);
      showToast('Delivery Started!', 'success');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Update failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const verifyPickup = async () => {
    if (!token || !deliveryId) return;
    setBusy(true);
    try {
      await partnerService.pickup(token, deliveryId, ''); // No OTP required
      showToast('Order Picked Up successfully!', 'success');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Verification failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const verifyDelivery = async () => {
    if (!token || !delivery || otp.length < 4) {
      return showToast('Enter customer OTP to complete', 'warning');
    }
    setBusy(true);
    try {
      await api(
        `/api/delivery/orders/${delivery.orderId}/verify-otp?otp=${encodeURIComponent(otp)}`,
        token,
        { method: 'PATCH' }
      );
      setOtpModalMode(null);
      setOtp('');
      showToast('Delivery verified and completed!', 'success');
      navigation.popToTop();
    } catch (e: any) {
      showToast(e.message || 'Verification failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-ink">
        <OfflineBar />
        <View className="px-6 pt-6">
          <Skeleton height={200} className="mb-4 bg-gray-800" />
          <Skeleton height={150} className="mb-4 bg-gray-800" />
          <Skeleton height={150} className="bg-gray-800" />
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) return null;

  const index = states.indexOf(delivery.status);
  const action =
    delivery.status === 'ASSIGNED'
      ? { label: 'ARRIVED & PICKED UP', handler: () => verifyPickup(), color: 'bg-[#FF7A00]', icon: 'storefront' }
      : delivery.status === 'PICKED_UP'
      ? { label: 'START DELIVERY', handler: () => update('out-for-delivery'), color: 'bg-[#FF7A00]', icon: 'bicycle' }
      : delivery.status === 'OUT_FOR_DELIVERY'
      ? { label: 'COMPLETE (ENTER OTP)', handler: () => setOtpModalMode('delivery'), color: 'bg-emerald-500', icon: 'checkmark-circle' }
      : null;

  return (
    <SafeAreaView className="flex-1 bg-ruvo-ink" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <OfflineBar />

      {/* Decorative Glow Elements */}
      <View className="absolute top-0 right-[-100px] w-64 h-64 bg-[#FF7A00]/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Header */}
      <View className="bg-ruvo-ink/90 border-b border-gray-800 px-6 py-4 flex-row items-center gap-4 z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-white/5 border border-white/10 rounded-full items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-white tracking-tight">Active Delivery</Text>
        </View>
        <View className="bg-[#FF7A00]/20 border border-[#FF7A00]/30 px-3 py-1.5 rounded-full">
          <Text className="text-[#FF7A00] font-black text-[10px] tracking-wider uppercase">
            {delivery.status.replaceAll('_', ' ')}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Timeline Progress */}
        <Animated.View entering={FadeInUp.duration(500)}>
          <View className="mb-5 bg-[#1C2026] border border-gray-800 rounded-[28px] p-5 shadow-lg shadow-black/40">
            <Text className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Status Timeline</Text>
            <View className="gap-3">
              {states.map((state, i) => (
                <View key={state} className="flex-row items-center gap-4">
                  <View className={`w-3.5 h-3.5 rounded-full ${i <= index ? 'bg-[#FF7A00] shadow-[0_0_8px_#FF7A00]' : 'bg-gray-800'}`} />
                  <Text className={`text-sm ${i <= index ? 'text-white font-black' : 'text-gray-500 font-bold'}`}>
                    {state.replaceAll('_', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Order Items Details Card */}
        {((delivery.items && delivery.items.length > 0) || delivery.productName) && (
          <Animated.View entering={FadeInDown.delay(50).duration(500)}>
            <View className="mb-5 bg-[#1C2026] border border-gray-800 rounded-[28px] p-5 shadow-lg shadow-black/40">
              <View className="flex-row items-center gap-2 mb-4 ml-1">
                <Ionicons name="basket" size={16} color="#9CA3AF" />
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Order Summary</Text>
              </View>
              
              {delivery.items && delivery.items.length > 0 ? (
                <View className="gap-3">
                  {delivery.items.map((it, idx) => {
                    const itImg = (it as any).productImageUrl ? ((it as any).productImageUrl.startsWith('http') ? (it as any).productImageUrl : `http://192.168.1.5:8080${(it as any).productImageUrl}`) : null;
                    return (
                      <View key={it.id || idx} className="flex-row justify-between items-center bg-[#171A1F] p-3 rounded-2xl border border-gray-800 gap-3">
                        {itImg ? (
                          <Image source={{ uri: itImg }} className="w-10 h-10 rounded-xl bg-gray-800" />
                        ) : (
                          <View className="w-10 h-10 rounded-xl bg-gray-800 items-center justify-center">
                            <Ionicons name="basket-outline" size={18} color="#9CA3AF" />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-[13px] font-bold text-white mb-1" numberOfLines={1}>
                            {it.productName}
                          </Text>
                          <Text className="text-[11px] font-black text-[#FF7A00] tracking-widest uppercase">
                            Qty: {it.quantity}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="bg-[#171A1F] p-4 rounded-2xl border border-gray-800 flex-row justify-between items-center">
                  <Text className="text-sm font-bold text-white">
                    <Text className="font-black text-[#FF7A00]">{delivery.quantity || 1}×</Text> {delivery.productName}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Pickup Location Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View className="mb-5 bg-[#1C2026] border border-gray-800 rounded-[28px] p-5 shadow-lg shadow-black/40">
            <View className="flex-row gap-4">
              <View className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl items-center justify-center">
                <Ionicons name="storefront" size={22} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">
                  PICKUP LOCATION
                </Text>
                <Text className="text-sm text-white font-bold mb-4 leading-5">
                  {delivery.pickupLocation}
                </Text>
                <TouchableOpacity
                  onPress={() => navigateTo(delivery.pickupLocation)}
                  activeOpacity={0.7}
                  className="bg-[#171A1F] border border-gray-700 px-4 py-2.5 rounded-xl flex-row items-center gap-2 self-start"
                >
                  <Ionicons name="navigate" size={16} color="#3B82F6" />
                  <Text className="text-xs font-bold text-gray-300 tracking-wider">Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Delivery Location Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <View className="mb-5 bg-[#1C2026] border border-gray-800 rounded-[28px] p-5 shadow-lg shadow-black/40">
            <View className="flex-row gap-4">
              <View className="w-12 h-12 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-2xl items-center justify-center">
                <Ionicons name="location" size={22} color="#FF7A00" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-[#FF7A00] uppercase tracking-widest mb-1.5">
                  DELIVERY LOCATION
                </Text>
                <Text className="text-sm text-white font-bold mb-4 leading-5">
                  {delivery.deliveryLocation}
                </Text>
                <TouchableOpacity
                  onPress={() => navigateTo(delivery.deliveryLocation)}
                  activeOpacity={0.7}
                  className="bg-[#171A1F] border border-gray-700 px-4 py-2.5 rounded-xl flex-row items-center gap-2 self-start"
                >
                  <Ionicons name="navigate" size={16} color="#FF7A00" />
                  <Text className="text-xs font-bold text-gray-300 tracking-wider">Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Earnings Card */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View className="border border-emerald-500/20 shadow-lg shadow-black/40 bg-emerald-500/5 rounded-[28px] p-6 flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-black text-white tracking-wide">Guaranteed Payout</Text>
              <Text className="text-[11px] text-emerald-500/70 font-bold mt-1 tracking-widest uppercase">
                Wallet +₹{delivery.deliveryFee}
              </Text>
            </View>
            <Text className="text-3xl font-black text-emerald-400 tracking-tighter">₹{delivery.deliveryFee}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Action Footer */}
      {action && (
        <View className="absolute bottom-0 w-full px-6 pb-8 pt-4 bg-[#171A1F]/90 border-t border-gray-800">
          <TouchableOpacity
            disabled={busy}
            onPress={action.handler}
            activeOpacity={0.85}
            className={`${action.color} rounded-2xl h-16 flex-row items-center justify-center gap-2`}
            style={{ shadowColor: action.color.includes('emerald') ? '#10B981' : '#FF7A00', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 }}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name={action.icon as any} size={20} color="#FFF" />
                <Text className="text-base font-black tracking-widest uppercase text-white">
                  {action.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* OTP Verification Modal */}
      <Modal visible={otpModalMode !== null} transparent animationType="slide">
        <View className="flex-1 bg-black/80 justify-end">
          <Animated.View
            entering={FadeInUp.duration(400)}
            className="bg-[#1C2026] rounded-t-[32px] p-6 border-t border-gray-800 pb-10"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-black text-white tracking-tight">
                Customer Verification
              </Text>
              <TouchableOpacity onPress={() => setOtpModalMode(null)} className="w-8 h-8 bg-gray-800 rounded-full items-center justify-center">
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-gray-400 font-bold mb-6 leading-5">
              Ask the customer for their delivery OTP to complete this order.
            </Text>

            {/* OTP Input */}
            <View className="mb-2">
              <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">
                6-Digit OTP
              </Text>
              <View className={`flex-row items-center h-16 rounded-2xl px-4 border ${focused ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'} transition-all mb-6`}>
                <Ionicons name="key-outline" size={24} color="#9CA3AF" />
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="••••••"
                  placeholderTextColor="#4B5563"
                  className="flex-1 text-white text-3xl font-black ml-3 tracking-[8px] text-center"
                />
              </View>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={verifyDelivery}
              disabled={busy}
              className={`h-16 rounded-2xl flex-row items-center justify-center gap-2 ${busy ? 'bg-[#FF7A00]/70' : 'bg-[#FF7A00]'}`}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#FFF" />
                  <Text className="text-white font-black tracking-widest uppercase">
                    COMPLETE DELIVERY
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
