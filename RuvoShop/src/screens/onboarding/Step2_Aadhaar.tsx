import React, { useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Text, Animated, Image,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import { API_BASE_URL } from '../../config/api';
import { getMyShops } from '../../services/shopService';
import {
  StepBar, ScreenHeader, SectionCard, FieldLabel,
  StyledInput, CtaBtn, InfoBox, ErrorBox,
} from './OnboardingShared';

type VerifyState = 'idle' | 'verifying' | 'done' | 'error';

export const Step2_Aadhaar = () => {
  const navigation = useNavigation<any>();
  const { setOnboardingStatus, userId, token } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [aadhaar, setAadhaar]        = useState('');
  const [name,    setName]           = useState('');
  const [frontDoc, setFrontDoc]      = useState<any>(null);
  const [backDoc,  setBackDoc]       = useState<any>(null);
  const [vState,   setVState]        = useState<VerifyState>('idle');
  const [error,    setError]         = useState<string | null>(null);
  const [focused,  setFocused]       = useState<string | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  let   spinLoop: Animated.CompositeAnimation | null = null;

  const fld = (n: string) => ({
    focused: focused === n, colors, typography,
    onFocus: () => setFocused(n),
    onBlur:  () => setFocused(null),
  });

  const clean = aadhaar.replace(/\s/g, '');

  const formatAadhaar = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 12);
    return d.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
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
        // Full PDF document uploaded for both front & back
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
  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

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
    if (clean.length !== 12) { setError('Please enter a valid 12-digit Aadhaar number.'); return; }
    if (!name.trim())        { setError('Please enter the name as per Aadhaar.');         return; }
    if (!frontDoc)           { setError('Please upload Aadhaar Front Photo or PDF document.'); return; }

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
      const shops = await getMyShops(userId!, token!);
      const myShop = shops?.[0];
      if (!myShop) throw new Error('No shop found. Please complete Step 1 again.');

      const formData = new FormData();
      formData.append('aadhaarNumber', clean);
      formData.append('aadhaarName', name.trim());
      formData.append('front', frontPart as any);
      formData.append('back', backPart as any);

      await axios.post(`${API_BASE_URL}/api/shops/${myShop.id}/aadhaar`, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'multipart/form-data',
        },
      });

      stopSpinner();
      setVState('done');
      await setOnboardingStatus('BANK_PENDING');
      setTimeout(() => navigation.navigate('Step3_BankAccount'), 1400);
    } catch (err: any) {
      stopSpinner();
      setVState('error');
      setError(err?.message || 'Aadhaar document upload failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={2} colors={colors} typography={typography} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter, flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            icon="card-outline"
            title="Aadhaar Verification"
            subtitle="Upload your Aadhaar details and document photos for admin review."
            colors={colors} typography={typography}
            onBack={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Step1_ShopDetails');
            }}
          />

          <InfoBox
            text="Upload front & back photos of your original Aadhaar card for quick verification."
            variant="warning"
            colors={colors} typography={typography}
          />

          {vState === 'done' ? (
            /* ── Success card ── */
            <Animated.View style={[
              s.successCard,
              { backgroundColor: colors.successSoft, borderRadius: RADIUS.card, opacity: fadeAnim },
            ]}>
              <View style={[s.successIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" />
              </View>
              <Text style={[typography.headingM, { color: colors.success, marginTop: 14 }]}>
                Aadhaar Details Uploaded!
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                Identity documents submitted for review. Proceeding to bank account setup…
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
                style={{ marginBottom: 12 }}
              />

              {/* Document Photo & PDF Uploads */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <FieldLabel text="Aadhaar Document / Photos" required colors={colors} typography={typography} />
                <TouchableOpacity onPress={() => selectDocPdf()} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Upload as PDF</Text>
                </TouchableOpacity>
              </View>

              <View style={s.docRow}>
                {/* Front Card / PDF 1 */}
                <TouchableOpacity
                  style={[s.docPickerCard, { borderColor: frontDoc ? colors.primary : colors.border }]}
                  onPress={() => selectDocImage('front')}
                  activeOpacity={0.7}
                >
                  {frontDoc ? (
                    frontDoc.isPdf ? (
                      <View style={s.pickerPlaceholder}>
                        <Ionicons name="document-attach" size={32} color="#EF4444" />
                        <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
                          {frontDoc.fileName || 'Front_Aadhaar.pdf'}
                        </Text>
                        <Text style={[typography.caption, { color: colors.success, fontSize: 10, fontWeight: '800' }]}>PDF Selected</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: frontDoc.uri }} style={s.docPreview} />
                    )
                  ) : (
                    <View style={s.pickerPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
                      <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginTop: 4 }]}>Front Photo / PDF</Text>
                      <Text style={[typography.caption, { color: colors.textHint }]}>Tap to select</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Back Card / PDF 2 */}
                <TouchableOpacity
                  style={[s.docPickerCard, { borderColor: backDoc ? colors.primary : colors.border }]}
                  onPress={() => selectDocImage('back')}
                  activeOpacity={0.7}
                >
                  {backDoc ? (
                    backDoc.isPdf ? (
                      <View style={s.pickerPlaceholder}>
                        <Ionicons name="document-attach" size={32} color="#EF4444" />
                        <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
                          {backDoc.fileName || 'Back_Aadhaar.pdf'}
                        </Text>
                        <Text style={[typography.caption, { color: colors.success, fontSize: 10, fontWeight: '800' }]}>PDF Selected</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: backDoc.uri }} style={s.docPreview} />
                    )
                  ) : (
                    <View style={s.pickerPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
                      <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginTop: 4 }]}>Back Photo / PDF</Text>
                      <Text style={[typography.caption, { color: colors.textHint }]}>Tap to select</Text>
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

              <View style={[s.maskRow, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.xs, marginTop: 12 }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.textHint} />
                <Text style={[typography.caption, { color: colors.textHint, flex: 1 }]}>
                  Your document photos will be securely reviewed by RuVo Admin for shop verification.
                </Text>
              </View>
            </SectionCard>
          )}

          {/* Verifying spinner */}
          {vState === 'verifying' && (
            <View style={[
              s.spinnerCard,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: RADIUS.card },
              shadows.md,
            ]}>
              <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                <Ionicons name="sync-outline" size={36} color={colors.primary} />
              </Animated.View>
              <Text style={[typography.headingS, { color: colors.textPrimary, marginTop: 12 }]}>
                Uploading Aadhaar Documents…
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
                Submitting records to Admin review queue.
              </Text>
            </View>
          )}

          <ErrorBox error={error} colors={colors} typography={typography} />

          {vState !== 'done' && vState !== 'verifying' && (
            <CtaBtn
              label="Verify & Submit Aadhaar"
              onPress={handleVerify}
              colors={colors} typography={typography}
              icon="shield-checkmark-outline"
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
  successCard:  { alignItems: 'center', padding: 28, marginBottom: 16 },
  successIcon:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  docRow:       { flexDirection: 'row', gap: 12, marginTop: 4 },
  docPickerCard:{ flex: 1, height: 110, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', backgroundColor: '#FAFAFA' },
  docPreview:   { width: '100%', height: '100%', resizeMode: 'cover' },
  pickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6 },
  maskRow:      { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10 },
  spinnerCard:  { borderWidth: StyleSheet.hairlineWidth, padding: 28, alignItems: 'center', marginBottom: 16 },
});
