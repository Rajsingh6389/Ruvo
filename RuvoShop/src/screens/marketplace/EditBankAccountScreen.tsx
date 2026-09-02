/**
 * EditBankAccountScreen - RuvoShop (Redesigned)
 * Full NativeWind + Reanimated premium UI.
 * All validation, fetch and save logic preserved.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AnimatedRN, { FadeInUp, FadeIn } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { Button } from '../../components/ui/Button';

const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Punjab National Bank', 'Kotak Mahindra Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'Other',
];

export const EditBankAccountScreen = () => {
  const navigation = useNavigation<any>();
  const { token, userId } = useAuth();

  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [showBankList, setShowBankList] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      if (!token || !userId) { setFetching(false); return; }
      try {
        const res = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(userId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const shops = await res.json();
          if (Array.isArray(shops) && shops.length > 0) {
            const shop = shops[0];
            setAccountHolder(shop.accountHolder || shop.owner || '');
            setAccountNumber(shop.bankAccountNumber || '');
            setConfirmAccount(shop.bankAccountNumber || '');
            setIfsc(shop.ifscCode || '');
            setBankName(shop.bankName || '');
            setUpiId(shop.upiId || '');
          }
        }
      } catch {} finally {
        setFetching(false);
      }
    };
    load();
  }, [token, userId]);

  const validate = (): string | null => {
    if (!accountHolder.trim()) return 'Account holder name is required.';
    if (!bankName.trim()) return 'Please select your bank.';
    if (accountNumber.length < 9) return 'Enter a valid account number (min 9 digits).';
    if (accountNumber !== confirmAccount) return 'Account numbers do not match.';
    if (!ifsc.trim().match(/^[A-Z]{4}0[A-Z0-9]{6}$/i)) return 'Enter a valid 11-character IFSC code.';
    if (upiId.trim() && !upiId.match(/[A-Za-z0-9._-]+@[A-Za-z0-9._-]+/)) return 'Enter a valid UPI ID (e.g. name@okhdfcbank).';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(userId || '')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Could not fetch shop details');
      const shops = await res.json();
      if (!Array.isArray(shops) || shops.length === 0) throw new Error('No shop found to update bank details');

      const shop = shops[0];
      const updateRes = await fetch(`${API_BASE_URL}/api/shops/${shop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...shop,
          bankAccountNumber: accountNumber.trim(),
          ifscCode: ifsc.trim().toUpperCase(),
          upiId: upiId.trim() || null,
        }),
      });

      if (updateRes.ok) {
        setSaved(true);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        setTimeout(() => navigation.goBack(), 1800);
      } else {
        const data = await updateRes.json().catch(() => null);
        throw new Error(data?.message ?? `Error ${updateRes.status}`);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not save bank details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#F5B700" />
        <Text className="text-sm text-warm-600 mt-md font-medium">Loading bank details…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center gap-md">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 bg-warm-200 rounded-lg items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#231C10" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ruvo-ink">Bank Account Details</Text>
          <Text className="text-xs text-warm-600 font-medium mt-xs">Settlement payouts go to this account</Text>
        </View>
        <View className="w-9 h-9 bg-ruvo-yellow rounded-lg items-center justify-center">
          <Ionicons name="wallet" size={18} color="#231C10" />
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="px-lg pt-lg pb-2xl"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          {saved && (
            <Animated.View style={{ opacity: fadeAnim }} className="bg-green-100 border border-green-400 rounded-xl p-md mb-lg flex-row items-center gap-md">
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
              <Text className="flex-1 text-sm font-bold text-green-800">Bank details saved successfully!</Text>
            </Animated.View>
          )}

          {/* Account Info Section */}
          <AnimatedRN.View entering={FadeInUp.duration(500)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">Account Information</Text>

              <Text className="text-xs font-bold text-warm-700 mb-xs">Account Holder Name *</Text>
              <TextInput value={accountHolder} onChangeText={setAccountHolder} placeholder="Full name as on bank account" placeholderTextColor="#A79E92" className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink mb-md" />

              <Text className="text-xs font-bold text-warm-700 mb-xs">Bank Name *</Text>
              <TouchableOpacity
                onPress={() => setShowBankList(true)}
                className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm flex-row items-center justify-between mb-md"
              >
                <Text className={`text-sm ${bankName ? 'text-ruvo-ink font-semibold' : 'text-warm-500'}`}>
                  {bankName || 'Select your bank'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#A79E92" />
              </TouchableOpacity>

              <Text className="text-xs font-bold text-warm-700 mb-xs">Account Number *</Text>
              <TextInput value={accountNumber} onChangeText={setAccountNumber} placeholder="Bank account number" placeholderTextColor="#A79E92" keyboardType="number-pad" secureTextEntry className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink mb-md" />

              <Text className="text-xs font-bold text-warm-700 mb-xs">Confirm Account Number *</Text>
              <TextInput value={confirmAccount} onChangeText={setConfirmAccount} placeholder="Re-enter account number" placeholderTextColor="#A79E92" keyboardType="number-pad" className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink mb-md" />

              <Text className="text-xs font-bold text-warm-700 mb-xs">IFSC Code *</Text>
              <TextInput
                value={ifsc}
                onChangeText={t => setIfsc(t.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                placeholderTextColor="#A79E92"
                autoCapitalize="characters"
                maxLength={11}
                className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink font-mono"
              />
            </View>
          </AnimatedRN.View>

          {/* UPI Section */}
          <AnimatedRN.View entering={FadeInUp.delay(100).duration(500)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">UPI (Optional)</Text>
              <Text className="text-xs font-bold text-warm-700 mb-xs">UPI ID</Text>
              <TextInput value={upiId} onChangeText={setUpiId} placeholder="name@okhdfcbank" placeholderTextColor="#A79E92" keyboardType="email-address" autoCapitalize="none" className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink" />
              <Text className="text-xs text-warm-500 mt-xs">Example: yourname@okhdfc, yourvpa@upi</Text>
            </View>
          </AnimatedRN.View>

          {/* Error */}
          {error && (
            <AnimatedRN.View entering={FadeIn.duration(200)} className="bg-red-100 border border-red-300 rounded-xl p-md mb-lg flex-row items-start gap-sm">
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text className="flex-1 text-sm text-red-700 font-semibold">{error}</Text>
            </AnimatedRN.View>
          )}

          {/* Save */}
          <AnimatedRN.View entering={FadeInUp.delay(200).duration(500)}>
            <Button variant="primary" onPress={handleSave} loading={saving} icon="checkmark-circle">
              Save Bank Details
            </Button>
          </AnimatedRN.View>

          {/* Info note */}
          <View className="flex-row items-start gap-sm mt-lg">
            <Ionicons name="lock-closed-outline" size={14} color="#A79E92" />
            <Text className="flex-1 text-xs text-warm-500 leading-4">
              Your bank details are encrypted and used only for settlement payouts. We do not share this information with third parties.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bank Picker Modal */}
      <Modal visible={showBankList} transparent animationType="slide">
        <View className="flex-1 bg-warm-900/60 justify-end">
          <View className="bg-ruvo-surface rounded-t-3xl p-lg pb-2xl">
            <View className="flex-row items-center justify-between mb-lg">
              <Text className="text-lg font-extrabold text-ruvo-ink">Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankList(false)}>
                <Ionicons name="close" size={24} color="#A79E92" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BANKS}
              keyExtractor={item => item}
              ItemSeparatorComponent={() => <View className="h-px bg-warm-200" />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setBankName(item); setShowBankList(false); }}
                  className={`py-md px-sm flex-row items-center justify-between ${bankName === item ? 'bg-ruvo-yellow/20 rounded-lg' : ''}`}
                >
                  <Text className={`text-sm font-semibold ${bankName === item ? 'text-ruvo-ink font-extrabold' : 'text-warm-800'}`}>{item}</Text>
                  {bankName === item && <Ionicons name="checkmark" size={18} color="#F5B700" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
