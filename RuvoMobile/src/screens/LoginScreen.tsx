// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Platform,
//   StatusBar,
//   ScrollView,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import { RootStackParamList } from '../types/navigation';
// import { useAuth } from '../context/AuthContext';
// import { ROUTES } from '../constants/routes';

// import { API_BASE_URL } from '../config/api';

// interface AuthToken {
//   accessToken: string;
//   tokenType: string;
//   userId: number | string;
//   role: string;
// }
// interface ApiResponse<T> {
//   message: string;
//   data: T;
// }

// type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// export const LoginScreen = ({ navigation }: Props) => {
//   const { login } = useAuth();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [remember, setRemember] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const handleLogin = async () => {
//     if (!email.trim() || !password) {
//       setError('Please enter both email and password');
//       return;
//     }
//     setError(null);
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE_URL}/auth/login`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email: email.trim(), password }),
//       });
//       const body = await res.json().catch(() => null);

//       if (!res.ok) {
//         setError(body?.message ?? 'Invalid email or password');
//         return;
//       }

//       const { data } = body as ApiResponse<AuthToken>;
//       await login(data.accessToken, String(data.userId), data.role);
//     } catch {
//       setError('Could not reach the server. Check your connection.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.screen}>
//       <StatusBar barStyle="light-content" backgroundColor={BG} />
//       <KeyboardAvoidingView
//         style={styles.flex}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//       >
//         <ScrollView
//           contentContainerStyle={styles.container}
//           keyboardShouldPersistTaps="handled"
//           showsVerticalScrollIndicator={false}
//         >
//           <Text style={styles.title}>Welcome Back</Text>
//           <Text style={styles.subtitle}>Log in to access all features</Text>

//           <Text style={styles.label}>Email</Text>
//           <View style={styles.inputWrap}>
//             <Ionicons name="mail-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
//             <TextInput
//               style={styles.input}
//               placeholder="Enter Your Email"
//               placeholderTextColor="#5c5468"
//               autoCapitalize="none"
//               keyboardType="email-address"
//               value={email}
//               onChangeText={setEmail}
//             />
//           </View>

//           <Text style={styles.label}>Password</Text>
//           <View style={styles.inputWrap}>
//             <Ionicons name="lock-closed-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
//             <TextInput
//               style={styles.input}
//               placeholder="Enter Your Password"
//               placeholderTextColor="#5c5468"
//               secureTextEntry={!showPassword}
//               value={password}
//               onChangeText={setPassword}
//             />
//             <TouchableOpacity onPress={() => setShowPassword(s => !s)}>
//               <Ionicons
//                 name={showPassword ? 'eye-outline' : 'eye-off-outline'}
//                 size={18}
//                 color="#8b8b9e"
//               />
//             </TouchableOpacity>
//           </View>

//           <View style={styles.row}>
//             <TouchableOpacity style={styles.rememberRow} onPress={() => setRemember(r => !r)}>
//               <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
//                 {remember && <Ionicons name="checkmark" size={10} color="#fff" />}
//               </View>
//               <Text style={styles.rememberText}>Remember me</Text>
//             </TouchableOpacity>
//             <TouchableOpacity>
//               <Text style={styles.forgotText}>Forgot Password</Text>
//             </TouchableOpacity>
//           </View>

//           {error ? <Text style={styles.error}>{error}</Text> : null}

//           <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
//             <LinearGradient
//               colors={['#c026d3', '#7c3aed', '#3b82f6']}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 0 }}
//               style={[styles.button, loading && styles.buttonDisabled]}
//             >
//               {loading ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.buttonText}>Sign In</Text>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>

//          <View style={styles.footerRow}>
//             <Text style={styles.footerText}>Don't have an account? </Text>
//             <TouchableOpacity onPress={() => navigation.navigate(ROUTES.SIGNUP)}>
//               <Text style={styles.footerLink}>Sign up</Text>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </View>
//   );
// };

// const BG = '#0e0a14';
// const CARD = '#1b1523';
// const BORDER = '#2a2333';

// const styles = StyleSheet.create({
//   flex: { flex: 1 },
//   screen: { flex: 1, backgroundColor: BG },
//   container: { flexGrow: 1,justifyContent: 'center',paddingHorizontal: 24, paddingVertical: 24},
//   title: { fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center' },
//   subtitle: { fontSize: 13, color: '#9a94a8', textAlign: 'center', marginTop: 6, marginBottom: 28 },
//   label: { color: '#e4e0ec', fontSize: 13, marginBottom: 8, marginTop: 4 },
//   inputWrap: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: CARD,
//     borderWidth: 1,
//     borderColor: BORDER,
//     borderRadius: 28,
//     paddingHorizontal: 16,
//     height: 52,
//     marginBottom: 16,
//   },
//   inputIcon: { marginRight: 10 },
//   input: { flex: 1, color: '#fff', fontSize: 14 },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   rememberRow: { flexDirection: 'row', alignItems: 'center' },
//   checkbox: {
//     width: 16,
//     height: 16,
//     borderRadius: 4,
//     borderWidth: 1,
//     borderColor: '#5c5468',
//     marginRight: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
//   rememberText: { color: '#9a94a8', fontSize: 12 },
//   forgotText: { color: '#a78bfa', fontSize: 12 },
//   error: { color: '#f87171', fontSize: 12, marginBottom: 12, textAlign: 'center' },
//   button: { height: 52, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
//   buttonDisabled: { opacity: 0.7 },
//   buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
//   dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
//   divider: { flex: 1, height: 1, backgroundColor: BORDER },
//   dividerText: { color: '#6b6b7d', fontSize: 12, marginHorizontal: 12 },
//   socialButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: CARD,
//     borderWidth: 1,
//     borderColor: BORDER,
//     borderRadius: 28,
//     height: 50,
//     marginBottom: 12,
//   },
//   socialIcon: { marginRight: 8 },
//   socialText: { color: '#fff', fontSize: 13, fontWeight: '500' },
//   footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
//   footerText: { color: '#9a94a8', fontSize: 13 },
//   footerLink: { color: '#c026d3', fontSize: 13, fontWeight: '600' },
// });

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

// ---------------------------------------------------------------------------
// RuVo design tokens — kept identical to RegisterScreen so both auth screens
// read as the same product.
// ---------------------------------------------------------------------------
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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Purely visual — highlights the active field's border, no effect on logic.
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to access all features</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrap, { borderColor: fieldBorder('email') }]}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter Your Email"
                placeholderTextColor="#A0A4AC"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, { borderColor: fieldBorder('password') }]}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter Your Password"
                placeholderTextColor="#A0A4AC"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(s => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRemember(r => !r)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: remember }}
              >
                <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                  {remember && <Ionicons name="checkmark" size={11} color={COLORS.white} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.forgotText}>Forgot Password</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.button, loading && styles.buttonDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.SIGNUP)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.footerLink}>Sign up</Text>
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
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rememberText: { color: COLORS.textSecondary, fontSize: 12 },
  forgotText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

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

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: COLORS.textSecondary, fontSize: 13 },
  footerLink: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});