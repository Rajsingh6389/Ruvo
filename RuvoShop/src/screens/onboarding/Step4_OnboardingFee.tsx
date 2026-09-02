/**
 * RuvoShop Onboarding — Step 4: Onboarding Fee
 * Currently ₹0. Shop owner sees a confirmation card and proceeds.
 * Future: integrate Razorpay / payment gateway here.
 */

import React, { useRef, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Text, Animated,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import {
  StepBar, ScreenHeader, SectionCard,
  CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

export const Step4_OnboardingFee = () => {
  const navigation = useNavigation<any>();
  const { setOnboardingStatus } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pulse animation on the ₹0 badge
  const pulse = useRef(new Animated.Value(1)).current;
  const doPulse = () => {
    Animated.sequence([
      Animated.spring(pulse, { toValue: 1.06, useNativeDriver: true, speed: 40 }),
      Animated.spring(pulse, { toValue: 1,    useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const handleProceed = async () => {
    if (!accepted) { setError('Please accept the terms to continue.'); return; }
    setError(null);
    await setOnboardingStatus('SHOP_SELECT_PENDING');
    navigation.navigate('Step4_Success');
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={4} colors={colors} typography={typography} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            icon="cash-outline"
            title="Onboarding Fee"
            subtitle="One-time fee to activate your RuVo Shop account."
            colors={colors}
            typography={typography}
            onBack={() => navigation.goBack()}
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
              <Text style={[typography.caption, { color: colors.onPrimary, opacity: 0.7, letterSpacing: 1.2, marginTop: 16 }]}>
                ONBOARDING FEE
              </Text>
              <View style={s.feeAmountRow}>
                <Text style={[typography.headingXL, { color: colors.onPrimary, fontSize: 52, fontWeight: '900' }]}>₹0</Text>
                <View style={[s.freeBadge, { backgroundColor: colors.onPrimary, borderRadius: RADIUS.pill }]}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '800', fontSize: 11 }]}>FREE</Text>
                </View>
              </View>
              <Text style={[typography.body, { color: colors.onPrimary, opacity: 0.75, marginTop: 6, textAlign: 'center' }]}>
                No charges to get started today
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
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{b.title}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{b.text}</Text>
                </View>
              </View>
            ))}
          </SectionCard>

          {/* Note about future pricing */}
          <InfoBox
            text="The onboarding fee is ₹0 right now. RuVo may introduce a nominal fee in the future — you will be notified well in advance."
            variant="warning"
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
              {accepted && <Ionicons name="checkmark" size={13} color={colors.onPrimary} />}
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, flex: 1, lineHeight: 20 }]}>
              I understand the onboarding fee is currently <Text style={{ color: colors.primary, fontWeight: '700' }}>₹0</Text> and agree to the <Text style={{ color: colors.primary, fontWeight: '600' }}>RuVo Shop Terms & Conditions</Text>.
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
  { icon: 'storefront',          title: 'Marketplace Listing', text: 'Your shop appears to all RuVo customers nearby'     },
  { icon: 'wallet-outline',      title: 'Weekly Settlements',  text: 'Earnings settled directly to your bank account'    },
  { icon: 'bicycle',             title: 'Delivery Partners',   text: 'Verified delivery partners handle every order'       },
  { icon: 'headset-outline',     title: '24/7 Support',        text: 'In-app help desk and dedicated shop support team'   },
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
