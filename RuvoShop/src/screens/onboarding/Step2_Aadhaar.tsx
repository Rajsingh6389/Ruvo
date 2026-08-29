/**
 * RuvoShop Onboarding — Step 2: Aadhaar Verification (DEMO)
 * Accepts Aadhaar + name, simulates a verification delay, then proceeds.
 * Production: replace simulateVerification() with UIDAI / Digilocker API.
 */

import React, { useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Text, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import {
  StepBar, ScreenHeader, SectionCard, FieldLabel,
  StyledInput, CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

type VerifyState = 'idle' | 'verifying' | 'done' | 'error';

export const Step2_Aadhaar = () => {
  const navigation = useNavigation<any>();
  const { setOnboardingStatus } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [aadhaar, setAadhaar]  = useState('');
  const [name,    setName]     = useState('');
  const [vState,  setVState]   = useState<VerifyState>('idle');
  const [error,   setError]    = useState<string | null>(null);
  const [focused, setFocused]  = useState<string | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  let   spinLoop: Animated.CompositeAnimation | null = null;

  const fld = (n: string) => ({
    focused: focused === n, colors, typography,
    onFocus: () => setFocused(n),
    onBlur:  () => setFocused(null),
  });

  const clean = aadhaar.replace(/\s/g, '');

  const formatAadhaar = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 12);
    return d.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' '),
    );
  };

  const startSpinner = () => {
    spinAnim.setValue(0);
    spinLoop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    spinLoop.start();
  };
  const stopSpinner = () => spinLoop?.stop();
  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const simulateVerification = () => new Promise<void>(r => setTimeout(r, 2200));

  const handleVerify = async () => {
    if (clean.length !== 12) { setError('Please enter a valid 12-digit Aadhaar number.'); return; }
    if (!name.trim())        { setError('Please enter the name as per Aadhaar.');         return; }
    setError(null);
    setVState('verifying');
    startSpinner();
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    try {
      await simulateVerification(); // ← replace with real API
      stopSpinner();
      setVState('done');
      await setOnboardingStatus('BANK_PENDING');
      setTimeout(() => navigation.navigate('Step3_BankAccount'), 1500);
    } catch {
      stopSpinner();
      setVState('error');
      setError('Aadhaar verification failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={2} colors={colors} typography={typography} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            icon="card-outline"
            title="Aadhaar Verification"
            subtitle="Your Aadhaar is used for identity verification only and is never stored in full."
            colors={colors} typography={typography}
            onBack={() => navigation.goBack()}
          />

          <InfoBox
            text="DEMO MODE — Aadhaar verification is simulated. Production will use the UIDAI / Digilocker API."
            variant="warning"
            colors={colors} typography={typography}
          />

          {vState === 'done' ? (
            /* ── Success card ── */
            <Animated.View style={[
              s.successCard,
              { backgroundColor: colors.successSoft, borderRadius: RADIUS.card, opacity: fadeAnim },
            ]}>
              <View style={[s.successIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" />
              </View>
              <Text style={[typography.headingM, { color: colors.success, marginTop: 14 }]}>
                Aadhaar Verified!
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                Identity confirmed. Proceeding to bank account setup…
              </Text>
            </Animated.View>
          ) : (
            <SectionCard colors={colors}>
              <FieldLabel text="Aadhaar Number" required colors={colors} typography={typography} />
              <StyledInput
                {...fld('aadhaar')} iconLeft="card-outline"
                placeholder="XXXX XXXX XXXX"
                value={aadhaar}
                onChangeText={t => { setAadhaar(formatAadhaar(t)); setError(null); }}
                keyboardType="number-pad"
                maxLength={14}
                style={{ marginBottom: 12, letterSpacing: 2 }}
              />

              <FieldLabel text="Name as on Aadhaar" required colors={colors} typography={typography} />
              <StyledInput
                {...fld('name')} iconLeft="person-outline"
                placeholder="Full name (as on Aadhaar card)"
                value={name}
                onChangeText={t => { setName(t); setError(null); }}
                autoCapitalize="words"
                style={{ marginBottom: 4 }}
              />

              <View style={[s.maskRow, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.xs }]}>
                <Ionicons name="eye-off-outline" size={13} color={colors.textHint} />
                <Text style={[typography.caption, { color: colors.textHint, flex: 1 }]}>
                  Your Aadhaar will be masked as XXXX XXXX {clean.slice(-4) || '????'} after verification.
                </Text>
              </View>
            </SectionCard>
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
                Verifying Aadhaar…
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
                This usually takes a few seconds.
              </Text>
            </View>
          )}

          <ErrorBox error={error} colors={colors} typography={typography} />

          {vState !== 'done' && vState !== 'verifying' && (
            <CtaBtn
              label="Verify Aadhaar"
              onPress={handleVerify}
              colors={colors} typography={typography}
              icon="shield-checkmark-outline"
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
  successCard:  { alignItems: 'center', padding: 28, marginBottom: 16 },
  successIcon:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  maskRow:      { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginTop: 8 },
  spinnerCard:  { borderWidth: 1, padding: 28, alignItems: 'center', marginBottom: 16 },
});
