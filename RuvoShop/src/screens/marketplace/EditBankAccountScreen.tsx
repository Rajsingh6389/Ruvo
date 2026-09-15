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
    if (accountNumber.length < 9) return 'Enter a valid confirmAccount number (min 9 digits).';
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
<<<<<<< HEAD
      <SafeAreaView className="flex-1 bg-ruvo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#F4B400" />
        <Text className="text-sm text-warm-600 mt-4 font-medium">Securing bank details…</Text>
=======
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FF7A00" />
        <Text className="text-sm text-gray-500 mt-4 font-bold tracking-widest uppercase">Fetching Details...</Text>
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
      </SafeAreaView>
    );
  }

  // Common premium input class structure
  const inputClass = "bg-warm-50 border border-warm-200 rounded-[18px] px-4 py-[16px] text-[15px] font-semibold text-ruvo-ink";
  const labelClass = "text-[13px] font-extrabold text-ruvo-ink mb-2";

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* Header */}
<<<<<<< HEAD
      <View className="bg-ruvo-surface border-b border-warm-200 shadow-sm z-10 px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 bg-warm-50 rounded-[12px] border border-warm-200 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#171A1F" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-ruvo-ink tracking-tight">Bank Account</Text>
          <Text className="text-[12px] font-bold text-warm-600">Manage your settlement account</Text>
        </View>
        <View className="w-10 h-10 bg-green-50 rounded-[12px] border border-green-200 items-center justify-center">
          <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
