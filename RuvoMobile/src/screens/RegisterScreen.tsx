import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

interface AuthToken {
  accessToken: string;
  tokenType: string;
  userId: number | string;
  role: string;
}
interface ApiResponse<T> {
  message: string;
  data: T;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const { colors, typography, radius, shadows, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressBtnIn = () => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressBtnOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const formatMobileNumber = (raw: string) => {
    const clean = raw.replace(/[^0-9]/g, '');
    if (clean.length === 10) return `+91${clean}`;
    if (clean.length === 12 && clean.startsWith('91')) return `+${clean}`;
    return raw.trim();
  };

  const handleSendOtp = async () => {
    if (!name.trim()) { setError('Please enter your full name'); return; }
    const formatted = formatMobileNumber(mobile);
    if (!formatted || formatted.length < 10) { setError('Please enter a valid 10-digit mobile number'); return; }
    if (!agreed) { setError('Please agree to the Terms and Conditions'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formatted }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message ?? 'Failed to send OTP. Please try again.'); return; }
      setStep(2);
    } catch { setError('Could not reach the server. Check your connection.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) { setError('Please enter the 6-digit OTP code'); return; }
    setError(null);
    setLoading(true);
    try {
      const formatted = formatMobileNumber(mobile);
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formatted, otpCode: otp.trim(), name: name.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message ?? 'Invalid OTP code'); return; }
      const { data } = body as ApiResponse<AuthToken>;
      await login(data.accessToken, String(data.userId), data.role);
    } catch { setError('Could not reach the server. Check your connection.'); }
    finally { setLoading(false); }
  };

  const phoneDigits = mobile.replace(/[^0-9]/g, '').slice(-10);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[colors.primarySoft, colors.background]}
        style={[styles.topGradient, { paddingTop: insets.top }]}
        pointerEvents="none"
      />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[styles.backCircle, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.pill }, shadows.sm]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </View>
      </TouchableOpacity>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: spacing.gutter, paddingTop: insets.top + 80 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark */}
          <View style={styles.brandRow}>
            <View style={[styles.brandBadge, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
              <Text style={styles.brandLetter}>R</Text>
            </View>
            <Text style={[typography.headingS, styles.brandName, { color: colors.textPrimary }]}>RuVo</Text>
          </View>

          {/* Step dots */}
          <View style={styles.stepRow}>
            {[1, 2].map(s => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  { backgroundColor: step >= s ? colors.primary : colors.border },
                  step >= s && { width: 24 },
                ]}
              />
            ))}
          </View>

          <Text style={[typography.headingXL, styles.title, { color: colors.textPrimary }]}>
            {step === 1 ? 'Create Account' : 'Verify OTP'}
          </Text>
          <Text style={[typography.body, styles.subtitle, { color: colors.textSecondary }]}>
            {step === 1
              ? 'Join RuVo — shop and sell from local stores'
              : `We've sent a 6-digit code to +91 ${phoneDigits}`}
          </Text>

          {/* Form card */}
          <View style={[
            styles.formCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card, padding: spacing.cardPad },
            shadows.md,
          ]}>
            {step === 1 ? (
              <>
                {/* Full Name */}
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                <View style={[
                  styles.inputWrap,
                  { backgroundColor: colors.surfaceSunken, borderColor: focusedField === 'name' ? colors.primary : colors.border, borderRadius: radius.input },
                  focusedField === 'name' && styles.inputFocused,
                ]}>
                  <Ionicons name="person-outline" size={18} color={colors.textHint} style={styles.inputIcon} />
                  <TextInput
                    style={[typography.body, styles.input, { color: colors.textPrimary }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.placeholder}
                    value={name}
                    onChangeText={t => { setName(t); setError(null); }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                    autoCapitalize="words"
                  />
                </View>

                {/* Mobile */}
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>Mobile Number</Text>
                <View style={[
                  styles.inputWrap,
                  { backgroundColor: colors.surfaceSunken, borderColor: focusedField === 'mobile' ? colors.primary : colors.border, borderRadius: radius.input },
                  focusedField === 'mobile' && styles.inputFocused,
                ]}>
                  <View style={[styles.prefixBox, { borderRightColor: colors.border }]}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 15 }]}>🇮🇳  +91</Text>
                  </View>
                  <TextInput
                    style={[typography.body, styles.input, { color: colors.textPrimary }]}
                    placeholder="10-digit number"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobile}
                    onChangeText={t => { setMobile(t); setError(null); }}
                    onFocus={() => setFocusedField('mobile')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                  {mobile.length === 10 && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  )}
                </View>

                {/* Terms */}
                <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(a => !a)} activeOpacity={0.7}>
                  <View style={[
                    styles.checkbox,
                    { borderColor: agreed ? colors.primary : colors.border, borderRadius: radius.xs, backgroundColor: agreed ? colors.primary : 'transparent' },
                  ]}>
                    {agreed && <Ionicons name="checkmark" size={11} color={colors.onPrimary} />}
                  </View>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                    I agree to the <Text style={{ color: colors.primary, fontWeight: '600' }}>Terms & Conditions</Text> and <Text style={{ color: colors.primary, fontWeight: '600' }}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>6-Digit OTP</Text>
                <View style={[
                  styles.inputWrap,
                  { backgroundColor: colors.surfaceSunken, borderColor: focusedField === 'otp' ? colors.primary : colors.border, borderRadius: radius.input },
                  focusedField === 'otp' && styles.inputFocused,
                ]}>
                  <Ionicons name="key-outline" size={20} color={colors.textHint} style={styles.inputIcon} />
                  <TextInput
                    style={[typography.body, styles.input, { color: colors.textPrimary, letterSpacing: 6, fontSize: 20 }]}
                    placeholder="• • • • • •"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={t => { setOtp(t); setError(null); }}
                    onFocus={() => setFocusedField('otp')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOtp}
                    autoFocus
                  />
                </View>

                {/* Name preview */}
                <View style={[styles.namePill, { backgroundColor: colors.primarySoft, borderRadius: radius.sm }]}>
                  <Ionicons name="person-circle" size={16} color={colors.primaryDark} />
                  <Text style={[typography.caption, { color: colors.primaryDark, fontWeight: '600' }]}>
                    Creating account for {name}
                  </Text>
                </View>
              </>
            )}

            {/* Error */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorSoft, borderRadius: radius.sm }]}>
                <Ionicons name="alert-circle" size={15} color={colors.error} />
                <Text style={[typography.caption, { color: colors.error, flex: 1 }]}>{error}</Text>
              </View>
            ) : null}

            {/* CTA */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                onPress={step === 1 ? handleSendOtp : handleVerifyOtp}
                onPressIn={pressBtnIn}
                onPressOut={pressBtnOut}
                disabled={loading}
                activeOpacity={1}
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: radius.button }, shadows.brand]}
              >
                {loading
                  ? <ActivityIndicator color={colors.onPrimary} />
                  : <>
                      <Text style={[typography.button, { color: colors.onPrimary }]}>
                        {step === 1 ? 'Get OTP' : 'Create Account'}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
                    </>
                }
              </TouchableOpacity>
            </Animated.View>

            {step === 2 && (
              <TouchableOpacity onPress={() => { setStep(1); setOtp(''); setError(null); }} style={styles.changePhoneBtn}>
                <Ionicons name="chevron-back" size={14} color={colors.primary} />
                <Text style={[typography.bodyStrong, { color: colors.primary, fontSize: 13 }]}>Change Mobile Number</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Text style={[typography.bodyStrong, { color: colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textHint} />
            <Text style={[typography.caption, { color: colors.textHint, fontSize: 11 }]}>Your data is encrypted and secure</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 200,
    pointerEvents: 'none',
  },
  backBtn: { position: 'absolute', left: 20, zIndex: 10 },
  backCircle: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  brandBadge: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { fontSize: 22, fontWeight: '900', color: '#231C10' },
  brandName: { fontWeight: '800', letterSpacing: 0.5 },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  title: { textAlign: 'center', marginBottom: 6 },
  subtitle: { textAlign: 'center', marginBottom: 28, lineHeight: 20, paddingHorizontal: 12 },
  formCard: { borderWidth: 1, marginBottom: 20 },
  label: { marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    height: 52,
    marginBottom: 16,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputFocused: { borderWidth: 2 },
  prefixBox: { paddingRight: 10, borderRightWidth: 1, height: '60%', justifyContent: 'center' },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  checkbox: { width: 18, height: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  namePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginBottom: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  changePhoneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
});
