/**
 * Step4_Success - RuvoShop Onboarding (Redesigned)
 * Awaiting admin approval screen with premium UI.
 * All polling, request-review, and navigation logic preserved.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

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

  const shopName = route.params?.shopName || (user as any)?.shopName || 'Your Shop';
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [checking, setChecking] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);
  const [ownedShops, setOwnedShops] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
      if (approved) { setApprovalStatus('approved'); await setOnboardingStatus('APPROVED'); }
      else if (rejected) { setApprovalStatus('rejected'); }
      else if (shops.length === 0) { setStatusMessage('No shop request found. Please submit your shop details again.'); }
      else { setStatusMessage('Your shop request is still waiting for admin approval.'); }
    } catch {
      setStatusMessage('Network error while checking approval status.');
    } finally {
      setChecking(false);
    }
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
  const statusColor = isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#D97706';
  const statusBg    = isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#FEF3C7';
  const statusTitle = isApproved ? 'Shop Approved!' : isRejected ? 'Application Rejected' : 'Awaiting Approval';
  const statusMsg   = isApproved
    ? `${shopName} is live! You can now manage products and accept orders.`
    : isRejected
    ? 'Your application was not approved. Please contact support.'
    : `${shopName} has been submitted. Our team will review it within 24 hours.`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF8F2' }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Status Icon */}
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Animated.View style={{
              transform: [{ scale: pulseAnim }],
              width: 96, height: 96, borderRadius: 48,
              borderWidth: 2.5, borderColor: statusColor,
              backgroundColor: statusBg,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              {!isApproved && !isRejected ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={42} color={statusColor} />
                </Animated.View>
              ) : (
                <Ionicons name={isApproved ? 'checkmark-circle' : 'close-circle'} size={48} color={statusColor} />
              )}
            </Animated.View>

            <Text style={{ fontSize: 26, fontWeight: '800', color: '#231C10', textAlign: 'center', marginBottom: 8 }}>
              {statusTitle}
            </Text>
            <Text style={{ fontSize: 15, color: '#6B5E52', textAlign: 'center', lineHeight: 22, maxWidth: 300 }}>
              {statusMsg}
            </Text>
          </View>

          {/* Completion Summary */}
          <View style={{
            backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
            borderColor: '#EDE4D8', padding: 16, marginBottom: 16,
            shadowColor: '#2E2313', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#A79E92', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
              Registration Summary
            </Text>
            {STEPS_SUMMARY.map((step, idx) => {
              const isLast = idx === STEPS_SUMMARY.length - 1;
              const stepDone = isLast ? isApproved : true;
              return (
                <View key={step.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: idx < STEPS_SUMMARY.length - 1 ? 12 : 0 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: stepDone ? '#FEF9E6' : '#FEF3C7',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={stepDone ? 'checkmark' : 'time'} size={16} color={stepDone ? '#A07800' : '#D97706'} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#231C10' }}>{step.label}</Text>
                  {isLast && !isApproved && checking && (
                    <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '600' }}>Checking…</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Status message */}
          {statusMessage && (
            <InfoBox message={statusMessage} icon="information-circle-outline" />
          )}

          {/* Refresh */}
          {!isApproved && (
            <TouchableOpacity
              onPress={checkApproval}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginBottom: 8 }}
            >
              <Ionicons name="refresh" size={16} color="#A07800" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#A07800' }}>
                {checking ? 'Checking…' : 'Check approval status'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Action buttons */}
          {isApproved && (
            <CtaBtn label="Go to My Shops" onPress={handleGoToDashboard} icon="arrow-forward" />
          )}

          {!isApproved && !isRejected && (
            <TouchableOpacity
              onPress={requestAdminReviewAgain}
              disabled={requestingReview}
              style={{
                borderWidth: 1.5, borderColor: '#D1C7BA', borderRadius: 14,
                paddingVertical: 14, alignItems: 'center', marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#6B5E52' }}>
                {requestingReview ? 'Requesting…' : 'Request Admin Review Again'}
              </Text>
            </TouchableOpacity>
          )}

          {(isRejected || (!isApproved && !isRejected)) && (
            <TouchableOpacity
              onPress={editAndSubmitAgain}
              style={{ paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#A07800' }}>
                Edit & Submit Again
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};
