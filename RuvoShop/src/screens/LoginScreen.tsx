import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

interface AuthToken {
  accessToken: string;
  tokenType: string;
  userId: number | string;
  role: string;
  refreshToken?: string | null;
  verificationStatus?: string | null;
}

interface ApiResponse<T> {
  message: string;
  data: T;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export const LoginScreen = ({ navigation }: Props) => {
  const { login, requiredRole } = useAuth();
  const insets = useSafeAreaInsets();

  const phoneInputRef = useRef<TextInput>(null);
  const otpInputRef = useRef<TextInput>(null);

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [error, setError] = useState<string | null>(null);

  /* =========================================================
     PHONE
  ========================================================= */

  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, PHONE_LENGTH);

    setMobile(digits);

    if (error) {
      setError(null);
    }
  };

  const isValidMobile = () => {
    return /^[6-9]\d{9}$/.test(mobile);
  };

  const formattedMobile = `+91${mobile}`;

  /* =========================================================
     OTP
  ========================================================= */

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);

    setOtp(digits);

    if (error) {
      setError(null);
    }
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
      const endpoint =
        requiredRole === 'USER'
          ? '/auth/send-otp'
          : '/api/auth/otp/send';

      const res = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobileNumber: formattedMobile,
          }),
        },
      );

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          body?.message ||
            'Failed to send OTP. Please try again.',
        );
        return;
      }

      setOtp('');
      setError(null);
      setStep(2);
      setResendTimer(RESEND_SECONDS);

      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 300);
    } catch {
      setError(
        'Could not reach the server. Please check your internet connection.',
      );
    } finally {
      setLoading(false);
    }
  };

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
      const endpoint =
        requiredRole === 'USER'
          ? '/auth/verify-otp'
          : '/api/auth/otp/verify';

      const res = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobileNumber: formattedMobile,
            otpCode: otp,
            ...(requiredRole === 'USER'
              ? {}
              : { role: requiredRole }),
          }),
        },
      );

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          body?.message ||
            'Invalid OTP. Please try again.',
        );
        return;
      }

      const { data } = body as ApiResponse<AuthToken>;

      if (!data?.accessToken || !data?.userId) {
        setError(
          'Invalid response from server. Please try again.',
        );
        return;
      }

      await login(
        data.accessToken,
        String(data.userId),
        data.role,
      );
    } catch {
      setError(
        'Could not reach the server. Please check your internet connection.',
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     RESEND TIMER
  ========================================================= */

  useEffect(() => {
    if (resendTimer <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendTimer((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  /* =========================================================
     RESEND OTP
  ========================================================= */

  const handleResendOtp = async () => {
    if (
      resendTimer > 0 ||
      resendLoading ||
      loading
    ) {
      return;
    }

    setError(null);
    setResendLoading(true);

    try {
      const endpoint =
        requiredRole === 'USER'
          ? '/auth/send-otp'
          : '/api/auth/otp/send';

      const res = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobileNumber: formattedMobile,
          }),
        },
      );

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          body?.message ||
            'Could not resend OTP.',
        );
        return;
      }

      setOtp('');
      setResendTimer(RESEND_SECONDS);

      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 200);
    } catch {
      setError(
        'Could not reach the server. Please check your internet connection.',
      );
    } finally {
      setResendLoading(false);
    }
  };

  /* =========================================================
     CHANGE NUMBER
  ========================================================= */

  const handleChangeNumber = () => {
    setStep(1);
    setOtp('');
    setError(null);
    setResendTimer(0);

    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 200);
  };

  const phoneComplete =
    mobile.length === PHONE_LENGTH;

  const otpComplete =
    otp.length === OTP_LENGTH;

  return (
    <View className="flex-1 bg-ruvo-bg">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <LinearGradient
        colors={['#FFF7E3', '#FBF8F2']}
        className="absolute top-0 left-0 right-0 h-64"
        style={{
          paddingTop: insets.top,
        }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? insets.top
            : 0
        }
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 28,
            paddingBottom:
              Math.max(insets.bottom, 24) + 24,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
        >
          {/* =================================================
              BRAND
          ================================================== */}

          <Animated.View
            entering={FadeInUp.duration(450)}
            className="mb-8"
          >
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-2xl bg-ruvo-yellow items-center justify-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Ionicons
                  name="storefront"
                  size={25}
                  color="#231C10"
                />
              </View>

              <View className="ml-3">
                <Text className="text-xl font-extrabold text-ruvo-ink">
                  RuVo Shop
                </Text>

                <Text className="text-xs text-warm-600 mt-0.5">
                  Shopkeeper Portal
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* =================================================
              PROGRESS
          ================================================== */}

          <Animated.View
            entering={FadeInUp.delay(80).duration(450)}
            className="flex-row items-center mb-6"
          >
            <View className="h-1.5 flex-1 rounded-full bg-ruvo-yellow" />

            <View className="w-2" />

            <View
              className={`h-1.5 flex-1 rounded-full ${
                step === 2
                  ? 'bg-ruvo-yellow'
                  : 'bg-warm-300'
              }`}
            />
          </Animated.View>

          {/* =================================================
              HEADING
          ================================================== */}

          <Animated.View
            entering={FadeInUp.delay(140).duration(450)}
            className="mb-6"
          >
            <Text className="text-3xl font-extrabold text-ruvo-ink">
              {step === 1
                ? 'Welcome back'
                : 'Verify your number'}
            </Text>

            <Text className="text-base text-warm-600 mt-2 leading-6">
              {step === 1
                ? 'Sign in to manage your shop and orders.'
                : `Enter the 6-digit code sent to +91 ${mobile}`}
            </Text>
          </Animated.View>

          {/* =================================================
              FORM CARD
          ================================================== */}

          <Animated.View
            entering={FadeInUp.delay(220).duration(450)}
            className="bg-ruvo-surface rounded-2xl p-5 border border-warm-200"
            style={{
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 5,
              },
              shadowOpacity: 0.07,
              shadowRadius: 14,
              elevation: 3,
            }}
          >
            {step === 1 ? (
              <>
                {/* Mobile Label */}

                <Text className="text-sm font-bold text-ruvo-ink mb-2">
                  Mobile number
                </Text>

                {/* Mobile Input */}

                <View
                  className={`flex-row items-center h-14 rounded-xl border ${
                    error
                      ? 'border-red-400 bg-red-50'
                      : 'border-warm-300 bg-warm-100'
                  }`}
                >
                  {/* Country Code */}

                  <View className="h-8 px-4 border-r border-warm-300 justify-center">
                    <Text className="text-base font-bold text-ruvo-ink">
                      🇮🇳 +91
                    </Text>
                  </View>

                  {/* Text Input */}

                  <TextInput
                    ref={phoneInputRef}
                    value={mobile}
                    onChangeText={handleMobileChange}
                    placeholder="Enter mobile number"
                    placeholderTextColor="#A79E92"
                    keyboardType={
                      Platform.OS === 'ios'
                        ? 'number-pad'
                        : 'phone-pad'
                    }
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    autoCorrect={false}
                    maxLength={PHONE_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                    className="flex-1 px-4 text-base font-semibold text-ruvo-ink"
                    style={{
                      height: 56,
                      paddingVertical: 0,
                    }}
                  />

                  {phoneComplete && (
                    <View className="pr-4">
                      <Ionicons
                        name={
                          isValidMobile()
                            ? 'checkmark-circle'
                            : 'alert-circle'
                        }
                        size={21}
                        color={
                          isValidMobile()
                            ? '#16A34A'
                            : '#DC2626'
                        }
                      />
                    </View>
                  )}
                </View>

                <Text className="text-xs text-warm-500 mt-2">
                  We'll send a verification code to this number.
                </Text>
              </>
            ) : (
              <>
                {/* OTP Label */}

                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold text-ruvo-ink">
                    Verification code
                  </Text>

                  <Text className="text-xs font-semibold text-warm-500">
                    6 digits
                  </Text>
                </View>

                {/* OTP Input */}

                <View
                  className={`rounded-xl border ${
                    error
                      ? 'border-red-400 bg-red-50'
                      : otpComplete
                        ? 'border-ruvo-yellow bg-yellow-50'
                        : 'border-warm-300 bg-warm-100'
                  }`}
                >
                  <TextInput
                    ref={otpInputRef}
                    value={otp}
                    onChangeText={handleOtpChange}
                    placeholder="••••••"
                    placeholderTextColor="#B8B0A5"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    autoCorrect={false}
                    maxLength={OTP_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOtp}
                    className="text-center text-2xl font-bold text-ruvo-ink"
                    style={{
                      height: 64,
                      letterSpacing: 10,
                      paddingVertical: 0,
                    }}
                  />
                </View>

                {/* Resend */}

                <View className="flex-row items-center justify-center mt-5">
                  <Text className="text-sm text-warm-600">
                    Didn't receive the code?
                  </Text>

                  <TouchableOpacity
                    disabled={
                      resendTimer > 0 ||
                      resendLoading ||
                      loading
                    }
                    onPress={handleResendOtp}
                  >
                    {resendLoading ? (
                      <ActivityIndicator
                        size="small"
                        color="#F5B700"
                      />
                    ) : (
                      <Text
                        className={`text-sm font-bold ${
                          resendTimer > 0
                            ? 'text-warm-400'
                            : 'text-ruvo-yellow-dark'
                        }`}
                      >
                        {resendTimer > 0
                          ? `Resend in ${resendTimer}s`
                          : 'Resend OTP'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* =================================================
                ERROR
            ================================================== */}

            {error && (
              <Animated.View
                entering={FadeIn.duration(200)}
                className="flex-row items-start bg-red-50 border border-red-200 rounded-xl p-3 mt-4"
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color="#DC2626"
                />

                <Text className="flex-1 ml-2 text-sm text-red-600 leading-5">
                  {error}
                </Text>
              </Animated.View>
            )}

            {/* =================================================
                CTA
            ================================================== */}

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={
                step === 1
                  ? handleSendOtp
                  : handleVerifyOtp
              }
              className={`h-14 rounded-xl items-center justify-center flex-row mt-5 ${
                loading
                  ? 'bg-ruvo-yellow opacity-70'
                  : 'bg-ruvo-yellow'
              }`}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#231C10"
                  />

                  <Text className="text-ruvo-ink font-bold ml-2">
                    {step === 1
                      ? 'Sending OTP...'
                      : 'Verifying...'}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-ruvo-ink text-base font-bold">
                    {step === 1
                      ? 'Get OTP'
                      : 'Verify & Sign In'}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#231C10"
                    style={{
                      marginLeft: 8,
                    }}
                  />
                </>
              )}
            </TouchableOpacity>

            {/* =================================================
                CHANGE NUMBER
            ================================================== */}

            {step === 2 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleChangeNumber}
                className="flex-row items-center justify-center mt-4 py-2"
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color="#F5B700"
                />

                <Text className="text-sm font-bold text-ruvo-yellow-dark ml-1">
                  Change mobile number
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* =================================================
              SHOP BENEFITS
          ================================================== */}

          {step === 1 && (
            <Animated.View
              entering={FadeInDown.delay(320).duration(450)}
              className="mt-7"
            >
              <Text className="text-base font-bold text-ruvo-ink mb-4">
                Why sell with RuVo?
              </Text>

              <View className="flex-row">
                <Benefit
                  icon="storefront-outline"
                  title="Local"
                  subtitle="Reach nearby customers"
                />

                <View className="w-3" />

                <Benefit
                  icon="cart-outline"
                  title="Orders"
                  subtitle="Manage orders easily"
                />

                <View className="w-3" />

                <Benefit
                  icon="shield-checkmark-outline"
                  title="Secure"
                  subtitle="Protected account"
                />
              </View>
            </Animated.View>
          )}

          {/* =================================================
              SECURITY
          ================================================== */}

          <Animated.View
            entering={FadeInDown.delay(400).duration(450)}
            className="items-center mt-auto pt-8"
          >
            <View className="flex-row items-center">
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color="#A79E92"
              />

              <Text className="text-xs text-warm-500 ml-1.5">
                Your information is encrypted and secure
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

/* ===========================================================
   BENEFIT
=========================================================== */

const Benefit = ({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) => {
  return (
    <View className="flex-1 bg-ruvo-surface border border-warm-200 rounded-xl p-3">
      <View className="w-9 h-9 rounded-lg bg-ruvo-yellow-soft items-center justify-center mb-2">
        <Ionicons
          name={icon}
          size={18}
          color="#F5B700"
        />
      </View>

      <Text className="text-sm font-bold text-ruvo-ink">
        {title}
      </Text>

      <Text className="text-[10px] text-warm-500 mt-0.5">
        {subtitle}
      </Text>
    </View>
  );
};

export default LoginScreen;