/**
 * EditBankAccountScreen - RuvoPartner (Premium Dark Bento UI)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, Animated, TextInput, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AnimatedRN, { FadeInUp, FadeIn } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Punjab National Bank', 'Kotak Mahindra Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'Other',
];

export const EditBankAccountScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();
  const { colors, typography, shadows, spacing, theme } = useTheme();
  const isDark = theme === 'dark';
  const partnerId = user?.partnerId || user?.userId; // Fallback

  const [{ accountHolder, accountNumber, confirmAccount, ifsc, bankName }, setForm] = useState({
    accountHolder: '', accountNumber: '', confirmAccount: '', ifsc: '', bankName: ''
  });

  const [activeBankAccountMasked, setActiveBankAccountMasked] = useState<string | null>(null);
  const [pendingBankAccountMasked, setPendingBankAccountMasked] = useState<string | null>(null);
  
  const [showBankList, setShowBankList] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
            const activeMask = bankData.activeBankAccountMasked !== 'None' ? bankData.activeBankAccountMasked : null;
            const pendingMask = bankData.pendingBankAccountMasked !== 'None' && bankData.pendingBankAccountMasked ? bankData.pendingBankAccountMasked : null;
            
            setActiveBankAccountMasked(activeMask);
            setPendingBankAccountMasked(pendingMask);
            
            // If they have an active or pending account, start in view mode
            if (activeMask || pendingMask) {
               setIsEditing(false);
            } else {
               setIsEditing(true);
            }

            setForm(s => ({
              ...s,
              accountHolder: bankData.activeBeneficiaryName !== 'None' ? bankData.activeBeneficiaryName : '',
              ifsc: bankData.activeIfsc !== 'None' ? bankData.activeIfsc : ''
            }));
          }
        }
      } catch (e) {
          setIsEditing(true);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [token, partnerId]);

  const validate = (): string | null => {
    if (!accountHolder.trim()) return 'Account holder name is required.';
    if (!bankName.trim()) return 'Please select your bank.';
    if (accountNumber.length < 9) return 'Enter a valid account number (min 9 digits).';
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 16 }]}>Securing bank details…</Text>
      </SafeAreaView>
    );
  }

  // Common input styles based on theme
  const inputStyle = {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  };
  const inputLabelStyle = [typography.caption, { color: colors.textSecondary, fontFamily: 'Poppins_800ExtraBold', marginBottom: 8, marginLeft: 4 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ width: 40, height: 40, backgroundColor: colors.surfaceSunken, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderColor: colors.border, borderWidth: 1 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[typography.headingS, { color: colors.textPrimary }]}>Bank Details</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Manage Payout Settlement</Text>
        </View>
        <View style={{ width: 40, height: 40, backgroundColor: colors.successSoft, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Success Banner */}
          {saved && (
            <Animated.View style={{ opacity: fadeAnim, backgroundColor: colors.successSoft, borderColor: colors.success, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={[typography.body, { flex: 1, color: colors.success, fontFamily: 'Poppins_700Bold', marginLeft: 12 }]}>Bank details saved successfully!</Text>
            </Animated.View>
          )}

          {/* Display Current Bank Information */}
          {!isEditing && (
            <AnimatedRN.View entering={FadeInUp.duration(400)}>
               {activeBankAccountMasked && (
                 <View style={{ backgroundColor: colors.successSoft, borderColor: colors.success, borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ width: 48, height: 48, backgroundColor: colors.success, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                         <Ionicons name="business" size={24} color="#FFF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={[typography.caption, { color: colors.success, fontFamily: 'Poppins_800ExtraBold' }]}>Verified Bank Account</Text>
                      <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 4 }]}>{activeBankAccountMasked}</Text>
                    </View>
                 </View>
               )}
               {pendingBankAccountMasked && (
                 <View style={{ backgroundColor: colors.warningSoft, borderColor: colors.warning, borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Ionicons name="time" size={24} color={colors.warning} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[typography.caption, { color: colors.warning, fontFamily: 'Poppins_800ExtraBold' }]}>Account Under Review</Text>
                      <Text style={[typography.headingM, { color: colors.textPrimary, marginTop: 4 }]}>{pendingBankAccountMasked}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Verification by Razorpay is pending.</Text>
                    </View>
                 </View>
               )}
               
               <TouchableOpacity 
                 onPress={() => setIsEditing(true)}
                 activeOpacity={0.8}
                 style={{ backgroundColor: colors.surfaceSunken, paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: 8 }}
               >
                 <Text style={[typography.body, { color: colors.primary, fontFamily: 'Poppins_700Bold' }]}>{activeBankAccountMasked || pendingBankAccountMasked ? 'Change Bank Account' : 'Add Bank Account'}</Text>
               </TouchableOpacity>
            </AnimatedRN.View>
          )}

          {/* Edit Form */}
          {isEditing && (
            <AnimatedRN.View entering={FadeInUp.duration(400)}>
              {/* Trusted Security Banner moved to edit mode */}
              <View style={[shadows.md, { backgroundColor: colors.card, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', marginBottom: 24 }]}>
                 <View style={{ width: 48, height: 48, backgroundColor: colors.successSoft, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                   <Ionicons name="lock-closed" size={22} color={colors.success} />
                 </View>
                 <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[typography.body, { color: colors.textPrimary, fontFamily: 'Poppins_700Bold' }]}>Secure Bank Update</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Any mismatch will pause payments.</Text>
                 </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={inputLabelStyle}>Beneficiary Details</Text>
                {(activeBankAccountMasked || pendingBankAccountMasked) && (
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                <Text style={inputLabelStyle}>Account Holder Name (As per Bank)</Text>
                <TextInput 
                   value={accountHolder} 
                   onChangeText={t => setForm(s => ({ ...s, accountHolder: t }))} 
                   placeholder="Enter full name" 
                   placeholderTextColor={colors.textHint} 
                   style={[inputStyle, { marginBottom: 24 }]}
                />

                <Text style={inputLabelStyle}>Bank Name</Text>
                <TouchableOpacity
                  onPress={() => setShowBankList(true)}
                  activeOpacity={0.8}
                  style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }]}
                >
                  <Text style={[typography.body, { fontFamily: 'Poppins_700Bold', color: bankName ? colors.textPrimary : colors.textHint }]}>
                    {bankName || 'Tap to select your bank'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textHint} />
                </TouchableOpacity>

                <Text style={inputLabelStyle}>Account Number</Text>
                <TextInput 
                   value={accountNumber} 
                   onChangeText={t => setForm(s => ({ ...s, accountNumber: t }))} 
                   placeholder={activeBankAccountMasked ? `Current: ${activeBankAccountMasked}` : "Enter account number"} 
                   placeholderTextColor={colors.textHint} 
                   keyboardType="number-pad" 
                   style={[inputStyle, { marginBottom: 24 }]}
                />

                <Text style={inputLabelStyle}>Confirm Account Number</Text>
                <TextInput 
                   value={confirmAccount} 
                   onChangeText={t => setForm(s => ({ ...s, confirmAccount: t }))} 
                   placeholder="Re-enter to confirm" 
                   placeholderTextColor={colors.textHint} 
                   keyboardType="number-pad" 
                   style={[inputStyle, { marginBottom: 24 }]}
                />

                <Text style={inputLabelStyle}>Bank IFSC Code</Text>
                <TextInput
                  value={ifsc}
                  onChangeText={t => setForm(s => ({ ...s, ifsc: t.toUpperCase() }))}
                  placeholder="e.g. HDFC0001234"
                  placeholderTextColor={colors.textHint}
                  autoCapitalize="characters"
                  maxLength={11}
                  style={[inputStyle, { fontFamily: 'Courier', marginBottom: 8 }]}
                />
                <Text style={[typography.caption, { color: colors.textHint, marginLeft: 8 }]}>Find this on your checkbook.</Text>
              </View>

              {error && (
                <AnimatedRN.View entering={FadeIn.duration(200)} style={{ backgroundColor: colors.errorSoft, borderColor: colors.error, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 24, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={22} color={colors.error} />
                  <Text style={[typography.body, { color: colors.error, marginLeft: 12, flex: 1 }]}>{error}</Text>
                </AnimatedRN.View>
              )}

              {/* Save Button */}
              <TouchableOpacity 
                onPress={handleSave} 
                disabled={saving}
                activeOpacity={0.85}
                style={[shadows.md, { backgroundColor: saving ? colors.surfaceSunken : colors.success, paddingVertical: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 24 }]}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={[typography.body, { color: '#FFF', fontFamily: 'Poppins_800ExtraBold', marginLeft: 8 }]}>Update Bank Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </AnimatedRN.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showBankList} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, maxHeight: '85%' }}>
            <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[typography.headingS, { color: colors.textPrimary }]}>Select Bank</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Top Indian Banks</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBankList(false)} style={{ width: 40, height: 40, backgroundColor: colors.surfaceSunken, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BANKS}
              keyExtractor={item => item}
              contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              renderItem={({ item }) => {
                const selected = bankName === item;
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setForm(s => ({ ...s, bankName: item })); setShowBankList(false); }}
                    style={{ padding: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: selected ? colors.successSoft : colors.surfaceSunken, borderWidth: 1, borderColor: selected ? colors.success : colors.border }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                       <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.successSoft : colors.card }}>
                         <Ionicons name="business-outline" size={18} color={selected ? colors.success : colors.textSecondary} />
                       </View>
                       <Text style={[typography.body, { fontFamily: 'Poppins_700Bold', color: selected ? colors.success : colors.textPrimary, marginLeft: 16 }]}>{item}</Text>
                    </View>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderColor: selected ? colors.success : colors.border, backgroundColor: selected ? colors.success : 'transparent' }}>
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
