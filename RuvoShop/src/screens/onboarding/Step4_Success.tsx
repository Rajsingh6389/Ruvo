/**
 * Onboarding Step 4 — Submitted: Awaiting Admin Approval
 * Shop registration is pending admin review.
 * Polls /api/shops/mine every 10s to detect approval.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import { API_BASE_URL } from '../../config/api';
import { CtaBtn, InfoBox } from './OnboardingShared';

export const Step4_Success = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, userId, user, setOnboardingStatus } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const shopName = route.params?.shopName || (user as any)?.shopName || 'Your Shop';
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [checking, setChecking] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);
  const [ownedShops, setOwnedShops] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const spinAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const checkApproval = useCallback(async () => {
    setChecking(true);
    setStatusMessage(null);
    const ownerIdParam = userId || (user as any)?.phone || 'owner_default';
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerIdParam)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const message = await res.text().catch(() => '');
        setStatusMessage(message || 'Could not check approval status.');
        return;
      }
      const data = await res.json();
      const shops: any[] = (Array.isArray(data) ? data : [data]).filter(Boolean);
      setOwnedShops(shops);
      const approved = shops.find(s => s.approved === true || s.isApproved === true || s.status === 'APPROVED');
      const rejected = shops.find(s => s.status === 'REJECTED');
      if (approved) {
        setApprovalStatus('approved');
        await setOnboardingStatus('APPROVED');
      } else if (rejected) {
        setApprovalStatus('rejected');
      } else if (shops.length === 0) {
        setStatusMessage('No shop request found for this account. Please submit your shop details again.');
      } else {
        setStatusMessage('Your shop request is still waiting for admin approval.');
      }
    } catch {
      setStatusMessage('Network error while checking approval status.');
    }
    finally { setChecking(false); }
  }, [token, userId, user, setOnboardingStatus]);

  useEffect(() => {
    checkApproval();
    const interval = setInterval(checkApproval, 10000);
    return () => clearInterval(interval);
  }, [checkApproval]);

  const handleGoToDashboard = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MyShops' }] });
  };

  const latestShop = ownedShops[0];

  const requestAdminReviewAgain = async () => {
    if (!latestShop?.id) {
      setStatusMessage('No shop request found. Please edit and submit your shop details again.');
      return;
    }

    setRequestingReview(true);
    setStatusMessage(null);
    const ownerIdParam = userId || (user as any)?.phone || 'owner_default';

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/shops/${latestShop.id}/request-approval?ownerId=${encodeURIComponent(ownerIdParam)}`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!res.ok) {
        const message = await res.text().catch(() => '');
        throw new Error(message || 'Could not request admin review again.');
      }

      const updatedShop = await res.json().catch(() => latestShop);
      setOwnedShops(prev => prev.length > 0 ? [updatedShop, ...prev.slice(1)] : [updatedShop]);
      setApprovalStatus(updatedShop?.approved ? 'approved' : 'pending');
      setStatusMessage(
        updatedShop?.approved
          ? 'Your shop is already approved.'
          : 'Admin review requested again. Ask admin to refresh approvals.',
      );
      await setOnboardingStatus(updatedShop?.approved ? 'APPROVED' : 'PENDING_APPROVAL');
    } catch (e: any) {
      setStatusMessage(e?.message || 'Could not request admin review again.');
    } finally {
      setRequestingReview(false);
    }
  };

  const editAndSubmitAgain = async () => {
    await setOnboardingStatus('NEW');
    navigation.navigate('Step1_ShopDetails');
  };

  const STEPS = [
    { icon: 'document-text-outline'    as const, label: 'Shop Details Submitted',  done: true },
    { icon: 'id-card-outline'          as const, label: 'Aadhaar Verified',         done: true },
    { icon: 'wallet-outline'           as const, label: 'Bank Account Added',       done: true },
    { icon: 'shield-checkmark-outline' as const, label: 'Admin Approval',           done: approvalStatus === 'approved' },
  ];

  const isApproved = approvalStatus === 'approved';
  const isRejected = approvalStatus === 'rejected';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Status Icon */}
          <View style={s.iconCentre}>
            <Animated.View style={[
              s.pulseRing,
              { borderColor: isApproved ? colors.success : isRejected ? colors.error : '#F59E0B', transform: [{ scale: pulseAnim }] },
            ]} />
            <View style={[s.iconBg, { backgroundColor: isApproved ? colors.successSoft : isRejected ? '#FEE2E2' : '#FEF3C7' }]}>
              {isApproved ? (
                <Ionicons name="checkmark-circle" size={68} color={colors.success} />
              ) : isRejected ? (
                <Ionicons name="close-circle" size={68} color={colors.error} />
              ) : (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="time-outline" size={68} color="#D97706" />
                </Animated.View>
              )}
            </View>
          </View>

          {/* Heading */}
          <Text style={[typography.headingXL, { color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }]}>
            {isApproved ? 'Shop Approved! 🎉' : isRejected ? 'Application Rejected' : 'Submitted — Under Review'}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 }]}>
            {isApproved
              ? `Your shop "${shopName}" has been approved and is now live on RuVo!`
              : isRejected
              ? `Your application for "${shopName}" was not approved. Contact support@ruvo.in for help.`
              : `Your shop "${shopName}" has been submitted. Our team reviews applications within 24 hours. You'll be notified once approved.`}
          </Text>

          {/* Progress Checklist */}
          <View style={[s.progressCard, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.lg }]}>
            <Text style={[typography.headingS, { color: colors.textPrimary, marginBottom: 12 }]}>Registration Progress</Text>
            {STEPS.map((step, i) => (
              <View
                key={i}
                style={[
                  s.stepRow,
                  i < STEPS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={[
                  s.stepDot,
                  { backgroundColor: step.done ? colors.successSoft : colors.surfaceSunken, borderColor: step.done ? colors.success : colors.border },
                ]}>
                  <Ionicons
                    name={step.done ? 'checkmark' : step.icon}
                    size={15}
                    color={step.done ? colors.success : colors.textHint}
                  />
                </View>
                <Text style={[typography.body, { color: step.done ? colors.textPrimary : colors.textSecondary, flex: 1 }]}>
                  {step.label}
                </Text>
                {i === STEPS.length - 1 && approvalStatus === 'pending' && (
                  <View style={s.pendingChip}>
                    <Text style={{ color: '#92400E', fontSize: 10, fontWeight: '700' }}>PENDING</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {approvalStatus === 'pending' && (
            <InfoBox
              text="We check for approval automatically every 10 seconds. You may close this screen — your application is saved."
              variant="info"
              colors={colors}
              typography={typography}
            />
          )}
          {statusMessage && (
            <InfoBox
              text={statusMessage}
              variant={statusMessage.toLowerCase().includes('could not') || statusMessage.toLowerCase().includes('error') ? 'warning' : 'info'}
              colors={colors}
              typography={typography}
            />
          )}
          {isRejected && (
            <InfoBox
              text="Contact support@ruvo.in with your registered phone number to appeal or re-apply."
              variant="warning"
              colors={colors}
              typography={typography}
            />
          )}
        </Animated.View>
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[s.ctaSection, { backgroundColor: colors.background, paddingHorizontal: spacing.gutter }]}>
        {isApproved ? (
          <CtaBtn
            label="Go to Dashboard"
            onPress={handleGoToDashboard}
            colors={colors}
            typography={typography}
            icon="storefront-outline"
          />
        ) : (
          <>
            <TouchableOpacity
              style={[s.refreshBtn, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.sm }]}
              onPress={checkApproval}
              disabled={checking}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              <Text style={[typography.body, { color: colors.primary, fontWeight: '700', marginLeft: 8 }]}>
                {checking ? 'Checking…' : 'Check Approval Status'}
              </Text>
            </TouchableOpacity>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 6 }]}>
              Auto-refreshes every 10 seconds
            </Text>
          </>
        )}
        <View style={{ height: 20 }} />
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:     { flex: 1 },
  scroll:   { paddingTop: 24, paddingBottom: 24, flexGrow: 1 },
  iconCentre: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2,
    opacity: 0.35,
  },
  iconBg: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  progressCard: {
    padding: 16,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
  },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  pendingChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  ctaSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
