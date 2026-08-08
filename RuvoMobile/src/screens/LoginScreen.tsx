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

export const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.message ?? 'Invalid email or password');
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

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to access all features</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter Your Email"
              placeholderTextColor="#5c5468"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter Your Password"
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

          <View style={styles.row}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRemember(r => !r)}>
              <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                {remember && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot Password</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <LinearGradient
              colors={['#c026d3', '#7c3aed', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

         <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.SIGNUP)}>
              <Text style={styles.footerLink}>Sign up</Text>
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
  container: { flexGrow: 1,justifyContent: 'center',paddingHorizontal: 24, paddingVertical: 24},
  title: { fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#9a94a8', textAlign: 'center', marginTop: 6, marginBottom: 28 },
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
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
  rememberText: { color: '#9a94a8', fontSize: 12 },
  forgotText: { color: '#a78bfa', fontSize: 12 },
  error: { color: '#f87171', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  button: { height: 52, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { color: '#6b6b7d', fontSize: 12, marginHorizontal: 12 },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 28,
    height: 50,
    marginBottom: 12,
  },
  socialIcon: { marginRight: 8 },
  socialText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: '#9a94a8', fontSize: 13 },
  footerLink: { color: '#c026d3', fontSize: 13, fontWeight: '600' },
});