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
  Image,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
<<<<<<< HEAD

=======
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

<<<<<<< HEAD
const { width: SW } = Dimensions.get('window');
=======
/* RuVo Shop Login */
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7

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

<<<<<<< HEAD
const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// ── Geometric Background Shapes (RuvoShop yellow palette) ──────────────────
const BackgroundShapes = () => {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {/* 1. Top Right Yellow Rectangle */}
      <LinearGradient
        colors={['#F5B700', '#FFD54F']}
        style={{
          position: 'absolute', top: -50, right: -40, width: 200, height: 200,
          borderRadius: 40, transform: [{ rotate: '45deg' }], opacity: 0.55,
        }}
      />

      {/* 2. Top Left Orange Circle */}
      <LinearGradient
        colors={['#FF8C00', '#FFA940']}
        style={{
          position: 'absolute', top: 60, left: -60, width: 140, height: 140,
          borderRadius: 70, opacity: 0.45,
        }}
      />

      {/* 3. Middle Left Brown/Warm Pill */}
      <LinearGradient
        colors={['#92400E', '#D97706']}
        style={{
          position: 'absolute', top: 350, left: -40, width: 90, height: 200,
          borderRadius: 45, transform: [{ rotate: '-15deg' }], opacity: 0.35,
        }}
      />

      {/* 4. Middle Right Teal Polygon */}
      <LinearGradient
        colors={['#0F766E', '#14B8A6']}
        style={{
          position: 'absolute', top: 300, right: -30, width: 120, height: 120,
          borderRadius: 20, transform: [{ rotate: '30deg' }], opacity: 0.3,
        }}
      />

      {/* 5. Bottom Green Ellipse */}
      <LinearGradient
        colors={['#16A34A', '#4ADE80']}
        style={{
          position: 'absolute', bottom: -50, left: '20%', width: 250, height: 150,
          borderRadius: 125, opacity: 0.35,
        }}
      />

      {/* Glassmorphism overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.38)' }]} />
    </View>
  );
};

=======
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
export const LoginScreen = ({ navigation }: Props) => {
  const { login, requiredRole } = useAuth();
  const { colors, typography, radius, shadows, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // ── Entrance animations ──
  const cardY = useRef(new Animated.Value(30)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Button scale ──
  const btnScale = useRef(new Animated.Value(1)).current;
  const pressBtnIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const pressBtnOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  // ── Step slide transition ──
  const slideAnim = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const navigateToStep2 = () => {
    Animated.parallel([
      Animated.timing(slideOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(2);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start();
      setTimeout(() => otpInputRef.current?.focus(), 300);
    });
  };

  /* =========================================================
     PHONE
  ========================================================= */
  const handleMobileChange = (value: string) => {
    setMobile(value.replace(/\D/g, '').slice(0, PHONE_LENGTH));
    if (error) setError(null);
  };

  const isValidMobile = () => /^[6-9]\d{9}$/.test(mobile);
  const formattedMobile = `+91${mobile}`;

  /* =========================================================
     OTP
  ========================================================= */
  const handleOtpChange = (value: string) => {
    setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH));
    if (error) setError(null);
  };

  /* =========================================================
     SEND OTP
  ========================================================= */
  const handleSendOtp = async () => {
    Keyboard.dismiss();
    if (!isValidMobile()) {
      setError('Please enter a valid 10-digit mobile number.');
      phoneInputRef.current?.focus();
      return;
    }
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const endpoint = requiredRole === 'USER' ? '/auth/send-otp' : '/api/auth/otp/send';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formattedMobile }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message || 'Failed to send OTP. Please try again.'); return; }
      setOtp('');
      setError(null);
      setResendTimer(RESEND_SECONDS);
      navigateToStep2();
    } catch {
      setError('Could not reach the server. Please check your internet connection.');
    } finally {
      setLoading(false);
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
    }
    finally { setLoading(false); }
  };

<<<<<<< HEAD
  /* =========================================================
     VERIFY OTP
  ========================================================= */
  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the 6-digit OTP.');
      otpInputRef.current?.focus();
      return;
    }
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const endpoint = requiredRole === 'USER' ? '/auth/verify-otp' : '/api/auth/otp/verify';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: formattedMobile,
          otpCode: otp,
          ...(requiredRole === 'USER' ? {} : { role: requiredRole }),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message || 'Invalid OTP. Please try again.'); return; }
      const { data } = body as ApiResponse<AuthToken>;
      if (!data?.accessToken || !data?.userId) { setError('Invalid response from server. Please try again.'); return; }
      await login(data.accessToken, String(data.userId), data.role);
    } catch {
      setError('Could not reach the server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     RESEND TIMER
  ========================================================= */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((current) => {
        if (current <= 1) { clearInterval(timer); return 0; }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  /* =========================================================
     RESEND OTP
  ========================================================= */
  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading || loading) return;
    setError(null);
    setResendLoading(true);
    try {
      const endpoint = requiredRole === 'USER' ? '/auth/send-otp' : '/api/auth/otp/send';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formattedMobile }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.message || 'Could not resend OTP.'); return; }
      setOtp('');
      setResendTimer(RESEND_SECONDS);
      setTimeout(() => otpInputRef.current?.focus(), 200);
    } catch {
      setError('Could not reach the server. Please check your internet connection.');
    } finally {
      setResendLoading(false);
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
    }
    finally { setLoading(false); }
  };

