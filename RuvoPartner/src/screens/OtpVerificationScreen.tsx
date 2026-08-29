import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export const OtpVerificationScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const { colors, typography, radius, shadows, spacing } = useTheme();

  const { mobileNumber } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(59);
  const [canResend, setCanResend] = useState(false);
  const [focused, setFocused] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressBtnIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressBtnOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter the full 6-digit OTP code');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api<any>('/api/auth/otp/verify', null, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, otpCode: code, role: 'DELIVERY_PARTNER' }),
      });
      const session = data?.data;
      if (!session?.accessToken || session.userId == null) {
        throw new Error('RuVo did not return a valid session. Please try again.');
      }
      await login(session.accessToken, null, String(session.userId), session.role, session.verificationStatus || 'NEW');
    } catch (err: any) {
      setError(err.message || 'Incorrect OTP code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    setError(null);
    try {
      await api('/api/auth/otp/send', null, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
      });
      setTimer(59);
      setCanResend(false);
      setCode('');
      Alert.alert('OTP Sent', 'A new OTP was sent to your mobile number.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const shortNumber = mobileNumber?.slice(-4);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Back */}
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.surfaceSunken, borderRadius: radius.sm }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft, borderRadius: 40 }]}>
            <Ionicons name="phone-portrait-outline" size={44} color={colors.primary} />
          </View>

          <Text style={[typography.headingXL, styles.title, { color: colors.textPrimary }]}>
            Verify OTP
          </Text>
          <Text style={[typography.body, styles.subtitle, { color: colors.textSecondary }]}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              ••••••{shortNumber}
            </Text>
          </Text>

          {/* Form card */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card, padding: spacing.cardPad }, shadows.md]}>
            <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
              6-Digit OTP
            </Text>

            <View style={[
              styles.inputWrap,
              {
                backgroundColor: colors.surfaceSunken,
                borderColor: focused ? colors.primary : colors.border,
                borderRadius: radius.input,
              },
              focused && styles.inputFocused,
            ]}>
              <Ionicons name="key-outline" size={20} color={colors.textHint} />
              <TextInput
                style={[
                  typography.body,
                  styles.input,
                  { color: colors.textPrimary, letterSpacing: 8, fontSize: 22, textAlign: 'center' },
                ]}
                placeholder="• • • • • •"
                placeholderTextColor={colors.placeholder}
                value={code}
                onChangeText={t => { setCode(t); setError(null); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                autoFocus
              />
              {code.length === 6 && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              )}
            </View>

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
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: radius.button }, shadows.brand]}
                onPress={handleVerify}
                onPressIn={pressBtnIn}
                onPressOut={pressBtnOut}
                disabled={loading}
                activeOpacity={1}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <Text style={[typography.button, { color: colors.onPrimary }]}>Verify & Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Resend */}
            <View style={styles.resendRow}>
              {!canResend ? (
                <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13 }]}>
                  Resend OTP in{' '}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {`00:${timer < 10 ? '0' : ''}${timer}`}
                  </Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={[typography.bodyStrong, { color: colors.primary }]}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  backBtn: {
    position: 'absolute', top: 16, left: 16, zIndex: 10,
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, alignItems: 'center' },
  iconCircle: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { marginBottom: 8 },
  subtitle: { textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  formCard: { borderWidth: 1, width: '100%', marginBottom: 20 },
  label: { marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    height: 56, marginBottom: 16, paddingHorizontal: 14, gap: 10,
  },
  inputFocused: { borderWidth: 2 },
  input: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginBottom: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  resendRow: { alignItems: 'center', marginTop: 16 },
});
