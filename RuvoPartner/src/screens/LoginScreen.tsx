import React, {useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

/* RuVo Partner Login - Premium UI Redesign */

interface ApiResponse<T> {
  message: string;
  data: T;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// ── Animated Partner Background (Electric Fleet Blue & Cyber Cyan) ──
const AnimatedPartnerBackground = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.9, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 3200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -16, duration: 3800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 16, duration: 3800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
      {/* 1. Top Right Electric Blue Speed Aura */}
      <Animated.View
        style={{
          position: 'absolute', top: -80, right: -80, width: 280, height: 280,
          borderRadius: 140, opacity: pulseAnim,
          transform: [{ translateY: floatAnim }]
        }}
      >
        <LinearGradient
          colors={['#2563EB', '#3B82F6']}
          style={{ width: '100%', height: '100%', borderRadius: 140 }}
        />
      </Animated.View>

      {/* 2. Bottom Left Cyber Cyan Radar Glow */}
      <Animated.View
        style={{
          position: 'absolute', bottom: -80, left: -80, width: 260, height: 260,
          borderRadius: 130, opacity: Animated.multiply(pulseAnim, 0.7),
          transform: [{ translateY: Animated.multiply(floatAnim, -1) }]
        }}
      >
        <LinearGradient
          colors={['#0284C7', '#06B6D4']}
          style={{ width: '100%', height: '100%', borderRadius: 130 }}
        />
      </Animated.View>

      {/* 3. Center Glow Pulse */}
      <Animated.View
        style={{
          position: 'absolute', top: '40%', left: '30%', width: 160, height: 160,
          borderRadius: 80, opacity: Animated.multiply(pulseAnim, 0.35),
          transform: [{ scale: Animated.add(1, Animated.multiply(pulseAnim, 0.2)) }]
        }}
      >
        <LinearGradient
          colors={['#4F46E5', '#3B82F6']}
          style={{ width: '100%', height: '100%', borderRadius: 80 }}
        />
      </Animated.View>

      {/* Dark Ambient Overlay */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 15, 25, 0.75)' }} />
    </View>
  );
};

export const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Hardcoded for Partners
  const requiredRole = 'DELIVERY_PARTNER';

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
    try {
      await authService.sendOtp(formatted);
      setStep(2);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) { setError('Please enter the 6-digit OTP code'); return; }
    setError(null);
    setLoading(true);
    try {
      const formatted = formatMobileNumber(mobile);
      const data = await authService.verifyOtp(formatted, otp.trim(), requiredRole);
      
      await login(data.accessToken, null, String(data.userId), data.role, 'NEW');
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const phoneDigits = mobile.replace(/[^0-9]/g, '').slice(-10);

  return (
    <View className="flex-1 bg-[#0A0E1A]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Decorative Animated Glow Background */}
      <AnimatedPartnerBackground />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 120, paddingTop: insets.top + 24, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Row */}
          <View className="items-center justify-center mb-sm">
            <Image
              source={{ uri: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1788798945/RuvoPartner.png' }}
              style={{ width: 140, height: 60, resizeMode: 'contain', tintColor: '#FFF' }}
            />
          </View>
          <Text className="text-white text-center font-black text-xl tracking-tight mb-md">RuVo Partner</Text>

          {/* Dynamic Step Header */}
          <View className="items-center mb-xl">
            <View className="flex-row items-center gap-xs mb-md">
              <View className={`h-2 rounded-full transition-all duration-300 ${step >= 1 ? 'w-6 bg-[#FF7A00]' : 'w-2 bg-gray-700'}`} />
              <View className={`h-2 rounded-full transition-all duration-300 ${step >= 2 ? 'w-6 bg-[#FF7A00]' : 'w-2 bg-gray-700'}`} />
            </View>
            <Text className="text-white text-3xl font-black tracking-tight mb-2">
              {step === 1 ? 'Start delivering' : 'Verify OTP'}
            </Text>
            <Text className="text-gray-400 text-sm font-bold text-center leading-5 px-sm">
              {step === 1
                ? 'Enter your mobile number to continue as a RuVo delivery partner.'
                : `We've sent a 6-digit code to +91 ${phoneDigits}`}
            </Text>
          </View>

          {/* Premium Form Glassmorphism Card */}
          <View 
            className="bg-[#1C2026] border border-gray-800 rounded-[32px] p-6 mb-lg"
            style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 12}, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 }}
          >
            {step === 1 ? (
              <View className="mb-md">
                <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">
                  Mobile Number
                </Text>
                <View 
                  className={`flex-row items-center h-14 rounded-2xl px-4 border ${focusedField === 'mobile' ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'} transition-all`}
                >
                  <View className="pr-3 pb-1 border-r border-gray-800 justify-center">
                    <Text className="text-white font-bold text-base">🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    className="flex-1 text-white text-lg font-bold ml-3"
                    placeholder="10-digit number"
                    placeholderTextColor="#6B7280"
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
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  )}
                </View>
              </View>
            ) : (
              <View className="mb-md">
                <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">
                  6-Digit OTP
                </Text>
                <View 
                  className={`flex-row items-center h-14 rounded-2xl px-4 border ${focusedField === 'otp' ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'} transition-all`}
                >
                  <Ionicons name="key-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 text-white text-2xl font-black ml-3 tracking-[8px]"
                    placeholder="••••••"
                    placeholderTextColor="#4B5563"
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
              </View>
            )}

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
                onPress={step === 1 ? handleSendOtp : handleVerifyOtp}
                onPressIn={pressBtnIn}
                onPressOut={pressBtnOut}
                disabled={loading}
                activeOpacity={1}
                className={`h-14 rounded-2xl items-center justify-center flex-row gap-2 ${loading ? 'bg-[#FF7A00]/70' : 'bg-[#FF7A00]'}`}
                style={{ shadowColor: '#FF7A00', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text className="text-white font-black text-base">{step === 1 ? 'GET OTP' : 'VERIFY & LOGIN'}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {step === 2 && (
              <TouchableOpacity 
                onPress={() => { setStep(1); setOtp(''); setError(null); }} 
                className="flex-row items-center justify-center mt-5 gap-1"
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={14} color="#9CA3AF" />
                <Text className="text-gray-400 font-bold text-sm">Change Mobile Number</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Secure Trust Footer */}
          <View className="flex-row items-center justify-center gap-2 mt-4 opacity-50">
            <Ionicons name="shield-checkmark-outline" size={16} color="#9CA3AF" />
            <Text className="text-gray-400 font-bold text-[11px] uppercase tracking-widest">
               Secure Delivery Fleet Authentication
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};