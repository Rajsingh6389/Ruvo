/**
 * Step4_Success - RuvoShop Onboarding (Redesigned)
 * Awaiting admin approval screen with premium UI.
 * All polling, request-review, and navigation logic preserved.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { CtaBtn, InfoBox } from './OnboardingShared';

const STEPS_SUMMARY = [
  { icon: 'document-text-outline'    as const, label: 'Shop Details Submitted' },
  { icon: 'id-card-outline'          as const, label: 'Aadhaar Verified' },
  { icon: 'wallet-outline'           as const, label: 'Bank Account Added' },
  { icon: 'shield-checkmark-outline' as const, label: 'Admin Approval' },
];

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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const checkApproval = useCallback(async () => {
    setChecking(true);
    setStatusMessage(null);
    const ownerIdParam = userId || (user as any)?.phone || 'owner_default';
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerIdParam)}`, { headers });

      if (res.status === 401) {
        setStatusMessage('Session expired. Please log out and log in again.');
        return;
      }
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
        navigation.reset({ index: 0, routes: [{ name: 'MainDrawer' }] });
      }
      else if (rejected) { setApprovalStatus('rejected'); }
      else if (shops.length === 0) { 
        setApprovalStatus('rejected');
        setStatusMessage('Your shop application was rejected or deleted by the admin. Please edit your details and submit again.'); 
      }
      else { setStatusMessage('Your shop request is still waiting for admin approval.'); }
    } catch {
      setStatusMessage('Network error while checking approval status.');
    } finally {
      setChecking(false);
    }
  }, [token, userId, user, setOnboardingStatus, navigation]);

  useEffect(() => {
    checkApproval();
    const interval = setInterval(checkApproval, 10000);
    return () => clearInterval(interval);
  }, [checkApproval]);

  const handleGoToDashboard = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainDrawer' }] });
  };

  const latestShop = ownedShops[0];

  const requestAdminReviewAgain = async () => {
    if (!latestShop?.id) { setStatusMessage('No shop request found. Please edit and submit your shop details again.'); return; }
    setRequestingReview(true);
    setStatusMessage(null);
    const ownerIdParam = userId || (user as any)?.phone || 'owner_default';
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/shops/${latestShop.id}/request-approval?ownerId=${encodeURIComponent(ownerIdParam)}`,
        { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!res.ok) { const m = await res.text().catch(() => ''); throw new Error(m || 'Could not request review.'); }
      const updated = await res.json().catch(() => latestShop);
      setOwnedShops(prev => prev.length > 0 ? [updated, ...prev.slice(1)] : [updated]);
      setApprovalStatus(updated?.approved ? 'approved' : 'pending');
      setStatusMessage(updated?.approved ? 'Your shop is already approved.' : 'Admin review requested. Ask admin to refresh approvals.');
      await setOnboardingStatus(updated?.approved ? 'APPROVED' : 'PENDING_APPROVAL');
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

  const isApproved = approvalStatus === 'approved';
  const isRejected = approvalStatus === 'rejected';
  const statusColor = isApproved ? colors.success : isRejected ? colors.error : colors.primary;
  const statusBg    = isApproved ? colors.successSoft : isRejected ? colors.errorSoft : colors.primarySoft;
  const statusTitle = isApproved ? 'Shop Approved!' : isRejected ? 'Application Rejected' : 'Awaiting Approval';
  const statusMsg   = isApproved
    ? `${shopName} is live! You can now manage products and accept orders.`
    : isRejected
    ? 'Your application was not approved. Please contact support.'
    : `${shopName} has been submitted. Our team will review it within 24 hours.`;

  const themeGradient = [colors.background, colors.primarySoft, '#D1FAE5']; // Emerald light tones

  return (
    <LinearGradient
      colors={isApproved ? [colors.background, colors.successSoft] : isRejected ? [colors.background, colors.errorSoft] : ['#f0fdf4', '#dcfce7']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: floatAnim }] }}>
            {/* Status Icon */}
            <View style={{ alignItems: 'center', paddingVertical: 36 }}>
              <Animated.View style={{
                transform: [{ scale: pulseAnim }],
                width: 110, height: 110, borderRadius: 55,
                borderWidth: 3, borderColor: statusColor,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 24,
                shadowColor: statusColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12
              }}>
                {!isApproved && !isRejected ? (
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Ionicons name="sync" size={48} color={statusColor} />
                  </Animated.View>
                ) : (
                  <Ionicons name={isApproved ? 'checkmark-circle' : 'close-circle'} size={54} color={statusColor} />
                )}
              </Animated.View>

              <Text style={[typography.headingL, { color: colors.textPrimary, textAlign: 'center', marginBottom: 8, fontSize: 26 }]}>
                {statusTitle}
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: 320, fontSize: 15 }]}>
                {statusMsg}
              </Text>
            </View>

            {/* Completion Summary Card (Glassmorphic) */}
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.75)', borderRadius: 20, borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.8)', padding: 20, marginBottom: 20,
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
            }}>
              <Text style={[typography.caption, { color: colors.textHint, fontFamily: 'Poppins_700Bold', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16 }]}>
                Registration Tracker
              </Text>
              {STEPS_SUMMARY.map((step, idx) => {
                const isLast = idx === STEPS_SUMMARY.length - 1;
                const stepDone = isLast ? isApproved : true;
                return (
                  <View key={step.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: idx < STEPS_SUMMARY.length - 1 ? 14 : 0 }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: stepDone ? statusColor : colors.surfaceSunken,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name={stepDone ? 'checkmark' : 'time'} size={18} color={stepDone ? '#fff' : colors.textHint} />
                    </View>
                    <Text style={[typography.body, { flex: 1, fontFamily: 'Poppins_600SemiBold', color: colors.textPrimary, fontSize: 15 }]}>{step.label}</Text>
                    {isLast && !isApproved && checking && (
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="sync" size={16} color={colors.primary} />
                      </Animated.View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Status message */}
            {statusMessage && (
              <View style={{ marginBottom: 16 }}>
                <InfoBox text={statusMessage} variant={isRejected ? "warning" : "info"} colors={colors} typography={typography} />
              </View>
            )}

            {/* Refresh */}
            {!isApproved && (
              <TouchableOpacity
                onPress={checkApproval}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12 }}
              >
                <Animated.View style={checking ? { transform: [{ rotate: spin }] } : {}}>
                  <Ionicons name="refresh" size={18} color={colors.primary} />
                </Animated.View>
                <Text style={[typography.body, { color: colors.primary, fontFamily: 'Poppins_700Bold', fontSize: 15 }]}>
                  {checking ? 'Checking Status…' : 'Refresh Approval Status'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Action buttons */}
            {isApproved && (
              <CtaBtn label="Go to My Shops" onPress={handleGoToDashboard} colors={colors} typography={typography} icon="arrow-forward" />
            )}

            {!isApproved && !isRejected && (
              <TouchableOpacity
                onPress={requestAdminReviewAgain}
                disabled={requestingReview}
                style={{
                  backgroundColor: colors.primary, borderRadius: 16,
                  paddingVertical: 16, alignItems: 'center', marginTop: 4,
                  shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
                }}
              >
                <Text style={[typography.body, { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15 }]}>
                  {requestingReview ? 'Requesting…' : 'Notify Admin For Urgent Review'}
                </Text>
              </TouchableOpacity>
            )}

            {(isRejected || (!isApproved && !isRejected)) && (
              <TouchableOpacity
                onPress={editAndSubmitAgain}
                style={{ paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
              >
                <Text style={[typography.body, { color: colors.textSecondary, fontFamily: 'Poppins_700Bold' }]}>
                  Edit & Submit Again
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
