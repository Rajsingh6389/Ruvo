/**
 * ActiveDeliveryScreen - RuvoPartner (Redesigned with Premium UI/UX)
 * 
 * Features:
 * - Real-time delivery tracking
 * - Status timeline progress indicator
 * - Pickup and delivery location cards
 * - Navigation integration (maps)
 * - OTP verification modal
 * - Action buttons for each stage
 * - Earnings display
 * - Smooth animations
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Delivery, partnerService } from '../services/partnerService';
import { OfflineBar } from '../components/OfflineBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

const states = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const ActiveDeliveryScreen = () => {
  const { token } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const deliveryId = route.params?.deliveryId as number | undefined;
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');

  const load = useCallback(async () => {
    if (!token || !deliveryId) return;
    try {
      setDelivery(await partnerService.delivery(token, deliveryId));
    } catch (e: any) {
      Alert.alert('Delivery Unavailable', e.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [token, deliveryId, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  const navigateTo = (address: string) =>
    Linking.openURL(
      Platform.OS === 'android'
        ? `geo:0,0?q=${encodeURIComponent(address)}`
        : `maps:0,0?q=${encodeURIComponent(address)}`
    ).catch(() =>
      Alert.alert('Navigation Unavailable', 'Could not open a maps app on this device.')
    );

  const update = async (action: 'pickup' | 'out-for-delivery') => {
    if (!token || !deliveryId) return;
    setBusy(true);
    try {
      action === 'pickup'
        ? await partnerService.pickup(token, deliveryId)
        : await partnerService.startDelivery(token, deliveryId);
      await load();
    } catch (e: any) {
      Alert.alert('Update Not Confirmed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyDelivery = async () => {
    if (!token || !delivery || otp.length < 4) {
      return Alert.alert('Enter Customer OTP', 'Enter the OTP provided by the customer.');
    }
    setBusy(true);
    try {
      await api(
        `/api/delivery/orders/${delivery.orderId}/verify-otp?otp=${encodeURIComponent(otp)}`,
        token,
        { method: 'PATCH' }
      );
      setOtpOpen(false);
      Alert.alert('Delivery Verified', 'The order was completed successfully.');
      navigation.popToTop();
    } catch (e: any) {
      Alert.alert('Delivery Not Completed', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg">
        <OfflineBar />
        <View className="px-lg pt-lg">
          <Skeleton height={200} className="mb-md" />
          <Skeleton height={150} className="mb-md" />
          <Skeleton height={150} />
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) return null;

  const index = states.indexOf(delivery.status);
  const action =
    delivery.status === 'ASSIGNED'
      ? { label: 'ARRIVED AT SHOP & PICKED UP', handler: () => update('pickup'), color: 'bg-orange-500' }
      : delivery.status === 'PICKED_UP'
      ? { label: 'START DELIVERY TO CUSTOMER', handler: () => update('out-for-delivery'), color: 'bg-orange-500' }
      : delivery.status === 'OUT_FOR_DELIVERY'
      ? { label: 'COMPLETE DELIVERY (ENTER OTP)', handler: () => setOtpOpen(true), color: 'bg-ruvo-accent' }
      : null;

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      <OfflineBar />

      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center gap-md">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 bg-warm-200 rounded-lg items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#231C10" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-ruvo-ink">Active Delivery</Text>
          <Text className="text-xs text-warm-600 font-medium mt-xs">Order #{delivery.orderId}</Text>
        </View>
        <Badge variant="warning" size="sm">
          {delivery.status.replaceAll('_', ' ')}
        </Badge>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-lg pt-lg pb-2xl" showsVerticalScrollIndicator={false}>
        {/* Timeline Progress */}
        <Animated.View entering={FadeInUp.duration(500)}>
          <Card className="mb-lg">
            <Text className="text-base font-extrabold text-ruvo-ink mb-md">Delivery Status Timeline</Text>
            <View className="gap-sm">
              {states.map((state, i) => (
                <View key={state} className="flex-row items-center gap-md">
                  <View className={`w-3 h-3 rounded-full ${i <= index ? 'bg-ruvo-accent' : 'bg-warm-300'}`} />
                  <Text className={`text-sm ${i <= index ? 'text-ruvo-ink font-bold' : 'text-warm-600 font-medium'} ${i === index ? 'font-extrabold' : ''}`}>
                    {state.replaceAll('_', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Order Items Details Card */}
        {((delivery.items && delivery.items.length > 0) || delivery.productName) && (
          <Animated.View entering={FadeInDown.delay(50).duration(500)}>
            <Card className="mb-lg bg-emerald-50 border-emerald-200">
              <View className="flex-row items-center gap-xs mb-sm">
                <Ionicons name="basket" size={18} color="#059669" />
                <Text className="text-base font-extrabold text-ruvo-ink">Items to Pick Up</Text>
              </View>
              {delivery.items && delivery.items.length > 0 ? (
                <View className="gap-xs">
                  {delivery.items.map((it, idx) => (
                    <View key={it.id || idx} className="flex-row justify-between items-center bg-white p-sm rounded-lg border border-emerald-100">
                      <Text className="text-xs font-bold text-ruvo-ink flex-1">
                        <Text className="font-extrabold text-emerald-700">{it.quantity}×</Text> {it.productName}
                      </Text>
                      {it.priceAtOrder ? (
                        <Text className="text-xs font-extrabold text-ruvo-ink">₹{it.priceAtOrder * it.quantity}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-white p-sm rounded-lg border border-emerald-100 flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-ruvo-ink">
                    <Text className="font-extrabold text-emerald-700">{delivery.quantity || 1}×</Text> {delivery.productName}
                  </Text>
                  {delivery.totalAmount ? (
                    <Text className="text-xs font-extrabold text-ruvo-ink">₹{delivery.totalAmount}</Text>
                  ) : null}
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {/* Pickup Location Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card className="mb-lg">
            <View className="flex-row items-start gap-md">
              <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center">
                <Ionicons name="storefront" size={24} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-extrabold text-ruvo-accent uppercase tracking-wider mb-xs">
                  PICKUP LOCATION
                </Text>
                <Text className="text-sm text-ruvo-ink font-semibold mb-md leading-5">
                  {delivery.pickupLocation}
                </Text>
                <TouchableOpacity
                  onPress={() => navigateTo(delivery.pickupLocation)}
                  className="bg-green-100 px-md py-sm rounded-lg flex-row items-center gap-xs self-start"
                >
                  <Ionicons name="navigate-outline" size={16} color="#16A34A" />
                  <Text className="text-xs font-bold text-ruvo-accent">Navigate to Store</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Delivery Location Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Card className="mb-lg">
            <View className="flex-row items-start gap-md">
              <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center">
                <Ionicons name="location" size={24} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-extrabold text-orange-600 uppercase tracking-wider mb-xs">
                  DELIVERY LOCATION
                </Text>
                <Text className="text-sm text-ruvo-ink font-semibold mb-md leading-5">
                  {delivery.deliveryLocation}
                </Text>
                <TouchableOpacity
                  onPress={() => navigateTo(delivery.deliveryLocation)}
                  className="bg-orange-100 px-md py-sm rounded-lg flex-row items-center gap-xs self-start"
                >
                  <Ionicons name="navigate-outline" size={16} color="#F97316" />
                  <Text className="text-xs font-bold text-orange-600">Navigate to Customer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Earnings Card */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Card className="bg-green-50 border-green-300 flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-extrabold text-ruvo-ink">Guaranteed Delivery Fee</Text>
              <Text className="text-xs text-warm-600 font-medium mt-xs">
                Added to wallet upon completion
              </Text>
            </View>
            <Text className="text-2xl font-extrabold text-ruvo-accent">+₹{delivery.deliveryFee}</Text>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Action Footer */}
      {action && (
        <View className="px-lg pb-lg pt-md bg-ruvo-surface border-t border-warm-300">
          <TouchableOpacity
            disabled={busy}
            onPress={action.handler}
            activeOpacity={0.85}
            className={`${action.color} rounded-xl py-lg items-center justify-center`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-base font-extrabold text-white tracking-wide">
                {action.label}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* OTP Verification Modal */}
      <Modal visible={otpOpen} transparent animationType="slide">
        <View className="flex-1 bg-warm-900/75 justify-end">
          <Animated.View
            entering={FadeInUp.duration(400)}
            className="bg-ruvo-surface rounded-t-3xl p-xl"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-lg">
              <Text className="text-xl font-extrabold text-ruvo-ink">Verify Customer Delivery</Text>
              <TouchableOpacity onPress={() => setOtpOpen(false)}>
                <Ionicons name="close-circle-outline" size={28} color="#A79E92" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-warm-600 mb-lg leading-5">
              Ask the customer for their 4-digit or 6-digit delivery OTP to complete this order.
            </Text>

            {/* OTP Input */}
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="0 0 0 0"
              placeholderTextColor="#94A3B8"
              className="bg-warm-100 border-2 border-warm-300 rounded-xl px-lg py-lg text-center text-2xl font-bold text-ruvo-ink mb-lg tracking-widest"
            />

            {/* Verify Button */}
            <Button
              variant="primary"
              onPress={verifyDelivery}
              loading={busy}
              disabled={busy}
              icon="checkmark-circle"
            >
              VERIFY & COMPLETE ORDER
            </Button>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
