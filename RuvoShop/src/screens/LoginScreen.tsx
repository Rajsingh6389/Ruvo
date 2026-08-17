import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';

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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F7F8FA',
  white: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  borderFocused: '#2E7D32',
  error: '#E53935',
  errorLight: '#FDECEC',
};

export const LoginScreen = ({ navigation }: Props) => {
  const { login, requiredRole } = useAuth();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = Enter Phone, 2 = Enter OTP
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
      const res = await fetch(`${API_BASE_URL}${requiredRole === 'USER' ? '/auth/send-otp' : '/api/auth/otp/send'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formatted }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.message ?? 'Failed to send OTP. Please try again.');
        return;
      }

      if (body?.data?.otpCode) {
        setSimulatedOtp(body.data.otpCode);
      }
      setStep(2);
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const formatted = formatMobileNumber(mobile);
      const res = await fetch(`${API_BASE_URL}${requiredRole === 'USER' ? '/auth/verify-otp' : '/api/auth/otp/verify'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: formatted,
          otpCode: otp.trim(),
          ...(requiredRole === 'USER' ? {} : { role: requiredRole }),
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.message ?? 'Invalid OTP code');
        return;
      }

      const { data } = body as ApiResponse<AuthToken>;
      await login(data.accessToken, String(data.userId), data.role);
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fieldBorder = (field: string) =>
    focusedField === field ? COLORS.borderFocused : COLORS.border;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBadge}>
            <Ionicons name="storefront-outline" size={26} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Welcome to RuVo</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Enter your mobile number to get started'
              : `Enter OTP sent to +91 ${mobile.replace(/[^0-9]/g, '').slice(-10)}`}
          </Text>

          <View style={styles.form}>
            {step === 1 ? (
              <>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={[styles.inputWrap, { borderColor: fieldBorder('mobile') }]}>
                  <Text style={styles.countryPrefix}>+91</Text>
                  <View style={styles.prefixDivider} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 10-digit mobile number"
                    placeholderTextColor="#A0A4AC"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobile}
                    onChangeText={setMobile}
                    onFocus={() => setFocusedField('mobile')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={[styles.button, loading && styles.buttonDisabled]}
                  accessibilityRole="button"
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>Get OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>6-Digit OTP</Text>
                <View style={[styles.inputWrap, { borderColor: fieldBorder('otp') }]}>
                  <Ionicons name="key-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#A0A4AC"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    onFocus={() => setFocusedField('otp')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOtp}
                  />
                </View>



                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={[styles.button, loading && styles.buttonDisabled]}
                  accessibilityRole="button"
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setStep(1); setError(null); }}
                  style={styles.changePhoneBtn}
                >
                  <Text style={styles.changePhoneText}>Change Mobile Number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to RuVo? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.SIGNUP)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  brandBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },

  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },

  form: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  label: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  countryPrefix: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  prefixDivider: { width: 1, height: 20, backgroundColor: COLORS.border, marginHorizontal: 10 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '500' },

  devOtpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  devOtpText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.errorLight,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 14,
  },
  error: { color: COLORS.error, fontSize: 12, fontWeight: '600', flexShrink: 1 },

  button: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  changePhoneBtn: { marginTop: 14, alignItems: 'center' },
  changePhoneText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: COLORS.textSecondary, fontSize: 13 },
  footerLink: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
