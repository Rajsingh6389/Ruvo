/**
 * Onboarding Step 2 — Vehicle Type & Details
 * Lets the partner pick vehicle type, enter reg number, model, capacity and fuel.
 * Posts to /api/partner/vehicle then navigates to Aadhaar step.
 */

import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import { API_BASE_URL } from '../../config/api';
import {
  StepBar, ScreenHeader, SectionCard, FieldLabel,
  StyledInput, CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

type VehicleType = 'Bike' | 'Scooter' | 'Auto' | 'Van' | 'Mini Truck';
type FuelType    = 'Petrol' | 'Diesel' | 'EV';

const VEHICLE_OPTIONS: { type: VehicleType; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { type: 'Bike',       icon: 'bicycle-outline',          label: 'Bike'       },
  { type: 'Scooter',    icon: 'bicycle-outline',          label: 'Scooter'    },
  { type: 'Auto',       icon: 'car-outline',              label: 'Auto'       },
  { type: 'Van',        icon: 'car-sport-outline',        label: 'Van'        },
  { type: 'Mini Truck', icon: 'cube-outline',             label: 'Mini Truck' },
];

const FUEL_OPTIONS: FuelType[] = ['Petrol', 'Diesel', 'EV'];

export const Step2_VehicleType = () => {
  const navigation = useNavigation<any>();
  const { token, setVerificationStatus } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [vehicleType,     setVehicleType]     = useState<VehicleType>('Bike');
  const [vehicleNumber,   setVehicleNumber]   = useState('');
  const [vehicleModel,    setVehicleModel]    = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [fuelType,        setFuelType]        = useState<FuelType>('Petrol');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [focused,         setFocused]         = useState<string | null>(null);

  const fld = (name: string) => ({
    focused: focused === name, colors, typography,
    onFocus: () => setFocused(name), onBlur: () => setFocused(null),
  });

  const handleNext = async () => {
    if (!vehicleNumber.trim()) { setError('Registration number is required.'); return; }
    if (!vehicleModel.trim())  { setError('Vehicle model is required.');  return; }
    if (!vehicleCapacity.trim()) { setError('Capacity is required.'); return; }
    if (!token) { setError('Session expired.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/vehicle`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body   : JSON.stringify({
          vehicleType,
          vehicleNumber   : vehicleNumber.trim().toUpperCase(),
          vehicleModel    : vehicleModel.trim(),
          vehicleCapacity : vehicleCapacity.trim(),
          fuelType,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      await setVerificationStatus(data?.data?.verificationStatus || 'NEW');
      navigation.navigate('Step3_Aadhaar');
    } catch (e: any) {
      setError(e.message || 'Submission failed.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={2} colors={colors} typography={typography} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ScreenHeader
            icon="bicycle-outline"
            title="Vehicle Details"
            subtitle="Register the vehicle you'll use for RuVo deliveries."
            colors={colors} typography={typography}
            onBack={() => navigation.goBack()}
          />

          {/* Vehicle type chips */}
          <SectionCard colors={colors}>
            <Text style={[typography.headingS, { color: colors.textPrimary, marginBottom: 12 }]}>Vehicle Type</Text>
            <View style={s.typeRow}>
              {VEHICLE_OPTIONS.map(opt => {
                const active = vehicleType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      s.typeCard,
                      {
                        backgroundColor : active ? colors.primarySoft : colors.surfaceSunken,
                        borderColor     : active ? colors.primary      : colors.border,
                        borderRadius    : RADIUS.md,
                      },
                      active && shadows.sm,
                    ]}
                    onPress={() => setVehicleType(opt.type)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon} size={26} color={active ? colors.primary : colors.textHint} />
                    <Text style={[typography.caption, { color: active ? colors.primary : colors.textSecondary, fontWeight: '700', marginTop: 6 }]}>
                      {opt.label}
                    </Text>
                    {active && (
                      <View style={[s.checkDot, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Vehicle details */}
          <SectionCard colors={colors}>
            <FieldLabel text="Registration Number" required colors={colors} typography={typography} />
            <StyledInput
              {...fld('reg')} iconLeft="document-text-outline"
              placeholder="DL 3C AB 1234"
              value={vehicleNumber}
              onChangeText={t => { setVehicleNumber(t); setError(null); }}
              autoCapitalize="characters"
              style={{ marginBottom: 12 }}
            />

            <FieldLabel text="Vehicle Model / Name" required colors={colors} typography={typography} />
            <StyledInput
              {...fld('model')} iconLeft="car-outline"
              placeholder="Hero Splendor / Honda Activa"
              value={vehicleModel}
              onChangeText={t => { setVehicleModel(t); setError(null); }}
              style={{ marginBottom: 12 }}
            />

            <FieldLabel text="Carrying Capacity (kg)" required colors={colors} typography={typography} />
            <StyledInput
              {...fld('cap')} iconLeft="speedometer-outline"
              placeholder="e.g. 50"
              value={vehicleCapacity}
              onChangeText={t => { setVehicleCapacity(t); setError(null); }}
              keyboardType="numeric"
              style={{ marginBottom: 12 }}
            />

            <FieldLabel text="Fuel Type" colors={colors} typography={typography} />
            <View style={s.fuelRow}>
              {FUEL_OPTIONS.map(fuel => {
                const active = fuelType === fuel;
                return (
                  <TouchableOpacity
                    key={fuel}
                    style={[
                      s.fuelBtn,
                      {
                        backgroundColor : active ? colors.primary      : colors.surfaceSunken,
                        borderColor     : active ? colors.primary      : colors.border,
                        borderRadius    : RADIUS.sm,
                      },
                    ]}
                    onPress={() => setFuelType(fuel)}
                  >
                    <Text style={[typography.caption, { color: active ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' }]}>
                      {fuel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          <InfoBox text="Ensure your vehicle documents are ready. You may be asked to upload RC and insurance during verification." colors={colors} typography={typography} />
          <ErrorBox error={error} colors={colors} typography={typography} />
          <CtaBtn label="Save & Continue" onPress={handleNext} loading={loading} colors={colors} typography={typography} icon="arrow-forward" />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { paddingBottom: 32 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    width: '30%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, position: 'relative',
  },
  checkDot: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  fuelRow: { flexDirection: 'row', gap: 8 },
  fuelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1.5 },
});