<<<<<<< HEAD
        <ScrollView
          contentContainerClassName="px-4 pt-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          {saved && (
            <Animated.View style={{ opacity: fadeAnim }} className="bg-green-50 border border-green-300 rounded-[20px] p-4 mb-5 flex-row items-center gap-3">
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
              <Text className="flex-1 text-[14px] font-extrabold text-green-800">Bank details saved successfully!</Text>
            </Animated.View>
          )}

          {/* Trusted Security Banner */}
          <View className="mb-5 bg-warm-50 p-4 rounded-[20px] border border-warm-200 flex-row items-center gap-3">
             <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
               <Ionicons name="lock-closed" size={20} color="#16A34A" />
             </View>
             <View className="flex-1">
                <Text className="text-[13px] font-extrabold text-ruvo-ink">100% Secure Encrypted Data</Text>
                <Text className="text-[11px] font-semibold text-warm-600 mt-0.5 leading-[16px]">
                  Your credentials are safe and only used for your guaranteed weekly payouts.
                </Text>
             </View>
          </View>

          {/* Account Info Section */}
          <AnimatedRN.View entering={FadeInUp.duration(400)}>
            <View className="bg-ruvo-surface border border-warm-200 rounded-[24px] p-5 mb-5 shadow-sm">
              <Text className="text-[12px] font-black text-warm-500 uppercase tracking-widest mb-4 border-b border-warm-100 pb-3">Account Information</Text>

              <Text className={labelClass}>Account Holder Name *</Text>
              <TextInput value={accountHolder} onChangeText={setAccountHolder} placeholder="Name exactly as on bank statement" placeholderTextColor="#A79E92" className={`${inputClass} mb-4`} />

              <Text className={labelClass}>Bank Name *</Text>
              <TouchableOpacity
                onPress={() => setShowBankList(true)}
                className={`bg-warm-50 border border-warm-200 rounded-[18px] px-4 py-[16px] flex-row items-center justify-between mb-4`}
              >
                <Text className={`text-[15px] font-semibold ${bankName ? 'text-ruvo-ink' : 'text-warm-500'}`}>
                  {bankName || 'Tap to select your bank'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B5E52" />
              </TouchableOpacity>

              <Text className={labelClass}>Account Number *</Text>
              <TextInput value={accountNumber} onChangeText={setAccountNumber} placeholder="Enter account number" placeholderTextColor="#A79E92" keyboardType="number-pad" secureTextEntry className={`${inputClass} mb-4`} />

              <Text className={labelClass}>Confirm Account Number *</Text>
              <TextInput value={confirmAccount} onChangeText={setConfirmAccount} placeholder="Re-enter to confirm" placeholderTextColor="#A79E92" keyboardType="number-pad" className={`${inputClass} mb-4`} />

              <Text className={labelClass}>IFSC Code *</Text>
              <View className="relative justify-center mb-1">
                <TextInput
                  value={ifsc}
                  onChangeText={t => setIfsc(t.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  placeholderTextColor="#A79E92"
                  autoCapitalize="characters"
                  maxLength={11}
                  className={`${inputClass} font-mono uppercase tracking-wider mb-0`}
                />
              </View>
              <Text className="text-[11px] font-medium text-warm-500 ml-1 mb-4">You can find this on your cheque book.</Text>
            </View>
          </AnimatedRN.View>

          {/* UPI Section */}
          <AnimatedRN.View entering={FadeInUp.delay(100).duration(400)}>
            <View className="bg-ruvo-surface border border-warm-200 rounded-[24px] p-5 mb-5 shadow-sm">
              <Text className="text-[12px] font-black text-warm-500 uppercase tracking-widest mb-4 border-b border-warm-100 pb-3">UPI (Optional)</Text>
              
              <Text className={labelClass}>UPI ID</Text>
              <TextInput 
                 value={upiId} 
                 onChangeText={setUpiId} 
                 placeholder="yourname@bankname" 
                 placeholderTextColor="#A79E92" 
                 keyboardType="email-address" 
                 autoCapitalize="none" 
                 className={`${inputClass} mb-0`} 
              />
              <Text className="text-[11px] font-medium text-warm-500 ml-1 mt-2">Example: 9876543210@ybl, name@okhdfc</Text>
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
            </View>
          </AnimatedRN.View>

          {error && (
<<<<<<< HEAD
            <AnimatedRN.View entering={FadeIn.duration(200)} className="bg-red-50 border border-red-200 rounded-[16px] p-4 mb-5 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text className="flex-1 text-[13px] text-red-800 font-extrabold">{error}</Text>
            </AnimatedRN.View>
          )}

          {/* Save Button */}
          <AnimatedRN.View entering={FadeInUp.delay(200).duration(400)}>
             <TouchableOpacity 
               onPress={handleSave} 
               disabled={saving}
               activeOpacity={0.8}
               className={`w-full py-[16px] rounded-[18px] items-center justify-center flex-row gap-2 shadow-sm ${saving ? 'bg-warm-200' : 'bg-ruvo-yellow'}`}
             >
               {saving ? <ActivityIndicator color="#231C10" /> : (
                 <>
                   <Ionicons name="checkmark-circle" size={22} color="#231C10" />
                   <Text className="text-[16px] font-black text-ruvo-ink">Save Bank Account</Text>
                 </>
               )}
             </TouchableOpacity>
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
          </AnimatedRN.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showBankList} transparent animationType="slide">
<<<<<<< HEAD
        <View className="flex-1 bg-ruvo-ink/60 justify-end">
          <View className="bg-ruvo-surface rounded-t-[32px] overflow-hidden max-h-[85%]">
            <View className="p-5 border-b border-warm-100 flex-row items-center justify-between bg-ruvo-bg">
              <View>
                <Text className="text-xl font-black text-ruvo-ink">Select Bank</Text>
                <Text className="text-[11px] font-bold text-warm-600">Choose from top banks</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBankList(false)} className="w-10 h-10 bg-warm-100 rounded-full items-center justify-center">
                <Ionicons name="close" size={20} color="#171A1F" />
=======
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl">
            <View className="flex-row items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <Text className="text-xl font-black text-gray-900 tracking-tight">Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankList(false)} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-200">
                <Ionicons name="close" size={20} color="#374151" />
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
              </TouchableOpacity>
            </View>
            <FlatList
              data={BANKS}
              keyExtractor={item => item}
<<<<<<< HEAD
              contentContainerClassName="p-4 pt-2 pb-10"
              ItemSeparatorComponent={() => <View className="h-2" />}
              renderItem={({ item }) => {
                const selected = bankName === item;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { setBankName(item); setShowBankList(false); }}
                    className={`p-4 rounded-[16px] flex-row items-center justify-between border ${selected ? 'bg-ruvo-yellow/10 border-ruvo-yellow' : 'bg-ruvo-surface border-warm-100'}`}
                  >
                    <View className="flex-row items-center gap-3">
                       <View className={`w-8 h-8 rounded-full items-center justify-center ${selected ? 'bg-ruvo-yellow' : 'bg-warm-100'}`}>
                         <Ionicons name="business-outline" size={16} color={selected ? '#231C10' : '#8B8378'} />
                       </View>
                       <Text className={`text-[15px] ${selected ? 'font-black text-ruvo-ink' : 'font-bold text-warm-800'}`}>{item}</Text>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selected ? 'border-ruvo-yellow bg-ruvo-yellow' : 'border-warm-200'}`}>
                      {selected && <Ionicons name="checkmark" size={14} color="#231C10" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EditBankAccountScreen;
