import React, { useRef, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, typography, radius, shadows, spacing } = useTheme();

  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressBtnIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressBtnOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const handleSendOtp = async () => {
    const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api('/api/auth/otp/send', null, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: '+91' + cleanMobile }),
      });
      navigation.navigate('OtpVerification', { mobileNumber: '+91' + cleanMobile });
    } catch (err: any) {
      setError(err.message || 'Check your network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {navigation.canGoBack() && (
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surfaceSunken, borderRadius: radius.sm }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
              <Ionicons name="bicycle" size={26} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={[typography.headingM, { color: colors.primary, fontWeight: '800' }]}>
                RuVo Partner
              </Text>
              <Text style={[typography.caption, { color: colors.textHint }]}>
                Delivery Partner Portal
              </Text>
            </View>
          </View>

          {/* Heading */}
          <Text style={[typography.headingXL, styles.title, { color: colors.textPrimary }]}>
            Sign In
          </Text>
          <Text style={[typography.body, styles.subtitle, { color: colors.textSecondary }]}>
            Enter your mobile number to receive an OTP
          </Text>

          {/* Form card */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card, padding: spacing.cardPad }, shadows.md]}>
            <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
              Mobile Number
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
              <View style={[styles.prefixBox, { borderRightColor: colors.border }]}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 14 }]}>
                  🇮🇳  +91
                </Text>
              </View>
              <TextInput
                style={[typography.body, styles.input, { color: colors.textPrimary }]}
                placeholder="10-digit number"
                placeholderTextColor={colors.placeholder}
                value={mobileNumber}
                onChangeText={t => { setMobileNumber(t); setError(null); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />
              {mobileNumber.length === 10 && (
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
                onPress={handleSendOtp}
                onPressIn={pressBtnIn}
                onPressOut={pressBtnOut}
                disabled={loading}
                activeOpacity={1}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <Text style={[typography.button, { color: colors.onPrimary }]}>Send OTP</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Trust */}
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textHint} />
            <Text style={[typography.caption, { color: colors.textHint, fontSize: 11 }]}>
              Secure OTP-based login
            </Text>
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
  content: {
    flex: 1, justifyContent: 'center', paddingHorizontal: 24,
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32,
  },
  brandIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: 6 },
  subtitle: { marginBottom: 28, lineHeight: 20 },
  formCard: { borderWidth: 1, marginBottom: 20 },
  label: { marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    height: 52, marginBottom: 16, paddingHorizontal: 14, gap: 10,
  },
  inputFocused: { borderWidth: 2 },
  prefixBox: { paddingRight: 10, borderRightWidth: 1, height: '60%', justifyContent: 'center' },
  input: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginBottom: 14 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, gap: 8,
  },
  trustRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
});
