import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
    if (!cleanMobile) {
      Alert.alert('Error', 'Please enter your mobile number.');
      return;
    }

    if (cleanMobile.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobileNumber: '+91' + cleanMobile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP.');
      }

      Alert.alert('OTP Sent', 'Enter the 6-digit OTP sent to your mobile number.');
      navigation.navigate('OtpVerification', { mobileNumber: '+91' + cleanMobile });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Check your network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>RuVo Partner</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter your mobile number to sign in or register
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Mobile Number</Text>
          <View style={styles.inputContainer}>
            <Text style={[styles.prefix, { color: colors.textPrimary }]}>+91</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="XXXXX XXXXX"
              placeholderTextColor={colors.textSecondary}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 36,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  prefix: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
