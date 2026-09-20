/**
 * EditBankAccountScreen - RuvoPartner (Premium Dark Bento UI)
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

import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Punjab National Bank', 'Kotak Mahindra Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'Other',
];

export const EditBankAccountScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();
  const partnerId = user?.partnerId;

  const [{ accountHolder, accountNumber, confirmAccount, ifsc, bankName }, setForm] = useState({
    accountHolder: '', accountNumber: '', confirmAccount: '', ifsc: '', bankName: ''
  });

  const [activeBankAccountMasked, setActiveBankAccountMasked] = useState<string | null>(null);
  
  const [showBankList, setShowBankList] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load existing bank status
  useEffect(() => {
    const load = async () => {
      if (!token || !partnerId) { setFetching(false); return; }
      try {
        const res = await fetch(`${API_BASE_URL}/api/partner/razorpay/bank/status?partnerId=${partnerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.data) {
            const bankData = data.data;
            setActiveBankAccountMasked(bankData.activeBankAccountMasked !== 'None' ? bankData.activeBankAccountMasked : null);
            setForm(s => ({
              ...s,
              accountHolder: bankData.activeBeneficiaryName !== 'None' ? bankData.activeBeneficiaryName : '',
              ifsc: bankData.activeIfsc !== 'None' ? bankData.activeIfsc : ''
            }));
          }
        }
      } catch {} finally {
        setFetching(false);
      }
    };
    load();
  }, [token, partnerId]);

  const validate = (): string | null => {
    if (!accountHolder.trim()) return 'Account holder name is required.';
    if (!bankName.trim()) return 'Please select your bank.';
    if (accountNumber.length < 9) return 'Enter a valid confirmAccount number (min 9 digits).';
    if (accountNumber !== confirmAccount) return 'Account numbers do not match.';
    if (!ifsc.trim().match(/^[A-Z]{4}0[A-Z0-9]{6}$/i)) return 'Enter a valid 11-character IFSC code.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      if (!partnerId) throw new Error("Partner ID not found.");
      
      const res = await fetch(`${API_BASE_URL}/api/partner/razorpay/bank/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          partnerId: partnerId,
          accountNumber: accountNumber.trim(),
          ifscCode: ifsc.trim().toUpperCase(),
          beneficiaryName: accountHolder.trim(),
          bankName: bankName.trim(),
          confirmChange: true,
        }),
      });

      if (res.ok) {
        setSaved(true);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        setTimeout(() => navigation.goBack(), 1800);
      } else {
        const raw = await res.text();
        try {
          const json = JSON.parse(raw);
          throw new Error(json.message || `Error ${res.status}`);
        } catch(e: any) {
          throw new Error(e.message || raw || `Error ${res.status}`);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not save bank details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-ink items-center justify-center">
        <ActivityIndicator size="large" color="#FF7A00" />
        <Text className="text-sm text-gray-400 mt-4 font-bold tracking-widest uppercase">Securing bank details…</Text>
      </SafeAreaView>
    );
  }

  // Common premium dark input class structure
  const inputClass = "bg-[#1C2026] border border-gray-800 rounded-[18px] px-4 py-[16px] text-[15px] font-black text-white shadow-lg shadow-black/40 tracking-wider";
  const labelClass = "text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1";

  return (
    <SafeAreaView className="flex-1 bg-ruvo-ink" edges={['top']}>
      {/* Decorative Glow Elements */}
      <View className="absolute top-0 right-[-100px] w-64 h-64 bg-[#10B981]/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Header */}
      <View className="bg-ruvo-ink border-b border-gray-800 px-4 py-4 z-10 flex-row items-center gap-4">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 bg-[#1C2026] rounded-2xl border border-gray-800 items-center justify-center shadow-lg shadow-black/40"
        >
          <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-white tracking-tight">Bank Details</Text>
          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage Payout Settlement</Text>
        </View>
        <View className="w-10 h-10 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 items-center justify-center shadow-lg shadow-black/40">
          <Ionicons name="shield-checkmark" size={18} color="#10B981" />
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="px-6 pt-6 pb-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          {saved && (
            <Animated.View style={{ opacity: fadeAnim }} className="bg-emerald-500/10 border border-emerald-500/30 rounded-[20px] p-4 mb-6 flex-row items-center gap-3 shadow-lg shadow-black/40">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text className="flex-1 text-[13px] font-black text-emerald-400 tracking-wide">Bank details saved successfully!</Text>
            </Animated.View>
          )}

          {/* Trusted Security Banner */}
          <View className="mb-8 bg-[#1C2026] p-4 rounded-[24px] border border-gray-800 flex-row items-center gap-4 shadow-lg shadow-black/40">
             <View className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-[18px] items-center justify-center">
               <Ionicons name="lock-closed" size={22} color="#10B981" />
             </View>
             <View className="flex-1">
                <Text className="text-[13px] font-black text-white tracking-wider">Secure Bank Update</Text>
                <Text className="text-[10px] font-bold text-gray-500 mt-1 leading-4 uppercase tracking-widest">
                  Any mismatch will pause payments.
                </Text>
             </View>
          </View>

          {/* Account Info Section */}
          <AnimatedRN.View entering={FadeInUp.duration(400)}>
            <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">
               Beneficiary Details
            </Text>
            <View className="bg-ruvo-ink pt-2 pb-8 rounded-[24px]">
              
              <Text className={labelClass}>Account Holder Name (As per Bank)</Text>
              <TextInput 
                 value={accountHolder} 
                 onChangeText={t => setForm(s => ({ ...s, accountHolder: t }))} 
                 placeholder="Enter full name" 
                 placeholderTextColor="#4B5563" 
                 className={`${inputClass} mb-6`} 
              />

              <Text className={labelClass}>Bank Name</Text>
              <TouchableOpacity
                onPress={() => setShowBankList(true)}
                activeOpacity={0.8}
                className={`${inputClass} flex-row items-center justify-between mb-6`}
              >
                <Text className={`text-[15px] font-black ${bankName ? 'text-white' : 'text-gray-500'}`}>
                  {bankName || 'Tap to select your bank'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#4B5563" />
              </TouchableOpacity>

              <Text className={labelClass}>Account Number</Text>
              <TextInput 
                 value={accountNumber} 
                 onChangeText={t => setForm(s => ({ ...s, accountNumber: t }))} 
                 placeholder={activeBankAccountMasked ? `Current: ${activeBankAccountMasked}` : "Enter account number"} 
                 placeholderTextColor="#4B5563" 
                 keyboardType="number-pad" 
                 secureTextEntry={false} 
                 className={`${inputClass} mb-6`} 
              />

              <Text className={labelClass}>Confirm Account Number</Text>
              <TextInput 
                 value={confirmAccount} 
                 onChangeText={t => setForm(s => ({ ...s, confirmAccount: t }))} 
                 placeholder="Re-enter to confirm" 
                 placeholderTextColor="#4B5563" 
                 keyboardType="number-pad" 
                 className={`${inputClass} mb-6`} 
              />

              <Text className={labelClass}>Bank IFSC Code</Text>
              <TextInput
                value={ifsc}
                onChangeText={t => setForm(s => ({ ...s, ifsc: t.toUpperCase() }))}
                placeholder="e.g. HDFC0001234"
                placeholderTextColor="#4B5563"
                autoCapitalize="characters"
                maxLength={11}
                className={`${inputClass} font-mono uppercase tracking-widest mb-2`}
              />
              <Text className="text-[10px] font-bold text-gray-500 ml-2 uppercase tracking-wide">You can find this on your checkbook.</Text>
            </View>
          </AnimatedRN.View>

          {error && (
            <AnimatedRN.View entering={FadeIn.duration(200)} className="bg-red-500/10 border border-red-500/30 rounded-[18px] p-4 mb-6 flex-row items-center gap-3">
              <Ionicons name="alert-circle" size={22} color="#EF4444" />
              <Text className="flex-1 text-[12px] text-red-500 font-bold">{error}</Text>
            </AnimatedRN.View>
          )}

          {/* Save Button */}
          <AnimatedRN.View entering={FadeInUp.delay(200).duration(400)}>
             <TouchableOpacity 
               onPress={handleSave} 
               disabled={saving}
               activeOpacity={0.85}
               className={`w-full py-[18px] rounded-[22px] items-center justify-center flex-row gap-2 shadow-lg shadow-black/80 ${saving ? 'bg-gray-800' : 'bg-emerald-500'}`}
             >
               {saving ? <ActivityIndicator color="#FFF" /> : (
                 <>
                   <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                   <Text className="text-[15px] font-black text-white tracking-widest uppercase">Update Bank Account</Text>
                 </>
               )}
             </TouchableOpacity>
          </AnimatedRN.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showBankList} transparent animationType="slide">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-ruvo-ink rounded-t-[36px] overflow-hidden max-h-[85%] border-t border-gray-800">
            <View className="p-6 border-b border-gray-800 flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-black text-white tracking-tight">Select Bank</Text>
                <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Top Indian Banks</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowBankList(false)} 
                className="w-10 h-10 bg-[#1C2026] rounded-2xl border border-gray-800 items-center justify-center shadow-lg shadow-black/40"
              >
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BANKS}
              keyExtractor={item => item}
              contentContainerClassName="p-4 pt-4 pb-12"
              ItemSeparatorComponent={() => <View className="h-3" />}
              renderItem={({ item }) => {
                const selected = bankName === item;
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setForm(s => ({ ...s, bankName: item })); setShowBankList(false); }}
                    className={`p-4 rounded-[22px] flex-row items-center justify-between border ${selected ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-black/40' : 'bg-[#1C2026] border-gray-800'}`}
                  >
                    <View className="flex-row items-center gap-4">
                       <View className={`w-10 h-10 rounded-2xl items-center justify-center ${selected ? 'bg-emerald-500/20' : 'bg-gray-800/50'}`}>
                         <Ionicons name="business-outline" size={18} color={selected ? '#10B981' : '#9CA3AF'} />
                       </View>
                       <Text className={`text-[14px] ${selected ? 'font-black text-emerald-400' : 'font-black text-gray-300'}`}>{item}</Text>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-700'}`}>
                      {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EditBankAccountScreen;
