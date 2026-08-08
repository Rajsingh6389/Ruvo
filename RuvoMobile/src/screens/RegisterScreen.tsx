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

// type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

// export const RegisterScreen = ({ navigation }: Props) => {
//   const { login } = useAuth();
//   const [name, setName] = useState('');
//   const [mobile, setMobile] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [agreed, setAgreed] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const handleRegister = async () => {
//     if (!name.trim() || !email.trim() || !password || !mobile.trim()) {
//       setError('Please fill in all fields');
//       return;
//     }
//     if (password !== confirmPassword) {
//       setError('Passwords do not match');
//       return;
//     }
//     if (!agreed) {
//       setError('Please agree to the Terms and Conditions');
//       return;
//     }
//     setError(null);
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE_URL}/auth/register`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: name.trim(),
//           email: email.trim(),
//           password,
//           mobileNumber: mobile.trim(),
//         }),
//       });
//       const body = await res.json().catch(() => null);

//       if (!res.ok) {
//         setError(
//           body?.message ??
//             (res.status === 409 ? 'Email already registered' : 'Registration failed'),
//         );
//         return;
//       }

//       if (body?.data?.accessToken) {
//         const { data } = body as ApiResponse<AuthToken>;
//         await login(data.accessToken, String(data.userId), data.role);
//       } else {
//         navigation.navigate('Login');
//       }
//     } catch {
//       setError('Could not reach the server. Check your connection.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.screen}>
//       <StatusBar barStyle="light-content" backgroundColor={BG} />

//       {/* Back arrow */}
//       <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
//         <View style={styles.backCircle}>
//           <Ionicons name="chevron-back" size={20} color="#fff" />
//         </View>
//       </TouchableOpacity>

//       <KeyboardAvoidingView
//         style={styles.flex}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//       >
//         <ScrollView
//           contentContainerStyle={styles.container}
//           keyboardShouldPersistTaps="handled"
//           showsVerticalScrollIndicator={false}
//         >
//           <Text style={styles.title}>Sign Up</Text>
//           <Text style={styles.subtitle}>Create Your Account</Text>
//           <Text style={styles.subtitleSmall}>Join Crypto to start your Trading journey</Text>

//           <Text style={styles.label}>Name</Text>
//           <View style={styles.inputWrap}>
//             <Ionicons name="person-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
//             <TextInput
//               style={styles.input}
//               placeholder="Tony Nguyen"
//               placeholderTextColor="#5c5468"
//               value={name}
//               onChangeText={setName}
//             />
//           </View>

//           <Text style={styles.label}>Mobile Number</Text>
//           <View style={styles.inputWrap}>
//             <Ionicons name="call-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
//             <TextInput
//               style={styles.input}
//               placeholder="+91 9876543210"
//               placeholderTextColor="#5c5468"
//               keyboardType="phone-pad"
//               value={mobile}
//               onChangeText={setMobile}
//             />
//           </View>

//           <Text style={styles.label}>Email Address</Text>
//           <View style={styles.inputWrap}>
//             <Ionicons name="mail-outline" size={18} color="#8b8b9e" style={styles.inputIcon} />
//             <TextInput
//               style={styles.input}
//               placeholder="Example@gmail.com"
//               placeholderTextColor="#5c5468"
//               autoCapitalize="none"
//               keyboardType="email-address"
//               value={email}
//               onChangeText={setEmail}
//             />
//           </View>

//           <Text style={styles.label}>Password</Text>
//           <View style={styles.inputWrap}>
//             <Ionicons
//               name="lock-closed-outline"
//               size={18}
//               color="#8b8b9e"
//               style={styles.inputIcon}
//             />
//             <TextInput
//               style={styles.input}
//               placeholder="••••••••"
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

//           <Text style={styles.label}>Confirm Password</Text>
//           <View style={styles.inputWrap}>
//             <Ionicons
//               name="lock-closed-outline"
//               size={18}
//               color="#8b8b9e"
//               style={styles.inputIcon}
//             />
//             <TextInput
//               style={styles.input}
//               placeholder="••••••••"
//               placeholderTextColor="#5c5468"
//               secureTextEntry={!showConfirm}
//               value={confirmPassword}
//               onChangeText={setConfirmPassword}
//             />
//             <TouchableOpacity onPress={() => setShowConfirm(s => !s)}>
//               <Ionicons
//                 name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
//                 size={18}
//                 color="#8b8b9e"
//               />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(a => !a)}>
//             <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
//               {agreed && <Ionicons name="checkmark" size={10} color="#fff" />}
//             </View>
//             <Text style={styles.termsText}>
//               I agree to{' '}
//               <Text style={styles.termsLink}>Terms and condition</Text>
//             </Text>
//           </TouchableOpacity>

//           {error ? <Text style={styles.error}>{error}</Text> : null}

//           <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
//             <LinearGradient
//               colors={['#c026d3', '#7c3aed', '#3b82f6']}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 0 }}
//               style={[styles.button, loading && styles.buttonDisabled]}
//             >
//               {loading ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.buttonText}>Sign Up</Text>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>

//           <View style={styles.dividerRow}>
//             <View style={styles.divider} />
//             <Text style={styles.dividerText}>or</Text>
//             <View style={styles.divider} />
//           </View>

//           {/* Social icon buttons */}
         
//           <View style={styles.footerRow}>
//             <Text style={styles.footerText}>Already have an account? </Text>
//             <TouchableOpacity onPress={() => navigation.goBack()}>
//               <Text style={styles.footerLink}>Sign In</Text>
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
//   backBtn: { position: 'absolute', top: 48, left: 20, zIndex: 10 },
//   backCircle: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: BORDER,
//     backgroundColor: CARD,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   container: { paddingHorizontal: 24, paddingTop: 100, paddingBottom: 40 },
//   title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center' },
//   subtitle: { fontSize: 16, fontWeight: '600', color: '#fff', textAlign: 'center', marginTop: 8 },
//   subtitleSmall: {
//     fontSize: 13,
//     color: '#9a94a8',
//     textAlign: 'center',
//     marginTop: 4,
//     marginBottom: 28,
//   },
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
//   termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
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
//   termsText: { color: '#9a94a8', fontSize: 12 },
//   termsLink: { color: '#c026d3', fontWeight: '600' },
//   error: { color: '#f87171', fontSize: 12, marginBottom: 12, textAlign: 'center' },
//   button: { height: 52, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
//   buttonDisabled: { opacity: 0.7 },
//   buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
//   dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
//   divider: { flex: 1, height: 1, backgroundColor: BORDER },
//   dividerText: { color: '#6b6b7d', fontSize: 12, marginHorizontal: 12 },
//   socialIconRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
//   socialCircle: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     borderWidth: 1,
//     borderColor: BORDER,
//     backgroundColor: CARD,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   footerRow: { flexDirection: 'row', justifyContent: 'center' },
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

// ---------------------------------------------------------------------------
// RuVo design tokens — keep these in sync with every other RuVo screen so
// the app reads as one consistent product rather than a set of one-offs.
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

  // Purely visual — tracks which field is focused so we can highlight its
  // border. Does not touch validation or submission logic.
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const fieldBorder = (field: string) =>
    focusedField === field ? COLORS.borderFocused : COLORS.border;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Back arrow */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <View style={styles.backCircle}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
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
          <View style={styles.brandBadge}>
            <Ionicons name="storefront-outline" size={26} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitleSmall}>
            Join RuVo to shop and sell from local stores near you
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <View style={[styles.inputWrap, { borderColor: fieldBorder('name') }]}>
              <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tony Nguyen"
                placeholderTextColor="#A0A4AC"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Mobile Number</Text>
            <View style={[styles.inputWrap, { borderColor: fieldBorder('mobile') }]}>
              <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor="#A0A4AC"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                onFocus={() => setFocusedField('mobile')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrap, { borderColor: fieldBorder('email') }]}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Example@gmail.com"
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
                placeholder="••••••••"
                placeholderTextColor="#A0A4AC"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
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

            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrap, { borderColor: fieldBorder('confirm') }]}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#A0A4AC"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(s => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreed(a => !a)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={11} color={COLORS.white} />}
              </View>
              <Text style={styles.termsText}>
                I agree to <Text style={styles.termsLink}>Terms and Conditions</Text>
              </Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.button, loading && styles.buttonDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Sign up"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Text style={styles.footerLink}>Sign In</Text>
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

  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    // subtle elevation, not a heavy shadow
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  container: { paddingHorizontal: 24, paddingTop: 104, paddingBottom: 40 },

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

  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  subtitleSmall: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
    paddingHorizontal: 12,
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

  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  termsText: { color: COLORS.textSecondary, fontSize: 12, flexShrink: 1 },
  termsLink: { color: COLORS.primary, fontWeight: '700' },

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

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textSecondary, fontSize: 12, marginHorizontal: 12 },

  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: COLORS.textSecondary, fontSize: 13 },
  footerLink: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});