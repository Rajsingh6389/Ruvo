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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

const { width: SW } = Dimensions.get('window');

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

// ── Animated Background Shapes (Sunset Orange & Warm Amber Ambient Theme) ──
const AnimatedBackgroundShapes = ({ isDark }: { isDark: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 3500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 3500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -15, duration: 4000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 15, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const baseOpacity = isDark ? 0.35 : 0.65;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {/* 1. Top Right Sunset Orange Blob */}
      <Animated.View
        style={{
          position: 'absolute', top: -60, right: -50, width: 240, height: 240,
          borderRadius: 120, opacity: Animated.multiply(pulseAnim, baseOpacity),
          transform: [{ translateY: floatAnim }, { rotate: '45deg' }]
        }}
      >
        <LinearGradient colors={['#FF7A00', '#FF4500']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      
      {/* 2. Top Left Warm Amber Circle */}
      <Animated.View
        style={{
          position: 'absolute', top: 50, left: -70, width: 180, height: 180,
          borderRadius: 90, opacity: Animated.multiply(pulseAnim, baseOpacity * 0.9),
          transform: [{ translateY: Animated.multiply(floatAnim, -0.8) }]
        }}
      >
        <LinearGradient colors={['#F59E0B', '#FBBF24']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* 3. Middle Right Pink Coral Orb */}
      <Animated.View
        style={{
          position: 'absolute', top: 320, right: -40, width: 140, height: 140,
          borderRadius: 70, opacity: Animated.multiply(pulseAnim, baseOpacity * 0.7),
          transform: [{ translateY: Animated.multiply(floatAnim, -1.2) }]
        }}
      >
        <LinearGradient colors={['#EC4899', '#8B5CF6']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* 4. Bottom Emerald Arc */}
      <Animated.View
        style={{
          position: 'absolute', bottom: -60, left: '10%', width: 260, height: 180,
          borderRadius: 130, opacity: Animated.multiply(pulseAnim, baseOpacity * 0.6),
          transform: [{ translateY: floatAnim }]
        }}
      >
        <LinearGradient colors={['#10B981', '#34D399']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Glassmorphism soft overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10,10,12,0.45)' : 'rgba(255,255,255,0.35)' }]} />
    </View>
  );
};

export const RegisterScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const { colors, typography, radius, shadows, spacing, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entrance spring animation
  const cardY = useRef(new Animated.Value(30)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Button scale interaction
  const btnScale = useRef(new Animated.Value(1)).current;
  const pressBtnIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
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
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formatted }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message ?? 'Failed to send OTP. Please try again.'); return; }
      if (body?.data?.otpCode) setOtp(String(body.data.otpCode));
      setStep(2);
    } catch (err: any) {
      setError(`Cannot reach server: ${err?.message || 'Network request failed'}`);
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) { setError('Please enter the 6-digit OTP code'); return; }
    setError(null);
    setLoading(true);
    try {
      const formatted = formatMobileNumber(mobile);
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formatted, otpCode: otp.trim(), name: name.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message ?? 'Invalid OTP code'); return; }
      const { data } = body as ApiResponse<AuthToken>;
      await login(data.accessToken, String(data.userId), data.role);
    } catch (err: any) {
      setError(`Cannot reach server: ${err?.message || 'Network request failed'}`);
    } finally { setLoading(false); }
  };

  const phoneDigits = mobile.replace(/[^0-9]/g, '').slice(-10);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Ambient Animated Background */}
      <AnimatedBackgroundShapes isDark={isDark} />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[
          styles.backCircle,
          { backgroundColor: isDark ? 'rgba(25,25,25,0.8)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
          shadows.sm
        ]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </View>
      </TouchableOpacity>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 120 }
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.brandRow}>
              <View style={[styles.brandBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.brandLetter}>R</Text>
              </View>
              <Text style={[styles.brandName, { color: colors.textPrimary }]}>RuVo</Text>
            </View>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Create your account to start shopping local
            </Text>
          </View>

          {/* Glass Form Card */}
          <Animated.View style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(25,25,25,0.75)' : 'rgba(255,255,255,0.85)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderRadius: 28,
            },
            isDark ? shadows.md : shadows.lg,
            { transform: [{ translateY: cardY }], opacity: cardOp }
          ]}>
            {/* Step Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerTextCol}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {step === 1 ? 'Create Account' : 'Verify OTP'}
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  {step === 1 ? 'Join RuVo to discover local merchants' : `Sent to +91 ${phoneDigits}`}
                </Text>
              </View>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, { backgroundColor: colors.primary, width: step === 1 ? 24 : 8 }]} />
                <View style={[styles.stepDot, { backgroundColor: step === 2 ? '#16A34A' : (isDark ? '#444' : '#E5E7EB'), width: step === 2 ? 24 : 8 }]} />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

            {/* Form Fields */}
            {step === 1 ? (
              <>
                {/* Name */}
                <Text style={[styles.inputLabel, { color: colors.textHint }]}>FULL NAME</Text>
                <View style={[
                  styles.inputField,
                  { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)', borderColor: focusedField === 'name' ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') },
                  focusedField === 'name' && { borderWidth: 1.5 }
                ]}>
                  <Ionicons name="person-outline" size={18} color={focusedField === 'name' ? colors.primary : colors.textHint} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.placeholder}
                    value={name}
                    onChangeText={t => { setName(t); setError(null); }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                    autoCapitalize="words"
                  />
                  {name.trim().length >= 2 && (
                    <View style={[styles.successTick, { backgroundColor: '#16A34A' }]}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                  )}
                </View>

                {/* Mobile */}
                <Text style={[styles.inputLabel, { color: colors.textHint }]}>MOBILE NUMBER</Text>
                <View style={[
                  styles.inputField,
                  { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)', borderColor: focusedField === 'mobile' ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') },
                  focusedField === 'mobile' && { borderWidth: 1.5 }
                ]}>
                  <View style={styles.prefixGroup}>
                    <Text style={{ fontSize: 16 }}>🇮🇳</Text>
                    <Text style={[styles.prefixText, { color: colors.textPrimary }]}>+91</Text>
                  </View>
                  <View style={[styles.inputSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
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
                    <View style={[styles.successTick, { backgroundColor: '#16A34A' }]}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                  )}
                </View>

                {/* Terms checkbox */}
                <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(a => !a)} activeOpacity={0.7}>
                  <View style={[
                    styles.checkbox,
                    { borderColor: agreed ? colors.primary : colors.border, backgroundColor: agreed ? colors.primary : 'transparent' },
                  ]}>
                    {agreed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                    I agree to the <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>Terms of Service</Text> & <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.inputLabel, { color: colors.textHint }]}>6-DIGIT OTP</Text>
                <View style={[
                  styles.inputField,
                  { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)', borderColor: focusedField === 'otp' ? '#16A34A' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') },
                  focusedField === 'otp' && { borderWidth: 1.5, backgroundColor: isDark ? 'rgba(22,163,74,0.15)' : '#F0FDF4' }
                ]}>
                  <Ionicons name="key-outline" size={20} color={focusedField === 'otp' ? '#16A34A' : colors.textHint} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary, letterSpacing: 8, fontSize: 20, fontFamily: 'Poppins_700Bold' }]}
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

                {/* Name preview badge */}
                <View style={[styles.namePill, { backgroundColor: isDark ? 'rgba(255,122,0,0.15)' : '#FFF7ED', borderColor: isDark ? 'rgba(255,122,0,0.3)' : '#FED7AA' }]}>
                  <Ionicons name="person-circle" size={16} color={colors.primary} />
                  <Text style={[styles.namePillText, { color: colors.primary }]}>
                    Creating account for {name}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => { setStep(1); setOtp(''); setError(null); }} style={styles.changePhoneBtn}>
                  <Ionicons name="chevron-back" size={14} color={colors.primary} />
                  <Text style={[styles.changePhoneText, { color: colors.primary }]}>Change Mobile Number</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Error message */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(217,74,74,0.2)' : '#FEF2F2', borderColor: 'rgba(217,74,74,0.3)' }]}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={[styles.errorText, { color: isDark ? '#fca5a5' : '#D94A4A' }]}>{error}</Text>
              </View>
            ) : null}

            {/* Action CTA Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 6 }}>
              <TouchableOpacity
                onPress={step === 1 ? handleSendOtp : handleVerifyOtp}
                onPressIn={pressBtnIn}
                onPressOut={pressBtnOut}
                disabled={loading}
                activeOpacity={1}
              >
                <LinearGradient
                  colors={step === 1 ? ['#FF7A00', '#FF6B35'] : ['#16A34A', '#15803D']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.ctaButton}
                >
                  {loading
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <>
                        <Text style={styles.ctaText}>
                          {step === 1 ? 'Get OTP' : 'Create Account'}
                        </Text>
                        <View style={styles.ctaArrowCircle}>
                          <Ionicons name="arrow-forward" size={16} color={step === 1 ? '#FF6B35' : '#15803D'} />
                        </View>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Footer Navigation */}
          <View style={styles.bottomFooter}>
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark" size={12} color={colors.textHint} />
              <Text style={[styles.trustText, { color: colors.textHint }]}>100% Secure & Encrypted</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  backBtn: { position: 'absolute', left: 20, zIndex: 10 },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  
  // Header
  headerBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetter: {
    fontSize: 20,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 26,
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },

  // Card
  card: {
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 20,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginVertical: 18,
    opacity: 0.5,
  },

  // Inputs
  inputLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  prefixGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prefixText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  inputSeparator: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
  },
  successTick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    flex: 1,
  },

  // OTP Name Pill
  namePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  namePillText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  changePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  changePhoneText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    flex: 1,
  },

  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
    gap: 12,
  },
  ctaText: {
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  ctaArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  bottomFooter: {
    alignItems: 'center',
    gap: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  footerLink: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 13,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
  },
});
