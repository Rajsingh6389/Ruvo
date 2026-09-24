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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROUTES } from '../constants/routes';
import { sendOtp, verifyOtp } from '../services/authService';

const { width: SW } = Dimensions.get('window');

interface AuthToken { accessToken: string; tokenType: string; userId: number | string; role: string; }
interface ApiResponse<T> { message: string; data: T; }

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// ── Animated Background Shapes (Looping Pulsing & Floating Glow) ──
const AnimatedBackgroundShapes = ({ isDark }: { isDark: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Continuous pulsing opacity
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 3500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 3500, useNativeDriver: true }),
      ])
    ).start();

    // 2. Gentle floating vertical motion
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
      {/* 1. Top Right Sunset Orange Blob (Pulsing & Floating) */}
      <Animated.View
        style={{
          position: 'absolute', top: -60, right: -50, width: 240, height: 240,
          borderRadius: 120, opacity: Animated.multiply(pulseAnim, baseOpacity),
          transform: [{ translateY: floatAnim }, { rotate: '45deg' }]
        }}
      >
        <LinearGradient
          colors={['#FF7A00', '#FF4500']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* 2. Top Left Warm Amber Circle */}
      <Animated.View
        style={{
          position: 'absolute', top: 50, left: -70, width: 180, height: 180,
          borderRadius: 90, opacity: Animated.multiply(pulseAnim, baseOpacity * 0.9),
          transform: [{ translateY: Animated.multiply(floatAnim, -0.8) }]
        }}
      >
        <LinearGradient
          colors={['#F59E0B', '#FBBF24']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* 3. Middle Left Purple/Pink Coral Blob */}
      <Animated.View
        style={{
          position: 'absolute', top: 320, left: -50, width: 120, height: 220,
          borderRadius: 60, opacity: Animated.multiply(pulseAnim, baseOpacity * 0.8),
          transform: [{ translateY: floatAnim }, { rotate: '-20deg' }]
        }}
      >
        <LinearGradient
          colors={['#EC4899', '#8B5CF6']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* 4. Middle Right Customer Electric Blue Sphere */}
      <Animated.View
        style={{
          position: 'absolute', top: 280, right: -40, width: 150, height: 150,
          borderRadius: 75, opacity: Animated.multiply(pulseAnim, baseOpacity * 0.7),
          transform: [{ translateY: Animated.multiply(floatAnim, -1.2) }]
        }}
      >
        <LinearGradient
          colors={['#3B82F6', '#60A5FA']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* 5. Bottom Emerald Prosperity Arc */}
      <Animated.View
        style={{
          position: 'absolute', bottom: -60, left: '15%', width: 280, height: 180,
          borderRadius: 140, opacity: Animated.multiply(pulseAnim, baseOpacity * 0.6),
          transform: [{ translateY: floatAnim }]
        }}
      >
        <LinearGradient
          colors={['#10B981', '#34D399']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Glassmorphism soft wash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10,10,12,0.45)' : 'rgba(255,255,255,0.35)' }]} />
    </View>
  );
};

