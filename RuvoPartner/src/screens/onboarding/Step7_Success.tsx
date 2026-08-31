/**
 * Step7_Success - RuvoPartner Onboarding (Redesigned)
 * Awaiting admin approval screen with premium UI.
 * All polling, approval check, and navigation logic preserved.
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
  { icon: 'person-outline'           as const, label: 'Basic Details Submitted' },
  { icon: 'car-outline'              as const, label: 'Vehicle Type Selected' },
  { icon: 'card-outline'             as const, label: 'Aadhaar Verified' },
  { icon: 'wallet-outline'           as const, label: 'Bank Account Added' },
  { icon: 'storefront-outline'       as const, label: 'Shops Selected' },
  { icon: 'shield-checkmark-outline' as const, label: 'Admin Approval' },
];

export const Step7_Success = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();

  const selectedShopCount = route.params?.selectedShopCount || 0;
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [checking, setChecking] = useState(false);

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
    if (!token) return;
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/partners/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const approved =
        data.status === 'APPROVED' || data.approved === true ||
        data.isApproved === true || data.verificationStatus === 'APPROVED';
      const rejected = data.status === 'REJECTED';
      if (approved) setApprovalStatus('approved');
      else if (rejected) setApprovalStatus('rejected');
    } catch {} finally {
      setChecking(false);
    }
  }, [token]);

  useEffect(() => {
    checkApproval();
    const interval = setInterval(checkApproval, 10000);
    return () => clearInterval(interval);
  }, [checkApproval]);

  const handleGoToDashboard = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const isApproved = approvalStatus === 'approved';
  const isRejected = approvalStatus === 'rejected';

  const statusColor = isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#F59E0B';
  const statusBg    = isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#FEF3C7';
  const statusIcon  = isApproved ? 'checkmark-circle' as const : isRejected ? 'close-circle' as const : 'time' as const;
  const statusTitle = isApproved ? 'Account Approved!' : isRejected ? 'Application Rejected' : 'Awaiting Approval';
  const statusMsg   = isApproved
    ? 'Your delivery partner account is ready. Start accepting runs and earn!'
    : isRejected
    ? 'Your application was not approved. Please contact support for assistance.'
    : 'Your registration has been submitted. Our team will review it shortly.';

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
                <Ionicons name={statusIcon} size={48} color={statusColor} />
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
                    backgroundColor: stepDone ? '#DCFCE7' : '#FEF3C7',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={stepDone ? 'checkmark' : 'time'} size={16} color={stepDone ? '#16A34A' : '#D97706'} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#231C10' }}>{step.label}</Text>
                  {isLast && !isApproved && checking && (
                    <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '600' }}>Checking…</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Info / Status Message */}
          {!isApproved && !isRejected && (
            <InfoBox
              message={`Registration submitted${selectedShopCount > 0 ? ` with ${selectedShopCount} shop(s) selected` : ''}. Auto-checking approval every 10 seconds.`}
              icon="information-circle-outline"
            />
          )}

          {/* Refresh button */}
          {!isApproved && (
            <TouchableOpacity
              onPress={checkApproval}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, paddingVertical: 12, marginBottom: 16,
              }}
            >
              <Ionicons name="refresh" size={16} color="#16A34A" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#16A34A' }}>
                {checking ? 'Checking…' : 'Check approval status'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Dashboard Button */}
          {isApproved && (
            <CtaBtn
              label="Go to Dashboard"
              onPress={handleGoToDashboard}
              icon="arrow-forward"
            />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};
