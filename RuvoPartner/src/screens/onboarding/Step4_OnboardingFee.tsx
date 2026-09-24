/**
 * Onboarding Step 4 — Onboarding Fee
 * Currently ₹0. Partner sees a confirmation card and proceeds.
 * Future: integrate Razorpay / payment gateway here.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Text, Animated,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import { partnerService } from '../../services/partnerService';
import {
  StepBar, ScreenHeader, SectionCard,
  CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

export const Step4_OnboardingFee = () => {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing, shadows } = useTheme();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeInfo, setFeeInfo] = useState<{
    feeAmount: number;
    isFree: boolean;
    remainingFreeSlots: number;
    message: string;
  }>({
    feeAmount: 0,
    isFree: true,
    remainingFreeSlots: 100,
    message: 'First 100 Delivery Partners get FREE onboarding!',
  });

  useEffect(() => {
    partnerService.getOnboardingFee()
      .then(data => {
        if (data.success) {
          setFeeInfo({
            feeAmount: data.feeAmount ?? 0,
            isFree: data.isFree ?? true,
            remainingFreeSlots: data.remainingFreeSlots ?? 0,
            message: data.message ?? '',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Pulse animation on the ₹0 badge
  const pulse = useRef(new Animated.Value(1)).current;
  const doPulse = () => {
    Animated.sequence([
      Animated.spring(pulse, { toValue: 1.06, useNativeDriver: true, speed: 40 }),
      Animated.spring(pulse, { toValue: 1,    useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const handleProceed = () => {
    if (!accepted) { setError('Please accept the terms to continue.'); return; }
    setError(null);
    navigation.navigate('Step5_BankAccount');
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={3} colors={colors} typography={typography} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            icon="cash-outline"
            title="Onboarding Fee"
            subtitle="One-time fee to activate your RuVo Delivery Partner account."
            colors={colors}
            typography={typography}
            onBack={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Step2_VehicleType');
            }}
          />

          {/* Fee highlight card */}
          <TouchableOpacity onPress={doPulse} activeOpacity={0.9}>
            <Animated.View
              style={[
                s.feeCard,
                {
                  backgroundColor: colors.primary,
                  borderRadius: RADIUS.card,
                  transform: [{ scale: pulse }],
                },
                shadows.md,
              ]}
            >
              <View style={[s.feeIconBox, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md }]}>
                <Ionicons name="pricetag-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2, marginTop: 16 }]}>
                ONBOARDING FEE
              </Text>
              <View style={s.feeAmountRow}>
                <Text style={[typography.headingXL, { color: '#FFFFFF', fontSize: 52, fontFamily: 'Poppins_800ExtraBold' }]}>
                  ₹{feeInfo.feeAmount}
                </Text>
                <View style={[s.freeBadge, { backgroundColor: feeInfo.isFree ? '#FFFFFF' : 'rgba(255,255,255,0.2)', borderRadius: RADIUS.pill }]}>
                  <Text style={[typography.caption, { color: feeInfo.isFree ? colors.primary : '#FFFFFF', fontFamily: 'Poppins_800ExtraBold', fontSize: 11 }]}>
                    {feeInfo.isFree ? 'FREE OFFER' : 'REGULAR'}
                  </Text>
                </View>
              </View>
              <Text style={[typography.body, { color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center', fontFamily: 'Poppins_600SemiBold' }]}>
                {feeInfo.message}
              </Text>
            </Animated.View>
          </TouchableOpacity>

          {/* What you get */}
          <SectionCard colors={colors} style={{ marginTop: 16 }}>
            <Text style={[typography.headingS, { color: colors.textPrimary, marginBottom: 14 }]}>
              What's included
            </Text>
            {BENEFITS.map(b => (
              <View key={b.text} style={s.benefitRow}>
                <View style={[s.benefitDot, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.pill }]}>
                  <Ionicons name={b.icon} size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontFamily: 'Poppins_600SemiBold' }]}>{b.title}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{b.text}</Text>
                </View>
              </View>
            ))}
          </SectionCard>

          {/* Note about pricing */}
          <InfoBox
            text={feeInfo.isFree
              ? `First 100 delivery partners get 100% FREE onboarding. ${feeInfo.remainingFreeSlots} slot(s) remaining!`
              : `Standard onboarding fee of ₹${feeInfo.feeAmount} applies for activation.`
            }
            variant={feeInfo.isFree ? 'success' : 'warning'}
            colors={colors}
            typography={typography}
          />

          {/* Accept checkbox */}
          <TouchableOpacity
            style={[s.checkRow, { backgroundColor: colors.card, borderColor: accepted ? colors.primary : colors.border, borderRadius: RADIUS.md }]}
            onPress={() => { setAccepted(a => !a); setError(null); }}
            activeOpacity={0.8}
          >
            <View style={[
              s.checkbox,
              {
                borderColor: accepted ? colors.primary : colors.border,
                backgroundColor: accepted ? colors.primary : 'transparent',
                borderRadius: RADIUS.xs,
              },
            ]}>
              {accepted && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, flex: 1, lineHeight: 20 }]}>
              I understand the onboarding fee is{' '}
              <Text style={{ color: colors.primary, fontFamily: 'Poppins_700Bold' }}>₹{feeInfo.feeAmount}</Text> and agree to the{' '}
              <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>RuVo Partner Terms & Conditions</Text>.
            </Text>
          </TouchableOpacity>

          <ErrorBox error={error} colors={colors} typography={typography} />

          <CtaBtn
            label="Accept & Continue"
            onPress={handleProceed}
            colors={colors}
            typography={typography}
            icon="arrow-forward"
          />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const BENEFITS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string }[] = [
  { icon: 'bicycle',            title: 'Delivery Access',    text: 'Accept deliveries from shops near you'          },
  { icon: 'wallet-outline',     title: 'Weekly Settlements', text: 'Earnings settled directly to your bank account'  },
  { icon: 'shield-checkmark',   title: 'Insurance Cover',    text: 'Basic delivery insurance during active orders'   },
  { icon: 'headset-outline',    title: '24/7 Support',       text: 'In-app help desk and partner support team'       },
];

const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 32 },
  feeCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  feeIconBox: {
    width: 56, height: 56,
    alignItems: 'center', justifyContent: 'center',
  },
  feeAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  freeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  benefitDot: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  checkbox: {
    width: 20, height: 20,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
});
