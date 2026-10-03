import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { getPlatformFeeSummary, payPlatformFee, verifyPlatformFee } from '../../services/settlementService';
import { API_BASE_URL, RAZORPAY_KEY_ID } from '../../config/api';

export default function BillingScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const shop = route.params?.shop;
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [settlementSummary, setSettlementSummary] = useState<any>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [currentShopInfo, setCurrentShopInfo] = useState<any>(shop);

  useEffect(() => {
    if (shop?.id && token) {
      loadData();
    }
  }, [shop?.id, token]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Settlement Summary
      const res = await getPlatformFeeSummary(shop.id, token!);
      if (res && !(res as any).error) setSettlementSummary(res);

      // 2. Refresh basic shop details (like subscription status) just in case
      const shopRes = await fetch(`${API_BASE_URL}/api/shops/${shop.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (shopRes.ok) {
        const freshShop = await shopRes.json();
        setCurrentShopInfo(freshShop);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePayCommission = () => {
    if (!settlementSummary || Number(settlementSummary.unpaidPlatformFee) <= 0) return;
    const amount = Number(settlementSummary.unpaidPlatformFee).toFixed(2);
    
    Alert.alert(
      'Pay RuVo Commission',
      `Proceeding to clear ₹${amount} unpaid platform commission via RuVo Pay UPI.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Pay Now ₹${amount}`,
          onPress: async () => {
            try {
              const initRes = await payPlatformFee(shop.id, token!);
              if (!initRes.razorpayOrderId) throw new Error("Could not construct Razorpay order.");
              
              const options = {
                description: 'RuVo Platform Commission',
                image: 'https://ruvo.in/logo.png',
                currency: 'INR',
                key: RAZORPAY_KEY_ID,
                amount: initRes.amount * 100,
                name: shop.name || 'RuVo Settlement',
                order_id: initRes.razorpayOrderId,
                theme: { color: '#F5B700' }
              };

              const data = await RazorpayCheckout.open(options);
              
              await verifyPlatformFee(shop.id, {
                razorpayOrderId: data.razorpay_order_id,
                razorpayPaymentId: data.razorpay_payment_id,
                razorpaySignature: data.razorpay_signature
              }, token!);

              Alert.alert('Success', 'RuVo Commission settled successfully! Your shop status is active.');
              loadData();
            } catch (err: any) {
              const msg = err.description || err.message || 'Payment failed or cancelled.';
              Alert.alert('Payment Error', 'Reason: ' + msg);
            }
          },
        },
      ]
    );
  };

  const handleSubscribe = async (plan: 'MONTHLY' | 'YEARLY') => {
    setSubscribing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscription/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ shopId: shop.id, plan })
      });
      
      const initData = await response.json();
      if (!response.ok || !initData.razorpay_order_id) {
        throw new Error(initData.error || "Failed to initiate subscription");
      }

      const options = {
        description: `RuVo ${plan} Subscription`,
        image: 'https://ruvo.in/logo.png',
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: Math.round(Number(initData.amount) * 100),
        name: 'RuVo Subscriptions',
        order_id: initData.razorpay_order_id,
        theme: { color: '#F5B700' }
      };

      const paymentData = await RazorpayCheckout.open(options);

      const verifyRes = await fetch(`${API_BASE_URL}/api/subscription/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          shopId: shop.id,
          plan: plan,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok) {
        Alert.alert('Subscription Activated', 'Your shop has been successfully enabled.');
        loadData();
      } else {
        throw new Error(verifyData.error || 'Verification failed');
      }

    } catch (e: any) {
      const msg = e.description || e.message || 'Payment cancelled.';
      Alert.alert('Payment Failed', msg);
    }
    setSubscribing(false);
  };


  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#F5B700" />
      </SafeAreaView>
    );
  }

  const subType = currentShopInfo?.subscriptionType || 'NONE';
  const subActive = currentShopInfo?.subscriptionActive ?? true;
  const isFreeTier = subType === 'FREE_TIER';

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg">
      <View className="bg-white px-md py-sm border-b border-gray-100 flex-row items-center gap-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#231C10" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900">Billing & Subscriptions</Text>
      </View>

      <ScrollView className="flex-1 p-lg gap-lg">

        {/* ── 1. Subscription Section ── */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card className="p-md bg-white rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
            <View className="flex-row items-center justify-between mb-sm">
               <View className="flex-row items-center gap-xs">
                 <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
                    <Ionicons name="star" size={18} color="#2563EB" />
                 </View>
                 <Text className="text-base font-black text-gray-900">Platform Subscription</Text>
               </View>
               <View className={`px-2 py-1 rounded border ${subActive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                 <Text className={`text-[10px] font-black ${subActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                   {subActive ? 'ACTIVE' : 'INACTIVE'}
                 </Text>
               </View>
            </View>

            {isFreeTier ? (
                <View className="bg-emerald-50 p-sm rounded-lg border border-emerald-100 mt-2">
                   <Text className="text-sm font-bold text-emerald-800">🎉 Early Adopter Free Tier</Text>
                   <Text className="text-xs text-emerald-600 mt-1">You are among the first 100 shops on RuVo. Your platform subscription is completely free for life!</Text>
                </View>
            ) : (
                <View className="mt-2">
                   {!subActive && (
                     <Text className="text-xs text-rose-600 font-semibold mb-3">
                       Your shop is disabled. Pick a plan to accept orders on RuVo.
                     </Text>
                   )}

                   {subActive && subType !== 'FREE_TIER' && (
                     <View className="mb-4">
                       <Text className="text-sm font-bold text-gray-800">Current Plan: {subType}</Text>
                       <Text className="text-xs text-gray-500">Valid until: {new Date(currentShopInfo?.subscriptionExpiry).toLocaleDateString()}</Text>
                     </View>
                   )}

                   {(!subActive || true) && ( // we can show renewal options even if active
                     <View className="gap-sm">
                        <TouchableOpacity 
                          disabled={subscribing}
                          onPress={() => handleSubscribe('MONTHLY')}
                          className="flex-row items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-xl"
                        >
                           <View>
                             <Text className="font-bold text-blue-900">Monthly Plan</Text>
                             <Text className="text-xs text-blue-700 mt-0.5">Renew every month</Text>
                           </View>
                           <Text className="font-black text-blue-900">₹149 / mo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          disabled={subscribing}
                          onPress={() => handleSubscribe('YEARLY')}
                          className="flex-row items-center justify-between bg-ruvo-yellow-soft border border-ruvo-yellow p-3 rounded-xl"
                        >
                           <View>
                             <Text className="font-bold text-ruvo-yellow-dark">Yearly Super Saver</Text>
                             <Text className="text-xs text-amber-700 mt-0.5">Save ₹289 per year</Text>
                           </View>
                           <Text className="font-black text-ruvo-yellow-dark">₹1499 / yr</Text>
                        </TouchableOpacity>
                     </View>
                   )}
                </View>
            )}
          </Card>
        </Animated.View>

        {/* ── 2. Commission Settlement Section ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mt-md">
          <Card className="p-md bg-white rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
            <View className="flex-row items-center gap-xs mb-sm">
                <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center">
                   <Ionicons name="wallet" size={18} color="#EA580C" />
                </View>
                <Text className="text-base font-black text-gray-900">COD Commission Settlements</Text>
            </View>

            {settlementSummary && Number(settlementSummary.unpaidPlatformFee) > 0 ? (
              <View>
                 <View className="flex-row justify-between items-center mb-2">
                   <Text className="text-sm font-semibold text-gray-600">Unpaid Balance</Text>
                   <Text className="text-lg font-black text-rose-600">₹{Number(settlementSummary.unpaidPlatformFee).toFixed(2)}</Text>
                 </View>

                 <View className="bg-warm-50 p-sm rounded-xl border border-gray-100 mb-xs flex-row justify-between items-center">
                    <View className="flex-row items-center gap-xs">
                      <Ionicons name="time" size={16} color={settlementSummary.overdue ? '#DC2626' : '#EA580C'} />
                      <Text className="text-xs font-bold text-gray-700">Deadline:</Text>
                    </View>
                    <Text className={`text-xs font-black ${settlementSummary.overdue ? 'text-rose-600' : 'text-orange-600'}`}>
                      {settlementSummary.overdue ? 'OVERDUE (Shop Disabled)' : `${settlementSummary.hoursRemaining ?? 48} Hours Left`}
                    </Text>
                 </View>

                 <TouchableOpacity
                    onPress={handlePayCommission}
                    className="mt-3 bg-ruvo-yellow py-3 rounded-xl items-center flex-row justify-center gap-2"
                 >
                    <Text className="text-xs font-black text-gray-900 uppercase">Pay Balance Now</Text>
                 </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center py-md">
                 <Ionicons name="checkmark-circle" size={40} color="#10B981" />
                 <Text className="text-sm font-bold text-gray-900 mt-2">All Clear!</Text>
                 <Text className="text-xs text-gray-500 text-center px-4 mt-1">You have no pending platform commissions to settle.</Text>
              </View>
            )}
          </Card>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}