export const LoginScreen = ({ navigation }: Props) => {
  const { login, requiredRole } = useAuth();
  const { colors, typography, radius, shadows, spacing, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Smooth entrance
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

  // Slide transition between steps
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
    });
  };

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
    try {
      const { ok, data } = await sendOtp(formatted);
      if (!ok) { setError(data?.message ?? 'Failed to send OTP. Please try again.'); return; }
      navigateToStep2();
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
      const requiredRoleParam = requiredRole === 'USER' ? {} : { role: requiredRole };
      const { ok, data: bodyData } = await verifyOtp(formatted, otp.trim(), requiredRoleParam);
      if (!ok) { setError(bodyData?.message ?? 'Invalid OTP code'); return; }
      const { data } = bodyData as ApiResponse<AuthToken>;
      await login(data.accessToken, String(data.userId), data.role);
    } catch (err: any) {
      setError(`Cannot reach server: ${err?.message || 'Network request failed'}`);
    } finally { setLoading(false); }
  };

  const phoneDigits = mobile.replace(/[^0-9]/g, '').slice(-10);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ── Animated Background ── */}
      <AnimatedBackgroundShapes isDark={isDark} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + (SW * 0.06), paddingBottom: insets.bottom + 120 }
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Graphic Header ── */}
          <View style={styles.headerBlock}>
            <View style={[
              styles.logoRing, 
              { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
              isDark ? shadows.md : shadows.sm
            ]}>
              <Image
                source={require('../../assets/images/RuvoIcon.png')}
                style={styles.logoImg}
              />
            </View>
            <Text style={[typography.headingXL, styles.brandName, { color: colors.textPrimary }]}>
              RuVo
            </Text>
            <Text style={[typography.body, styles.tagline, { color: colors.textSecondary }]}>
              India's premium local marketplace
            </Text>
          </View>

          {/* ── Main Form Card ── */}
          <Animated.View style={[
            styles.card,
            { backgroundColor: isDark ? 'rgba(25,25,25,0.75)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 28 },
            isDark ? shadows.md : shadows.lg,
            { transform: [{ translateY: cardY }], opacity: cardOp }
          ]}>
            {/* Step Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerTextCol}>
                <Text style={[typography.headingL, { color: colors.textPrimary, fontWeight: '900', marginBottom: 2 }]}>
                  {step === 1 ? 'Login or Signup' : 'Enter OTP'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {step === 1 ? 'Get started with your mobile number' : `Sent to +91 ${phoneDigits}`}
                </Text>
              </View>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, { backgroundColor: colors.primary, width: step === 1 ? 24 : 8 }]} />
                <View style={[styles.stepDot, { backgroundColor: step === 2 ? '#16A34A' : (isDark ? '#444' : '#E5E7EB'), width: step === 2 ? 24 : 8 }]} />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

            {/* Step Content */}
            <Animated.View style={{ opacity: slideOpacity, transform: [{ translateX: slideAnim }] }}>
              {step === 1 ? (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textHint }]}>MOBILE NUMBER</Text>
                  <View style={[
                    styles.inputField,
                    { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)', borderColor: focusedField === 'mobile' ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') },
                    focusedField === 'mobile' && { borderWidth: 1.5 }
                  ]}>
                    <View style={styles.prefixGroup}>
                      <Text style={{ fontSize: 16 }}>🇮🇳</Text>
                      <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>+91</Text>
                    </View>
                    <View style={[styles.inputSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                    <TextInput
                      style={[typography.body, styles.textInput, { color: colors.textPrimary }]}
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
                      style={[typography.headingL, styles.textInput, { color: colors.textPrimary, letterSpacing: 8, paddingLeft: 4 }]}
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
                  
                  <TouchableOpacity onPress={() => { setStep(1); setOtp(''); setError(null); }} style={styles.resendAction}>
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Wrong number? Change</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Error */}
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(217,74,74,0.2)' : '#FEF2F2', borderColor: 'rgba(217,74,74,0.3)' }]}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={[typography.caption, { color: isDark ? '#fca5a5' : '#D94A4A', flex: 1, fontWeight: '600' }]}>{error}</Text>
                </View>
              ) : null}

              {/* CTA */}
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
                          <Text style={[typography.button, { color: '#FFFFFF', fontSize: 16, letterSpacing: 0.5 }]}>
                            {step === 1 ? 'Continue' : 'Verify & Secure Login'}
                          </Text>
                          <View style={styles.ctaArrowCircle}>
                            <Ionicons name="arrow-forward" size={16} color={step === 1 ? '#FF6B35' : '#15803D'} />
                          </View>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Terms Footer directly under CTA */}
              {step === 1 && (
                <Text style={[typography.caption, { color: colors.textHint, textAlign: 'center', marginTop: 16, fontSize: 10, lineHeight: 14 }]}>
                  By continuing, you agree to our <Text style={{ color: colors.textSecondary }}>Terms of Service</Text> & <Text style={{ color: colors.textSecondary }}>Privacy Policy</Text>
                </Text>
              )}
            </Animated.View>
          </Animated.View>

          {/* ── Footer ── */}
          <View style={styles.bottomFooter}>
            <View style={styles.footerRow}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>New to RuVo? </Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.SIGNUP)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>Create an Account</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark" size={12} color={colors.textHint} />
              <Text style={[typography.caption, { color: colors.textHint, fontSize: 10 }]}>100% Secure & Encrypted</Text>
            </View>
          </View>
          
          <View style={{ height: spacing.gutter }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  
  // Header
  headerBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRing: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 2,
    marginBottom: 16,
  },
  trustBadges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
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
    marginVertical: 20,
    opacity: 0.5,
  },

  // Inputs
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
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
    marginBottom: 12,
  },
  prefixGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputSeparator: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
  },
  successTick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendAction: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 8,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
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
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
