import React, { useState, useRef, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

/* RuVo Shop Login */

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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;


// ── Animated Background (Merchant Emerald & Gold Theme) ──
const AnimatedShopBackground = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 3800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 3800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -18, duration: 4200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 18, duration: 4200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {/* 1. Top Right Emerald Glowing Sphere */}
      <Animated.View
        style={{
          position: 'absolute', top: -70, right: -60, width: 260, height: 260,
          borderRadius: 130, opacity: pulseAnim,
          transform: [{ translateY: floatAnim }]
        }}
      >
        <LinearGradient
          colors={['#059669', '#10B981']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* 2. Top Left Merchant Gold Circle */}
      <Animated.View
        style={{
          position: 'absolute', top: 80, left: -60, width: 160, height: 160,
          borderRadius: 80, opacity: Animated.multiply(pulseAnim, 0.7),
          transform: [{ translateY: Animated.multiply(floatAnim, -0.8) }]
        }}
      >
        <LinearGradient
          colors={['#D97706', '#F59E0B']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* 3. Bottom Left Teal Orb */}
      <Animated.View
        style={{
          position: 'absolute', bottom: -50, left: -40, width: 220, height: 220,
          borderRadius: 110, opacity: Animated.multiply(pulseAnim, 0.6),
          transform: [{ translateY: floatAnim }]
        }}
      >
        <LinearGradient
          colors={['#0D9488', '#14B8A6']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Glassmorphism soft overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.78)' }]} />
    </View>
  );
};

export const LoginScreen = ({ navigation }: Props) => {
  const { login, requiredRole } = useAuth();
  const { colors, typography, radius, shadows, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Subtle button press scale
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
    const formatted = formatMobileNumber(mobile);
    if (!formatted || formatted.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    setLoading(true);
    const targetUrl = `${API_BASE_URL}/api/auth/otp/send`;
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formatted }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message ?? 'Failed to send OTP. Please try again.'); return; }
      setStep(2);
    } catch (err: any) {
      setError(`Cannot reach server (${targetUrl}): ${err?.message || 'Network request failed'}`);
    }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) { setError('Please enter the 6-digit OTP code'); return; }
    setError(null);
    setLoading(true);
    const targetUrl = `${API_BASE_URL}/api/auth/otp/verify`;
    try {
      const formatted = formatMobileNumber(mobile);
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: formatted,
          otpCode: otp.trim(),
          ...(requiredRole === 'USER' ? {} : { role: requiredRole }),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message ?? 'Invalid OTP code'); return; }
      const { data } = body as ApiResponse<AuthToken>;
      await login(data.accessToken, String(data.userId), data.role);
    } catch (err: any) {
      setError(`Cannot reach server (${targetUrl}): ${err?.message || 'Network request failed'}`);
    }
    finally { setLoading(false); }
  };

  const phoneDigits = mobile.replace(/[^0-9]/g, '').slice(-10);

  return (
    <View style={[styles.screen, { backgroundColor: '#F4FBF7' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Animated Merchant Background */}
      <AnimatedShopBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: spacing.gutter, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark */}
          <View style={styles.brandRow}>
            <Image
              source={{ uri: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1788798727/RuvoShop.png' }}
              style={{ width: 140, height: 60, resizeMode: 'contain' }}
            />
          </View>
          <Text style={[{ fontFamily: 'Poppins_800ExtraBold', fontSize: 18, textAlign: 'center', marginBottom: 20 }]}>RuVo Shop</Text>

          {/* Step indicator */}
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

          {/* Heading */}
          <Text style={[typography.headingXL, styles.title, { color: colors.textPrimary }]}>
            {step === 1 ? 'Welcome back' : 'Verify OTP'}
          </Text>
          <Text style={[typography.body, styles.subtitle, { color: colors.textSecondary }]}>
            {step === 1
              ? 'Sign in to manage your shop and orders.'
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
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>Mobile Number</Text>
                <View style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surfaceSunken,
                    borderColor: focusedField === 'mobile' ? colors.primary : colors.border,
                    borderRadius: radius.input,
                  },
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
                    <Ionicons name="checkmark-circle" size={20} color={colors.success || '#18A957'} />
                  )}
                </View>
              </>
            ) : (
              <>
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>6-Digit OTP</Text>
                <View style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surfaceSunken,
                    borderColor: focusedField === 'otp' ? colors.primary : colors.border,
                    borderRadius: radius.input,
                  },
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
              </>
            )}

            {/* Error */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorSoft || '#FEE2E2', borderRadius: radius.sm }]}>
                <Ionicons name="alert-circle" size={15} color={colors.error || '#DC2626'} />
                <Text style={[typography.caption, { color: colors.error || '#DC2626', flex: 1 }]}>{error}</Text>
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
                        {step === 1 ? 'Get OTP' : 'Verify & Login'}
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
          
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textHint} />
            <Text style={[typography.caption, { color: colors.textHint, fontSize: 11 }]}>
               Secure Local Business Portal
            </Text>
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
  container: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  formCard: {
    borderWidth: 0.5,
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    height: 52,
    marginBottom: 16,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputFocused: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  prefixBox: {
    paddingRight: 10,
    borderRightWidth: 1,
    height: '60%',
    justifyContent: 'center',
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    marginBottom: 14,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: 8,
  },
  changePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 4,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
});