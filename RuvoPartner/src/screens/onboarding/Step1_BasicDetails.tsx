/**
 * Onboarding Step 1 — Basic Details
 * Collects full name, DOB, and current address.
 * Posts to /api/partner/verification then advances to VehicleType.
 */

import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
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

export const Step1_BasicDetails = () => {
  const navigation = useNavigation<any>();
  const { token, setVerificationStatus, authenticatedFetch, logout } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [fullName, setFullName]   = useState('');
  const [dob,      setDob]        = useState('');
  const [address,  setAddress]    = useState('');
  const [city,     setCity]       = useState('');
  const [stateName,setStateName]  = useState('');
  const [pincode,  setPincode]    = useState('');
  const [showDate, setShowDate]   = useState(false);
  const [locating, setLocating]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState<string | null>(null);
  const [focused,  setFocused]    = useState<string | null>(null);

  const fld = (name: string) => ({
    focused: focused === name,
    colors, typography,
    onFocus: () => setFocused(name),
    onBlur:  () => setFocused(null),
  });

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  const useGPS = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Allow location access or enter manually.'); return; }
      const pos    = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const p = places[0];
      if (!p) { Alert.alert('Not found', 'Could not resolve address. Enter manually.'); return; }
      setAddress([p.name, p.street, p.district].filter(Boolean).join(', ') || '');
      setCity(p.city || p.subregion || '');
      setStateName(p.region || '');
      setPincode(p.postalCode || '');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Location error');
    } finally { setLocating(false); }
  };

  const handleNext = async () => {
    if (!fullName.trim()) { setError('Full name is required.'); return; }
    if (!address.trim() || !city.trim() || !stateName.trim() || !pincode.trim()) {
      setError('Please fill in all address fields.'); return;
    }
    if (!token) { setError('Session expired. Please sign in again.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/partner/verification`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          fullName    : fullName.trim(),
          dateOfBirth : dob || null,
          address     : address.trim(),
          city        : city.trim(),
          state       : stateName.trim(),
          pincode     : pincode.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      await setVerificationStatus(data?.data?.verificationStatus || 'NEW');
      navigation.navigate('Step2_VehicleType');
    } catch (e: any) {
      setError(e.message || 'Submission failed. Check your connection.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={1} colors={colors} typography={typography} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ScreenHeader
            icon="person-outline"
            title="Basic Details"
            subtitle="Tell us about yourself to create your partner profile."
            colors={colors} typography={typography}
            onBack={() =>
              Alert.alert(
                'Sign Out?',
                'You will be taken back to the login screen.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
                ],
              )
            }
          />

          <SectionCard colors={colors}>
            <FieldLabel text="Full Name" required colors={colors} typography={typography} />
            <StyledInput
              {...fld('name')} iconLeft="person-outline"
              placeholder="e.g. Ravi Kumar" value={fullName}
              onChangeText={t => { setFullName(t); setError(null); }}
              autoCapitalize="words" returnKeyType="next"
              style={{ marginBottom: 12 }}
            />

            <FieldLabel text="Date of Birth" colors={colors} typography={typography} />
            <TouchableOpacity
              style={[s.dateBtn, { backgroundColor: colors.surfaceSunken, borderColor: focused === 'dob' ? colors.primary : colors.border }]}
              onPress={() => { setShowDate(true); setFocused('dob'); }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textHint} />
              <Text style={[typography.body, { color: dob ? colors.textPrimary : colors.placeholder, flex: 1 }]}>
                {dob || 'Select date of birth (optional)'}
              </Text>
            </TouchableOpacity>
            {showDate && (
              <DateTimePicker
                value={dob ? new Date(`${dob}T12:00:00`) : new Date(2000, 0, 1)}
                mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_, d) => { setShowDate(Platform.OS === 'ios'); if (d) setDob(formatDate(d)); }}
              />
            )}
          </SectionCard>

          <SectionCard colors={colors}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[typography.headingS, { color: colors.textPrimary, marginLeft: 8 }]}>Address</Text>
            </View>
            <TouchableOpacity
              style={[s.locBtn, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.sm }]}
              onPress={useGPS} disabled={locating}
            >
              {locating
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Ionicons name="locate-outline" size={16} color={colors.primary} />
              }
              <Text style={[typography.body, { color: colors.primary, fontWeight: '700', marginLeft: 6 }]}>
                {locating ? 'Fetching location…' : 'Use GPS to fill address'}
              </Text>
            </TouchableOpacity>

            <FieldLabel text="Street / Locality" required colors={colors} typography={typography} />
            <StyledInput {...fld('addr')} iconLeft="home-outline" placeholder="House No, Road, Area" value={address} onChangeText={t => { setAddress(t); setError(null); }} style={{ marginBottom: 12 }} />

            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <FieldLabel text="City" required colors={colors} typography={typography} />
                <StyledInput {...fld('city')} placeholder="New Delhi" value={city} onChangeText={t => { setCity(t); setError(null); }} />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel text="State" required colors={colors} typography={typography} />
                <StyledInput {...fld('state')} placeholder="Delhi" value={stateName} onChangeText={t => { setStateName(t); setError(null); }} />
              </View>
            </View>

            <FieldLabel text="Pincode" required colors={colors} typography={typography} />
            <StyledInput {...fld('pin')} iconLeft="mail-outline" placeholder="110001" value={pincode} onChangeText={t => { setPincode(t); setError(null); }} keyboardType="number-pad" maxLength={6} />
          </SectionCard>

          <ErrorBox error={error} colors={colors} typography={typography} />
          <CtaBtn label="Save & Continue" onPress={handleNext} loading={loading} colors={colors} typography={typography} icon="arrow-forward" />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 32 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.input, height: 50, paddingHorizontal: 14, gap: 10, marginBottom: 12 },
  row: { flexDirection: 'row' },
});
