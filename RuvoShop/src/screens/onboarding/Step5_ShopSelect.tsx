/**
 * RuvoShop Onboarding — Step 5: Confirm Shop Visibility
 * Shop owners see that nearby delivery partners will serve their shop.
 * They cannot choose specific partners — instead, delivery partners
 * choose which shops they want to serve from the Partner app.
 * This step just confirms the setup is complete and routes to the main app.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Text, Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import {
  StepBar, ScreenHeader, SectionCard,
  CtaBtn, InfoBox,
} from './OnboardingShared';

const HOW_IT_WORKS = [
  {
    num: '1',
    title: 'Customer orders from your shop',
    desc: 'RuVo customers in your area browse and order from your shop listing.',
    icon: 'phone-portrait-outline' as const,
  },
  {
    num: '2',
    title: 'Delivery partners are notified',
    desc: 'Partners who have selected your shop in their partner app receive the order alert.',
    icon: 'notifications-outline' as const,
  },
  {
    num: '3',
    title: 'Partner picks up & delivers',
    desc: 'The nearest available partner picks up the order and delivers it to the customer.',
    icon: 'bicycle-outline' as const,
  },
  {
    num: '4',
    title: 'You get paid',
    desc: 'Earnings are settled to your bank account every week.',
    icon: 'wallet-outline' as const,
  },
];

export const Step5_ShopSelect = () => {
  const navigation = useNavigation<any>();
  const { setOnboardingStatus } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleFinish = async () => {
    await setOnboardingStatus('PENDING_APPROVAL');
    navigation.navigate('Step4_Success');
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={5} colors={colors} typography={typography} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          icon="business-outline"
          title="Almost Done!"
          subtitle="Your shop will be visible to nearby delivery partners on RuVo."
          colors={colors}
          typography={typography}
          onBack={() => navigation.goBack()}
        />

        {/* Partner coverage visual */}
        <Animated.View style={{ opacity: fade }}>
          <View style={[s.coverageCard, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.card }]}>
            <View style={[s.coverageIcon, { backgroundColor: colors.primary, borderRadius: RADIUS.pill }]}>
              <Ionicons name="location" size={32} color="#FFFFFF" />
            </View>
            <Text style={[typography.headingM, { color: colors.primary, marginTop: 14, textAlign: 'center' }]}>
              Visible to All Nearby Partners
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }]}>
              Delivery partners in your city who choose to serve your shop category will automatically see your orders.
            </Text>
          </View>
        </Animated.View>

        {/* How it works */}
        <SectionCard colors={colors} style={{ marginTop: 16 }}>
          <Text style={[typography.headingS, { color: colors.textPrimary, marginBottom: 14 }]}>
            How deliveries work
          </Text>
          {HOW_IT_WORKS.map((item) => (
            <View key={item.num} style={s.stepRow}>
              <View style={[s.stepNumBadge, { backgroundColor: colors.primary, borderRadius: RADIUS.pill }]}>
                <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: '800' }]}>{item.num}</Text>
              </View>
              <View style={[s.stepIcon, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.sm }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>{item.title}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, lineHeight: 16 }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </SectionCard>

        <InfoBox
          text="Delivery partners choose which shops they serve. More partners = faster deliveries for your customers."
          variant="info"
          colors={colors}
          typography={typography}
        />

        <CtaBtn
          label="Open My Shop 🎉"
          onPress={handleFinish}
          colors={colors}
          typography={typography}
          icon="storefront-outline"
        />
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 32 },
  coverageCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  coverageIcon: {
    width: 68, height: 68,
    alignItems: 'center', justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  stepNumBadge: {
    width: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  stepIcon: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
});
