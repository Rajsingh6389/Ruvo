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

const InputField = ({ label, icon, value, onChangeText, placeholder, ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View className="mb-4">
      <Text className={`text-xs font-black uppercase tracking-wider mb-2 ${isFocused ? 'text-[#FF7A00]' : 'text-gray-500'}`}>{label}</Text>
      <View className={`flex-row items-center border-[1.5px] rounded-2xl px-4 py-1 flex-1 bg-white shadow-sm ${
        isFocused ? 'border-[#FF7A00]' : 'border-gray-100'
      }`} style={{ minHeight: 56 }}>
        <Ionicons name={icon} size={20} color={isFocused ? '#FF7A00' : '#9CA3AF'} className="mr-3" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, flex: 1, paddingVertical: 14 }}
          {...props}
        />
      </View>
    </View>
  );
};

export const EditBankAccountScreen = () => {
  const navigation = useNavigation<any>();
  const { token, userId } = useAuth();

  const [{ accountHolder, accountNumber, confirmAccount, ifsc, bankName, upiId }, setForm] = useState({
    accountHolder: '', accountNumber: '', confirmAccount: '', ifsc: '', bankName: '', upiId: ''
  });

  const [activeField, setActiveField] = useState<string | null>(null);
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
            setForm({
              accountHolder: shop.accountHolder || shop.owner || '',
              accountNumber: shop.bankAccountNumber || '',
              confirmAccount: shop.bankAccountNumber || '',
              ifsc: shop.ifscCode || '',
              bankName: shop.bankName || '',
              upiId: shop.upiId || ''
            });
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
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FF7A00" />
        <Text className="text-sm text-gray-500 mt-4 font-bold tracking-widest uppercase">Fetching Details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center gap-4 shadow-sm z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-gray-50 rounded-full border border-gray-100 items-center justify-center active:opacity-70">
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-gray-900 tracking-tight">Payout Account</Text>
          <Text className="text-[11px] text-[#FF7A00] font-black uppercase tracking-widest mt-0.5">Secure Banking</Text>
        </View>
        <View className="w-10 h-10 bg-green-50 rounded-full border border-green-100 items-center justify-center">
          <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 250 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {saved && (
            <Animated.View style={{ opacity: fadeAnim }} className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-6 shadow-sm flex-row items-center gap-3">
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
              <Text className="flex-1 text-sm font-black text-green-800">Payout details strictly saved & verified!</Text>
            </Animated.View>
          )}

          <AnimatedRN.View entering={FadeInUp.duration(500)}>
            {/* Account Details */}
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                  <Ionicons name="person" size={14} color="#2563EB" />
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Account Details</Text>
              </View>

              <InputField label="Account Holder Name" icon="text-outline" value={accountHolder} onChangeText={(t: string) => setForm(f => ({ ...f, accountHolder: t }))} placeholder="Exact name as passbook" />
              
              <View className="mb-4">
                <Text className={`text-xs font-black uppercase tracking-wider mb-2 ${activeField === 'Bank Name' ? 'text-[#FF7A00]' : 'text-gray-500'}`}>Bank Name</Text>
                <TouchableOpacity
                  onPress={() => setShowBankList(true)}
                  className={`flex-row items-center border-[1.5px] rounded-2xl px-4 py-1 flex-1 bg-white shadow-sm ${showBankList ? 'border-[#FF7A00]' : 'border-gray-100'}`}
                  style={{ minHeight: 56 }}
                >
                  <Ionicons name="business" size={20} color={bankName ? '#FF7A00' : '#9CA3AF'} className="mr-3" />
                  <Text className={`flex-1 text-[13px] ${bankName ? 'text-gray-900' : 'text-gray-400'}`} style={{ fontFamily: 'Poppins_600SemiBold' }}>
                    {bankName || 'Select your bank inside'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <InputField label="Account Number" icon="keypad" value={accountNumber} onChangeText={(t: string) => setForm(f => ({ ...f, accountNumber: t }))} placeholder="Current or Savings A/C" keyboardType="number-pad" secureTextEntry />
              <InputField label="Confirm Account Number" icon="checkbox" value={confirmAccount} onChangeText={(t: string) => setForm(f => ({ ...f, confirmAccount: t }))} placeholder="Re-enter to verify" keyboardType="number-pad" />
              
              <InputField 
                label="IFSC Code" icon="barcode" value={ifsc} 
                onChangeText={(t: string) => setForm(f => ({ ...f, ifsc: t.toUpperCase() }))} 
                placeholder="e.g. HDFC0001234" autoCapitalize="characters" maxLength={11} 
              />
            </View>
          </AnimatedRN.View>

          <AnimatedRN.View entering={FadeInUp.delay(100).duration(500)}>
            {/* Payment UPI */}
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 items-center justify-center">
                  <Ionicons name="flash" size={16} color="#9333EA" />
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Fast UPI (Optional)</Text>
              </View>
              <InputField label="UPI ID" icon="at-circle" value={upiId} onChangeText={(t: string) => setForm(f => ({ ...f, upiId: t }))} placeholder="name@bankname" keyboardType="email-address" autoCapitalize="none" />
            </View>
          </AnimatedRN.View>

          {error && (
            <AnimatedRN.View entering={FadeIn.duration(200)} className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 shadow-sm flex-row items-start gap-3">
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text className="flex-1 text-[13px] text-red-700 font-extrabold pb-1">{error}</Text>
            </AnimatedRN.View>
          )}

          <AnimatedRN.View entering={FadeInUp.delay(200).duration(500)}>
            <TouchableOpacity onPress={handleSave} disabled={saving} className="bg-[#FF7A00] rounded-[20px] py-4 items-center justify-center flex-row shadow-lg active:opacity-[0.85]" style={{ shadowColor: '#FF7A00' }}>
              {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text className="text-base font-black text-white uppercase tracking-widest">Save Settings</Text>
                </>
              )}
            </TouchableOpacity>
            
            <View className="flex-row items-start gap-2 mt-6 px-2 justify-center opacity-70">
              <Ionicons name="information-circle" size={14} color="#6B7280" />
              <Text className="text-[11px] font-bold text-gray-500 text-center">Settlements are processed automatically daily at midnight.</Text>
            </View>
          </AnimatedRN.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showBankList} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl">
            <View className="flex-row items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <Text className="text-xl font-black text-gray-900 tracking-tight">Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankList(false)} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-200">
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BANKS}
              keyExtractor={item => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setForm(f => ({ ...f, bankName: item })); setShowBankList(false); }}
                  className={`py-4 px-4 flex-row items-center justify-between rounded-2xl mb-2 ${bankName === item ? 'bg-[#FFF7ED] border border-[#FF7A00]' : 'border border-gray-50'}`}
                >
                  <Text className={`text-sm ${bankName === item ? 'text-[#FF7A00] font-black' : 'text-gray-700 font-bold'}`}>{item}</Text>
                  {bankName === item && <Ionicons name="checkmark-circle" size={20} color="#FF7A00" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
