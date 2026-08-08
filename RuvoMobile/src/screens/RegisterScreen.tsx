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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';

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

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !mobile.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms and Conditions');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          mobileNumber: mobile.trim(),
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          body?.message ??
            (res.status === 409 ? 'Email already registered' : 'Registration failed'),
        );
        return;
      }

      if (body?.data?.accessToken) {
        const { data } = body as ApiResponse<AuthToken>;
        await login(data.accessToken, String(data.userId), data.role);
      } else {
        navigation.navigate('Login');
      }
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Back arrow */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <View style={styles.backCircle}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
          <Text style={styles.subtitleSmall}>Join Crypto to start your Trading journey</Text>

          <Text style={styles.label}>Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Tony Nguyen"
              placeholderTextColor="#5c5468"
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+91 9876543210"
              placeholderTextColor="#5c5468"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={setMobile}
            />
          </View>

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Example@gmail.com"
              placeholderTextColor="#5c5468"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#8b8b9e"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#5c5468"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(s => !s)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#8b8b9e"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#8b8b9e"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#5c5468"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirm(s => !s)}>
              <Ionicons
                name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#8b8b9e"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(a => !a)}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Ionicons name="checkmark" size={10} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to{' '}
              <Text style={styles.termsLink}>Terms and condition</Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            <LinearGradient
              colors={['#c026d3', '#7c3aed', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Social icon buttons */}
         
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const BG = '#0e0a14';
const CARD = '#1b1523';
const BORDER = '#2a2333';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: BG },
  backBtn: { position: 'absolute', top: 48, left: 20, zIndex: 10 },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { paddingHorizontal: 24, paddingTop: 100, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '600', color: '#fff', textAlign: 'center', marginTop: 8 },
  subtitleSmall: {
    fontSize: 13,
    color: '#9a94a8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 28,
  },
  label: { color: '#e4e0ec', fontSize: 13, marginBottom: 8, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#5c5468',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  termsText: { color: '#9a94a8', fontSize: 12 },
  termsLink: { color: '#c026d3', fontWeight: '600' },
  error: { color: '#f87171', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  button: { height: 52, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { color: '#6b6b7d', fontSize: 12, marginHorizontal: 12 },
  socialIconRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
  socialCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#9a94a8', fontSize: 13 },
  footerLink: { color: '#c026d3', fontSize: 13, fontWeight: '600' },
});
