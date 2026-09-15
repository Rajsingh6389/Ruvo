import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const OtpVerificationScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  
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
    <SafeAreaView className="flex-1 bg-ruvo-ink">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Decorative Glow Elements */}
      <View className="absolute top-0 right-[-50px] w-64 h-64 bg-[#FF7A00]/10 rounded-full blur-3xl opacity-50" />
      
      {/* Back */}
      <TouchableOpacity
        className="absolute top-4 left-4 z-10 w-10 h-10 bg-white/5 rounded-full items-center justify-center border border-white/10"
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={22} color="#FFF" />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 justify-center px-6 items-center">
          {/* Icon */}
          <View className="w-20 h-20 items-center justify-center mb-6 rounded-[24px] bg-[#FF7A00]/10 border border-[#FF7A00]/30 animate-pulse">
            <Ionicons name="shield-checkmark" size={40} color="#FF7A00" />
          </View>

          <Text className="text-white text-3xl font-black tracking-tight mb-2">
            Verify OTP
          </Text>
          <Text className="text-gray-400 text-sm font-bold text-center leading-5 mb-8">
            Enter the 6-digit code sent to{'\n'}
            <Text className="text-white font-black tracking-wider">
              ••••••{shortNumber}
            </Text>
          </Text>

          {/* Premium Form Glassmorphism Card */}
          <View 
            className="w-full bg-[#1C2026] border border-gray-800 rounded-[32px] p-6 mb-5"
            style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 12}, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 }}
          >
            <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">
              6-Digit Secure Code
            </Text>

            <View 
              className={`flex-row items-center h-14 rounded-2xl px-4 border ${focused ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'} transition-all mb-4`}
            >
              <Ionicons name="key-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 text-white text-3xl font-black ml-3 tracking-[8px] text-center"
                placeholder="••••••"
                placeholderTextColor="#4B5563"
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
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              )}
            </View>

            {/* Error Message */}
            {error ? (
              <View className="flex-row items-center gap-xs bg-red-500/10 border border-red-500/30 p-3 rounded-xl mb-4">
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text className="flex-1 text-red-500 font-bold text-xs">{error}</Text>
              </View>
            ) : null}

            {/* Giant CTA Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                className={`h-14 rounded-2xl items-center justify-center flex-row gap-2 ${loading ? 'bg-[#FF7A00]/70' : 'bg-[#FF7A00]'}`}
                style={{ shadowColor: '#FF7A00', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}
                onPress={handleVerify}
                onPressIn={pressBtnIn}
                onPressOut={pressBtnOut}
                disabled={loading}
                activeOpacity={1}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text className="text-white font-black text-base">VERIFY & CONTINUE</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Resend */}
            <View className="items-center justify-center mt-6">
              {!canResend ? (
                <Text className="text-gray-400 text-sm font-bold">
                  Resend OTP in{' '}
                  <Text className="text-[#FF7A00] font-black">
                    {`00:${timer < 10 ? '0' : ''}${timer}`}
                  </Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7} className="flex-row gap-1 items-center">
                  <Ionicons name="reload" size={14} color="#FF7A00" />
                  <Text className="text-[#FF7A00] text-sm font-black uppercase">
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