<<<<<<< HEAD
  /* =========================================================
     CHANGE NUMBER
  ========================================================= */
  const handleChangeNumber = () => {
    setStep(1);
    setOtp('');
    setError(null);
    setResendTimer(0);
    slideAnim.setValue(0);
    slideOpacity.setValue(1);
    setTimeout(() => phoneInputRef.current?.focus(), 200);
  };

  const phoneComplete = mobile.length === PHONE_LENGTH;
  const otpComplete = otp.length === OTP_LENGTH;

  return (
    <View style={[styles.screen, { backgroundColor: '#FFFBF0' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Geometric Background ── */}
      <BackgroundShapes />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + (SW * 0.1) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header ── */}
          <View style={styles.headerBlock}>
            <View style={styles.logoRing}>
              <Image
                source={{ uri: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1788798727/RuvoShop.png' }}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>RuVo Shop</Text>
            <Text style={styles.tagline}>Shopkeeper Portal · Manage your store</Text>
          </View>

          {/* ── Main Form Card ── */}
          <Animated.View
            style={[
              styles.card,
              { transform: [{ translateY: cardY }], opacity: cardOp },
            ]}
          >
            {/* Step Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerTextCol}>
                <Text style={styles.cardTitle}>
                  {step === 1 ? 'Login to your shop' : 'Enter OTP'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {step === 1
                    ? 'Sign in to manage your orders & products'
                    : `Code sent to +91 ${mobile}`}
                </Text>
              </View>
              {/* Step dots */}
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, { backgroundColor: '#F5B700', width: step === 1 ? 24 : 8 }]} />
                <View style={[styles.stepDot, { backgroundColor: step === 2 ? '#16A34A' : '#E5E7EB', width: step === 2 ? 24 : 8 }]} />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Step Content */}
            <Animated.View style={{ opacity: slideOpacity, transform: [{ translateX: slideAnim }] }}>
              {step === 1 ? (
                <>
                  <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                  <View style={[
                    styles.inputField,
                    focusedField === 'mobile' && { borderColor: '#F5B700', borderWidth: 1.5, backgroundColor: '#FFFBF0' },
                  ]}>
                    <View style={styles.prefixGroup}>
                      <Text style={{ fontSize: 16 }}>🇮🇳</Text>
                      <Text style={styles.prefixText}>+91</Text>
                    </View>
                    <View style={styles.inputSeparator} />
                    <TextInput
                      ref={phoneInputRef}
                      style={styles.textInput}
                      placeholder="10-digit number"
                      placeholderTextColor="#A8A29E"
                      keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
                      textContentType="telephoneNumber"
                      autoComplete="tel"
                      autoCorrect={false}
                      maxLength={PHONE_LENGTH}
                      value={mobile}
                      onChangeText={handleMobileChange}
                      onFocus={() => setFocusedField('mobile')}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOtp}
                    />
                    {phoneComplete && (
                      <View style={[styles.successTick, { backgroundColor: isValidMobile() ? '#16A34A' : '#DC2626' }]}>
                        <Ionicons name={isValidMobile() ? 'checkmark' : 'close'} size={14} color="#FFF" />
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>6-DIGIT OTP</Text>
                  <View style={[
                    styles.inputField,
                    { justifyContent: 'center' },
                    focusedField === 'otp' && { borderColor: '#16A34A', borderWidth: 1.5, backgroundColor: '#F0FDF4' },
                    otpComplete && !focusedField && { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
                  ]}>
                    <Ionicons
                      name="key-outline"
                      size={20}
                      color={focusedField === 'otp' ? '#16A34A' : '#A8A29E'}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      ref={otpInputRef}
                      style={[styles.textInput, { fontSize: 22, letterSpacing: 8, paddingLeft: 4, fontWeight: '700' }]}
                      placeholder="• • • • • •"
                      placeholderTextColor="#B8B0A5"
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      autoCorrect={false}
                      maxLength={OTP_LENGTH}
                      value={otp}
                      onChangeText={handleOtpChange}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyOtp}
                      autoFocus
                    />
                  </View>

                  {/* Resend + Change Number */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <TouchableOpacity onPress={handleChangeNumber} style={styles.resendAction}>
                      <Text style={{ color: '#F5B700', fontWeight: '700', fontSize: 13 }}>← Change number</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={resendTimer > 0 || resendLoading || loading}
                      onPress={handleResendOtp}
                      style={styles.resendAction}
                    >
                      {resendLoading ? (
                        <ActivityIndicator size="small" color="#F5B700" />
                      ) : (
                        <Text style={{ color: resendTimer > 0 ? '#A8A29E' : '#F5B700', fontWeight: '700', fontSize: 13 }}>
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Error */}
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* CTA Button */}
              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 6 }}>
                <TouchableOpacity
                  onPress={step === 1 ? handleSendOtp : handleVerifyOtp}
                  onPressIn={pressBtnIn}
                  onPressOut={pressBtnOut}
                  disabled={loading}
                  activeOpacity={1}
                >
                  <LinearGradient
                    colors={step === 1 ? ['#F5B700', '#E5A800'] : ['#16A34A', '#15803D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaButton}
                  >
                    {loading ? (
                      <ActivityIndicator color={step === 1 ? '#231C10' : '#FFFFFF'} />
                    ) : (
                      <>
                        <Text style={[styles.ctaText, { color: step === 1 ? '#231C10' : '#FFFFFF' }]}>
                          {step === 1 ? 'Get OTP' : 'Verify & Sign In'}
                        </Text>
                        <View style={[styles.ctaArrowCircle, { backgroundColor: step === 1 ? 'rgba(35,28,16,0.15)' : 'rgba(255,255,255,0.25)' }]}>
                          <Ionicons name="arrow-forward" size={16} color={step === 1 ? '#231C10' : '#FFFFFF'} />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Terms */}
              {step === 1 && (
                <Text style={styles.termsText}>
                  By continuing, you agree to our{' '}
                  <Text style={{ color: '#78716C' }}>Terms of Service</Text>
                  {' '}&{' '}
                  <Text style={{ color: '#78716C' }}>Privacy Policy</Text>
                </Text>
              )}
            </Animated.View>
          </Animated.View>

          {/* ── Shop Benefits ── */}
          {step === 1 && (
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>Why sell with RuVo?</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Benefit icon="storefront-outline" title="Local" subtitle="Reach nearby customers" />
                <Benefit icon="cart-outline" title="Orders" subtitle="Manage orders easily" />
                <Benefit icon="shield-checkmark-outline" title="Secure" subtitle="Protected account" />
              </View>
            </View>
          )}

          {/* ── Security Footer ── */}
          <View style={styles.bottomFooter}>
            <Ionicons name="shield-checkmark" size={12} color="#A8A29E" />
            <Text style={styles.securityText}>100% Secure & Encrypted</Text>
          </View>

          <View style={{ height: 24 }} />
=======
  const phoneDigits = mobile.replace(/[^0-9]/g, '').slice(-10);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Full-screen theme-aware gradient */}
      <LinearGradient
        colors={[
          colors.primary + '30',
          colors.primary + '10',
          colors.background
        ]}
        style={styles.fullScreenGradient}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: spacing.gutter, paddingTop: insets.top + 32 }]}
          keyboardShouldPersistTaps="handled"
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
                    backgroundColor: focusedField === 'mobile' ? colors.background : colors.surfaceSunken,
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
                    backgroundColor: focusedField === 'otp' ? colors.background : colors.surfaceSunken,
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

<<<<<<< HEAD
/* ===========================================================
   BENEFIT CARD
=========================================================== */
const Benefit = ({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) => (
  <View style={styles.benefitCard}>
    <View style={styles.benefitIconWrap}>
      <Ionicons name={icon} size={18} color="#F5B700" />
    </View>
    <Text style={styles.benefitTitle}>{title}</Text>
    <Text style={styles.benefitSubtitle}>{subtitle}</Text>
  </View>
);

/* ===========================================================
   STYLES
=========================================================== */
const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Header
  headerBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  logoImg: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 4,
    fontSize: 13,
    color: '#78716C',
    fontWeight: '500',
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextCol: { flex: 1 },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '500',
  },
  stepIndicator: { flexDirection: 'row', gap: 4, marginTop: 6 },
  stepDot: { height: 6, borderRadius: 3 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 20,
  },

  // Inputs
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#A8A29E',
    marginBottom: 8,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  prefixGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefixText: { fontSize: 15, fontWeight: '700', color: '#1C1917' },
  inputSeparator: { width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 12 },
  textInput: { flex: 1, fontSize: 16, color: '#1C1917' },
  successTick: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  resendAction: { paddingVertical: 8, marginBottom: 8 },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(217,74,74,0.3)',
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#D94A4A', fontWeight: '600' },

  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
    gap: 12,
  },
  ctaText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  ctaArrowCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  // Terms
  termsText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 10,
    lineHeight: 14,
    color: '#A8A29E',
  },

  // Benefits
  benefitsSection: { marginBottom: 28 },
  benefitsTitle: { fontSize: 16, fontWeight: '900', color: '#1C1917', marginBottom: 14 },
  benefitCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  benefitIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FFF9E0',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  benefitTitle: { fontSize: 13, fontWeight: '800', color: '#1C1917' },
  benefitSubtitle: { fontSize: 10, color: '#A8A29E', marginTop: 2 },

  // Footer
  bottomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  securityText: { fontSize: 10, color: '#A8A29E' },
});

export default LoginScreen;
=======
const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  fullScreenGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
