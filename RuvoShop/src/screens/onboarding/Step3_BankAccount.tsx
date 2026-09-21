/**
 * RuvoShop Onboarding — Step 3: Bank Account Details (DEMO)
 * Shop earnings are settled to this account.
 * Production: replace simulateVerify() with penny-drop / bank-validation API.
 */

import React, { useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Text, Animated,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getMyShops } from '../../services/shopService';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import {
  StepBar, ScreenHeader, SectionCard, FieldLabel,
  StyledInput, CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

type VerifyState = 'idle' | 'verifying' | 'review' | 'done' | 'error';

const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank',
  'Axis Bank', 'Punjab National Bank', 'Kotak Mahindra Bank',
  'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Other',
];

export const Step3_BankAccount = () => {
  const navigation = useNavigation<any>();
  const { setOnboardingStatus, userId, token } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc,           setIfsc]          = useState('');
  const [bankName,       setBankName]      = useState('');
  const [showBankList,   setShowBankList]  = useState(false);
  const [vState,         setVState]        = useState<VerifyState>('idle');
  const [error,          setError]         = useState<string | null>(null);
  const [focused,        setFocused]       = useState<string | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  let spinLoop: Animated.CompositeAnimation | null = null;

  const fld = (n: string) => ({
    focused: focused === n, colors, typography,
    onFocus: () => setFocused(n),
    onBlur:  () => setFocused(null),
  });

  const startSpinner = () => {
    spinAnim.setValue(0);
    spinLoop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    spinLoop.start();
  };
  const stopSpinner = () => spinLoop?.stop();
  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const validate = () => {
    if (!accountHolder.trim())            return 'Account holder name is required.';
    if (!bankName.trim())                 return 'Please select your bank.';
    if (accountNumber.length < 9)         return 'Enter a valid account number (min 9 digits).';
    if (accountNumber !== confirmAccount) return 'Account numbers do not match.';
    if (!ifsc.trim().match(/^[A-Z]{4}0[A-Z0-9]{6}$/i))
                                          return 'Enter a valid 11-character IFSC code.';
    return null;
  };

  const handleVerify = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setVState('verifying');
    startSpinner();
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    try {
      const shops = await getMyShops(userId!, token!);
      const myShop = shops?.[0];
      if (!myShop) throw new Error('No shop found. Please complete previous steps again.');

      let res = await fetch(`${API_BASE_URL}/api/seller/razorpay/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          shopId: myShop.id,
          legalBusinessName: myShop.name,
          email: myShop.email,
          phone: myShop.phone,
          ownerName: accountHolder,
          bankAccountNumber: accountNumber,
          ifscCode: ifsc,
          bankName: bankName,
        }),
      });



      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'Bank verification/registration failed.');

      let bankStatus = body.data?.bankStatus || 'UNDER_REVIEW';

      let attempts = 0;
      if (bankStatus === 'UNDER_REVIEW' || bankStatus === 'PENDING') {
         setVState('review');
         
         while ((bankStatus === 'UNDER_REVIEW' || bankStatus === 'PENDING') && attempts < 2) {
            attempts++;
            await new Promise(r => setTimeout(r, 4000));
            try {
               const pollRes = await fetch(`${API_BASE_URL}/api/seller/razorpay/bank/status?shopId=${myShop.id}`, { headers: { Authorization: `Bearer ${token}` } });
               const pollBody = await pollRes.json();
               if (pollRes.ok && pollBody.data) {
                  const activeMask = pollBody.data.activeBankAccountMasked;
                  if (activeMask && activeMask !== 'None') {
                     bankStatus = 'ACTIVE';
                  } else {
                     const pendingStatus = pollBody.data.pendingBankStatus;
                     if (pendingStatus && pendingStatus !== 'NONE') {
                        bankStatus = pendingStatus;
                     }
                  }
               }
            } catch (pollErr) {
               console.log("Polling error", pollErr);
            }
         }
      }

      if (bankStatus === 'FAILED' || bankStatus === 'REJECTED' || bankStatus === 'SUSPENDED') {
         throw new Error("Bank account was rejected. Status: " + bankStatus);
      }

      stopSpinner();
      if (bankStatus === 'ACTIVE') {
         setVState('done');
      } else {
         setVState('review');
      }
      
      // Advance to approval waiting screen
      await setOnboardingStatus('PENDING_APPROVAL');
      setTimeout(() => navigation.navigate('Step4_Success', { shopName: 'Your Shop' }), 2000);
    } catch (e: any) {
      stopSpinner();
      setVState('error');
      setError(e?.message || 'Bank verification failed. Please check details and try again.');
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={2} colors={colors} typography={typography} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter, flexGrow: 1, paddingBottom: 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            icon="wallet-outline"
            title="Bank Account"
            subtitle="Shop settlements will be deposited to this account every week."
            colors={colors} typography={typography}
            onBack={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Step1_ShopDetails');
            }}
          />

          <InfoBox
            text="Bank verification processes in real-time. Make sure details match."
            variant="warning"
            colors={colors} typography={typography}
          />

          {vState === 'done' ? (
            /* ── Success ── */
            <Animated.View style={[
              s.successCard,
              { backgroundColor: colors.successSoft, borderRadius: RADIUS.card, opacity: fadeAnim },
            ]}>
              <View style={[s.successIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" />
              </View>
              <Text style={[typography.headingM, { color: colors.success, marginTop: 14 }]}>
                Account Verified!
              </Text>
              <View style={[s.accountPill, { backgroundColor: colors.card, borderRadius: RADIUS.pill }]}>
                <Ionicons name="card-outline" size={14} color={colors.textHint} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {bankName}  ••••{accountNumber.slice(-4)}
                </Text>
              </View>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 10, textAlign: 'center' }]}>
                Bank account verified! Proceeding to onboarding fee…
              </Text>
            </Animated.View>
          ) : (
            <>
              {/* Account Holder + Bank */}
              <SectionCard colors={colors}>
                <FieldLabel text="Account Holder Name" required colors={colors} typography={typography} />
                <StyledInput
                  {...fld('holder')} iconLeft="person-outline"
                  placeholder="Name exactly as in bank records"
                  value={accountHolder}
                  onChangeText={t => { setAccountHolder(t); setError(null); }}
                  autoCapitalize="words"
                  style={{ marginBottom: 12 }}
                />

                <FieldLabel text="Bank Name" required colors={colors} typography={typography} />
                <TouchableOpacity
                  style={[
                    s.bankSelector,
                    {
                      backgroundColor: colors.surfaceSunken,
                      borderColor: focused === 'bank' ? colors.primary : colors.border,
                      borderRadius: RADIUS.input,
                    },
                  ]}
                  onPress={() => { setShowBankList(b => !b); setFocused('bank'); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="business-outline" size={18} color={bankName ? colors.primary : colors.textHint} />
                  <Text style={[
                    typography.body,
                    { flex: 1, color: bankName ? colors.textPrimary : colors.placeholder },
                  ]}>
                    {bankName || 'Select your bank'}
                  </Text>
                  <Ionicons
                    name={showBankList ? 'chevron-up' : 'chevron-down'}
                    size={18} color={colors.textHint}
                  />
                </TouchableOpacity>

                {showBankList && (
                  <View style={[
                    s.bankDropdown,
                    { backgroundColor: colors.card, borderColor: colors.border, borderRadius: RADIUS.md },
                    shadows.md,
                  ]}>
                    {BANKS.map(b => (
                      <TouchableOpacity
                        key={b}
                        style={[
                          s.bankOption,
                          { borderBottomColor: colors.divider },
                          bankName === b && { backgroundColor: colors.primarySoft },
                        ]}
                        onPress={() => { setBankName(b); setShowBankList(false); setError(null); }}
                      >
                        <Text style={[typography.body, { color: bankName === b ? colors.primary : colors.textPrimary }]}>
                          {b}
                        </Text>
                        {bankName === b && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </SectionCard>

              {/* Account number */}
              <SectionCard colors={colors}>
                <FieldLabel text="Account Number" required colors={colors} typography={typography} />
                <StyledInput
                  {...fld('acc')} iconLeft="card-outline"
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChangeText={t => { setAccountNumber(t.replace(/\D/g, '')); setError(null); }}
                  keyboardType="number-pad"
                  maxLength={18}
                  secureTextEntry={focused !== 'acc' && accountNumber.length > 0}
                  style={{ marginBottom: 12 }}
                />

                <FieldLabel text="Confirm Account Number" required colors={colors} typography={typography} />
                <StyledInput
                  {...fld('confirm')} iconLeft="card-outline"
                  placeholder="Re-enter account number"
                  value={confirmAccount}
                  onChangeText={t => { setConfirmAccount(t.replace(/\D/g, '')); setError(null); }}
                  keyboardType="number-pad"
                  maxLength={18}
                  style={{ marginBottom: 4 }}
                />

                {accountNumber.length > 0 && confirmAccount.length > 0 && (
                  <View style={[
                    s.matchBadge,
                    {
                      backgroundColor: accountNumber === confirmAccount ? colors.successSoft : colors.errorSoft,
                      borderRadius: RADIUS.xs,
                    },
                  ]}>
                    <Ionicons
                      name={accountNumber === confirmAccount ? 'checkmark-circle-outline' : 'close-circle-outline'}
                      size={13}
                      color={accountNumber === confirmAccount ? colors.success : colors.error}
                    />
                    <Text style={[
                      typography.caption,
                      { color: accountNumber === confirmAccount ? colors.success : colors.error },
                    ]}>
                      {accountNumber === confirmAccount ? 'Account numbers match' : 'Numbers do not match'}
                    </Text>
                  </View>
                )}
              </SectionCard>

              {/* IFSC */}
              <SectionCard colors={colors}>
                <FieldLabel text="IFSC Code" required colors={colors} typography={typography} />
                <StyledInput
                  {...fld('ifsc')} iconLeft="code-slash-outline"
                  placeholder="e.g. SBIN0001234"
                  value={ifsc}
                  onChangeText={t => { setIfsc(t.toUpperCase()); setError(null); }}
                  autoCapitalize="characters"
                  maxLength={11}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[typography.caption, { color: colors.textHint }]}>
                  11-character code printed on your cheque book or passbook.
                </Text>
              </SectionCard>
            </>
          )}

          {/* Verifying spinner */}
          {vState === 'verifying' && (
            <View style={[
              s.spinnerCard,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: RADIUS.card },
              shadows.md,
            ]}>
              <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                <Ionicons name="sync-outline" size={36} color={colors.primary} />
              </Animated.View>
              <Text style={[typography.headingS, { color: colors.textPrimary, marginTop: 12 }]}>
                Submitting bank details…
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
                Securely linking with Razorpay Route.
              </Text>
            </View>
          )}

          {/* Review Polling spinner */}
          {vState === 'review' && (
            <View style={[
              s.spinnerCard,
              { backgroundColor: colors.surfaceSunken, borderColor: colors.warning, borderWidth: 1, borderRadius: RADIUS.card },
              shadows.md,
            ]}>
              <Ionicons name="time-outline" size={42} color={colors.warning} />
              <Text style={[typography.headingS, { color: colors.warning, marginTop: 12, textAlign: 'center' }]}>
                Under Review
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
                Razorpay is verifying your account details. You can proceed in the meantime!
              </Text>
            </View>
          )}

          <ErrorBox error={error} colors={colors} typography={typography} />

          {vState !== 'done' && vState !== 'verifying' && vState !== 'review' && (
            <CtaBtn
              label="Verify & Open Shop"
              onPress={handleVerify}
              colors={colors} typography={typography}
              icon="storefront-outline"
            />
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 32 },
  bankSelector: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, height: 50, paddingHorizontal: 14, gap: 10,
    marginBottom: 4,
  },
  bankDropdown: {
    borderWidth: StyleSheet.hairlineWidth, marginTop: 4, marginBottom: 12, overflow: 'hidden',
  },
  bankOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 6,
  },
  successCard:  { alignItems: 'center', padding: 28, marginBottom: 16 },
  successIcon:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  accountPill:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 },
  spinnerCard:  { borderWidth: StyleSheet.hairlineWidth, padding: 28, alignItems: 'center', marginBottom: 16 },
});
