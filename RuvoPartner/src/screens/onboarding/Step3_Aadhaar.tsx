/**
 * Onboarding Step 3 — Aadhaar Verification & Document Upload
 * Accepts Aadhaar number, name, and front/back card photos, uploading them to backend.
 */

import React, { useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Text, Animated, Image,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import { API_BASE_URL } from '../../config/api';
import {
  StepBar, ScreenHeader, SectionCard, FieldLabel,
  StyledInput, CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

type VerifyState = 'idle' | 'verifying' | 'done' | 'error';

export const Step3_Aadhaar = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, userId, token } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [aadhaar,  setAadhaar]  = useState('');
  const [name,     setName]     = useState('');
  const [frontDoc, setFrontDoc] = useState<any>(null);
  const [backDoc,  setBackDoc]  = useState<any>(null);
  const [vState,   setVState]   = useState<VerifyState>('idle');
  const [error,    setError]    = useState<string | null>(null);
  const [focused,  setFocused]  = useState<string | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  let spinLoop: Animated.CompositeAnimation | null = null;

  const fld = (n: string) => ({
    focused: focused === n, colors, typography,
    onFocus: () => setFocused(n),
    onBlur:  () => setFocused(null),
  });

  const cleanAadhaar = aadhaar.replace(/\s/g, '');

  const formatAadhaar = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' '),
    );
  };

  const selectDocImage = async (side: 'front' | 'back') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const docData = {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `aadhaar_${side}_${Date.now()}.jpg`,
        isPdf: false,
      };
      if (side === 'front') setFrontDoc(docData);
      else setBackDoc(docData);
    } catch (err: any) {
      Alert.alert('Image Pick Error', err?.message || 'Failed to select document image.');
    }
  };

  const selectDocPdf = async (side?: 'front' | 'back') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const isPdf = file.mimeType?.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
      const docData = {
        uri: file.uri,
        type: file.mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),
        fileName: file.name || `aadhaar_${Date.now()}.${isPdf ? 'pdf' : 'jpg'}`,
        isPdf,
      };

      if (!side) {
        setFrontDoc(docData);
        setBackDoc(docData);
      } else if (side === 'front') {
        setFrontDoc(docData);
      } else {
        setBackDoc(docData);
      }
    } catch (err: any) {
      Alert.alert('Document Pick Error', err?.message || 'Failed to select PDF document.');
    }
  };

  const startSpinner = () => {
    spinAnim.setValue(0);
    spinLoop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    spinLoop.start();
  };
  const stopSpinner = () => spinLoop?.stop();

  const formatFilePart = (doc: any, prefix: string) => {
    if (!doc || !doc.uri) return null;
    const isPdf = doc.isPdf || doc.uri.toLowerCase().endsWith('.pdf') || (doc.type && doc.type.includes('pdf'));
    const type = doc.type || (isPdf ? 'application/pdf' : 'image/jpeg');
    const ext = isPdf ? 'pdf' : 'jpg';
    let name = doc.fileName || doc.name || `${prefix}_${Date.now()}.${ext}`;
    if (isPdf && !name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    else if (!isPdf && !name.match(/\.(jpg|jpeg|png|webp)$/i)) name += '.jpg';

    return {
      uri: doc.uri,
      name,
      type,
    };
  };

  const handleVerify = async () => {
    if (cleanAadhaar.length !== 12) { setError('Please enter a valid 12-digit Aadhaar number.'); return; }
    if (!name.trim())              { setError('Please enter the name as per Aadhaar.'); return; }
    if (!frontDoc)                 { setError('Please upload Aadhaar Front Photo or PDF document.'); return; }
    
    const effectiveBack = backDoc || frontDoc;
    const frontPart = formatFilePart(frontDoc, 'aadhaar_front');
    const backPart = formatFilePart(effectiveBack, 'aadhaar_back');

    if (!frontPart || !backPart) {
      setError('Invalid document files selected. Please re-select photos or PDF.');
      return;
    }

    setError(null);
    setVState('verifying');
    startSpinner();
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    try {
      const activePartnerId = user?.userId || (userId ? parseInt(userId, 10) : null);
      if (!activePartnerId) throw new Error('Partner session not found. Please re-login.');

      const formData = new FormData();
      formData.append('aadhaarNumber', cleanAadhaar);
      formData.append('aadhaarName', name.trim());
      formData.append('front', frontPart as any);
      formData.append('back', backPart as any);

      await axios.post(`${API_BASE_URL}/api/delivery-partners/${activePartnerId}/aadhaar`, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'multipart/form-data',
        },
      });

      stopSpinner();
      setVState('done');
      setTimeout(() => navigation.navigate('Step4_OnboardingFee'), 1500);
    } catch (err: any) {
      stopSpinner();
      setVState('error');
      setError(err?.message || 'Aadhaar verification submission failed. Please try again.');
    }
  };

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={3} colors={colors} typography={typography} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter, flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            icon="card-outline"
            title="Aadhaar Verification"
            subtitle="Upload front and back photos of your Aadhaar Card for manual admin verification."
            colors={colors} typography={typography}
            onBack={() => navigation.goBack()}
          />

          <InfoBox
            text="Your document details will be securely uploaded and stored for admin verification prior to activation."
            variant="info" colors={colors} typography={typography}
          />

          {vState === 'done' ? (
            /* ── Success state ── */
            <Animated.View style={[s.successCard, { backgroundColor: colors.successSoft, borderRadius: RADIUS.card, opacity: fadeAnim }]}>
              <View style={[s.successIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" />
              </View>
              <Text style={[typography.headingM, { color: colors.success, marginTop: 12 }]}>Aadhaar Uploaded!</Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                Your Aadhaar details and photos have been submitted. Proceeding to the next step…
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
                style={{ marginBottom: 16 }}
              />

              {/* Document Photo & PDF Upload Pickers */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <FieldLabel text="Aadhaar Document / Photos" required colors={colors} typography={typography} />
                <TouchableOpacity onPress={() => selectDocPdf()} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Upload as PDF</Text>
                </TouchableOpacity>
              </View>
              
              <View style={s.docRow}>
                {/* Front Card */}
                <TouchableOpacity
                  style={[
                    s.docBox,
                    { backgroundColor: colors.surfaceSunken, borderColor: frontDoc ? colors.success : colors.border },
                  ]}
                  onPress={() => selectDocImage('front')}
                  activeOpacity={0.8}
                >
                  {frontDoc ? (
                    frontDoc.isPdf ? (
                      <View style={s.placeholderWrapper}>
                        <Ionicons name="document-attach" size={32} color="#EF4444" />
                        <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
                          {frontDoc.fileName || 'Front_Aadhaar.pdf'}
                        </Text>
                        <Text style={[typography.caption, { color: colors.success, fontSize: 10, fontWeight: '800' }]}>PDF Selected</Text>
                      </View>
                    ) : (
                      <View style={s.previewWrapper}>
                        <Image source={{ uri: frontDoc.uri }} style={s.previewImg} />
                        <View style={[s.badge, { backgroundColor: colors.success }]}>
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        </View>
                        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Front Photo</Text>
                      </View>
                    )
                  ) : (
                    <View style={s.placeholderWrapper}>
                      <Ionicons name="camera-outline" size={28} color={colors.primary} />
                      <Text style={[typography.body, { fontWeight: '700', color: colors.textPrimary, marginTop: 6, fontSize: 13 }]}>Front Photo / PDF</Text>
                      <Text style={[typography.caption, { color: colors.textHint, textAlign: 'center' }]}>Tap to Upload</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Back Card */}
                <TouchableOpacity
                  style={[
                    s.docBox,
                    { backgroundColor: colors.surfaceSunken, borderColor: backDoc ? colors.success : colors.border },
                  ]}
                  onPress={() => selectDocImage('back')}
                  activeOpacity={0.8}
                >
                  {backDoc ? (
                    backDoc.isPdf ? (
                      <View style={s.placeholderWrapper}>
                        <Ionicons name="document-attach" size={32} color="#EF4444" />
                        <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
                          {backDoc.fileName || 'Back_Aadhaar.pdf'}
                        </Text>
                        <Text style={[typography.caption, { color: colors.success, fontSize: 10, fontWeight: '800' }]}>PDF Selected</Text>
                      </View>
                    ) : (
                      <View style={s.previewWrapper}>
                        <Image source={{ uri: backDoc.uri }} style={s.previewImg} />
                        <View style={[s.badge, { backgroundColor: colors.success }]}>
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        </View>
                        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Back Photo</Text>
                      </View>
                    )
                  ) : (
                    <View style={s.placeholderWrapper}>
                      <Ionicons name="camera-outline" size={28} color={colors.primary} />
                      <Text style={[typography.body, { fontWeight: '700', color: colors.textPrimary, marginTop: 6, fontSize: 13 }]}>Back Photo / PDF</Text>
                      <Text style={[typography.caption, { color: colors.textHint, textAlign: 'center' }]}>Tap to Upload</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Dedicated PDF upload button row */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  backgroundColor: colors.surfaceSunken,
                  borderRadius: RADIUS.xs,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                }}
                onPress={() => selectDocPdf()}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text" size={18} color="#EF4444" />
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
                  Or Choose Full Aadhaar Card (PDF / Image Document)
                </Text>
              </TouchableOpacity>

              <View style={[s.maskRow, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.xs }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.textHint} />
                <Text style={[typography.caption, { color: colors.textHint, flex: 1 }]}>
                  Your card photos will be reviewed by administrators during registration approval.
                </Text>
              </View>
            </SectionCard>
          )}

          {/* Verifying spinner overlay */}
          {vState === 'verifying' && (
            <View style={[s.spinnerCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: RADIUS.card }, shadows.md]}>
              <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                <Ionicons name="sync-outline" size={36} color={colors.primary} />
              </Animated.View>
              <Text style={[typography.headingS, { color: colors.textPrimary, marginTop: 12 }]}>Uploading Documents…</Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>Please wait while your details are uploaded.</Text>
            </View>
          )}

          <ErrorBox error={error} colors={colors} typography={typography} />

          {vState !== 'done' && vState !== 'verifying' && (
            <CtaBtn
              label="Submit & Verify Aadhaar"
              onPress={handleVerify}
              loading={false}
              colors={colors} typography={typography}
              icon="cloud-upload-outline"
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
  successCard: { alignItems: 'center', padding: 28, marginBottom: 16 },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  spinnerCard: { borderWidth: StyleSheet.hairlineWidth, padding: 28, alignItems: 'center', marginBottom: 16 },
  maskRow: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginTop: 14 },
  docRow: { flexDirection: 'row', gap: 12, marginTop: 6, marginBottom: 4 },
  docBox: {
    flex: 1, height: 130, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  placeholderWrapper: { alignItems: 'center', padding: 8 },
  previewWrapper: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '100%', height: 90, borderRadius: RADIUS.sm, resizeMode: 'cover' },
  badge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
