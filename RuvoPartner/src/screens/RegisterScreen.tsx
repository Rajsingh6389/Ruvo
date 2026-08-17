import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

export const RegisterScreen = () => {
  const navigation = useNavigation<any>();
  const { token, setVerificationStatus, authenticatedFetch } = useAuth();
  const { colors } = useTheme();

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const formatDate = (date: Date) => date.toISOString().slice(0, 10);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access to fill your address automatically. You can also enter it manually.');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        Alert.alert('Turn on location', 'Enable GPS or location services, then try again.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      const place = places[0];
      if (!place) {
        Alert.alert('Address not found', 'We found your coordinates, but could not resolve an address. Please enter it manually.');
        return;
      }
      setAddress([place.name, place.street, place.district].filter(Boolean).join(', ') || [place.city, place.region].filter(Boolean).join(', '));
      setCity(place.city || place.subregion || '');
      setState(place.region || '');
      setPincode(place.postalCode || '');
    } catch (err: any) {
      Alert.alert('Could not get location', err?.message || 'Check GPS and your connection, then try again.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmitProfile = async () => {
    if (!fullName || !address || !city || !state || !pincode) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (dob && !dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Error', 'Please enter date of birth in YYYY-MM-DD format.');
      return;
    }

    if (!token) {
      Alert.alert('Session expired', 'Please sign in again before submitting your profile.');
      return;
    }

    setLoading(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/partner/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          dateOfBirth: dob.trim() || null,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        }),
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(responseText || `Server response error (${res.status}). Please check that the Ruvo backend is reachable.`);
      }

      if (!res.ok) {
        throw new Error(data?.message || `Profile submission failed (HTTP ${res.status}).`);
      }

      await setVerificationStatus(data?.data?.verificationStatus || 'UNDER_REVIEW');
      Alert.alert('Success', 'Basic profile verification details saved successfully!');
      navigation.navigate('VehicleDetails');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit profile details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.primary }]}>Partner Registration</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Complete your profile to join RuVo delivery network
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="John Doe"
            placeholderTextColor={colors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Date of Birth</Text>
          <TouchableOpacity style={[styles.dateInput, { borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: dob ? colors.textPrimary : colors.textSecondary }}>{dob || 'Select date of birth'}</Text>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker
            value={dob ? new Date(`${dob}T12:00:00`) : new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_, selectedDate) => { setShowDatePicker(Platform.OS === 'ios'); if (selectedDate) setDob(formatDate(selectedDate)); }}
          />}

          <TouchableOpacity style={[styles.locationButton, { borderColor: colors.primary }]} onPress={useCurrentLocation} disabled={locating}>
            {locating ? <ActivityIndicator color={colors.primary} /> : <><Ionicons name="locate-outline" size={20} color={colors.primary} /><Text style={[styles.locationButtonText, { color: colors.primary }]}>Use current location</Text></>}
          </TouchableOpacity>
          <Text style={[styles.locationHint, { color: colors.textSecondary }]}>Uses your GPS location to fill address, city, state and pincode. You can edit all fields.</Text>

          <Text style={[styles.label, { color: colors.textPrimary }]}>Street Address</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="House No, Road, Locality"
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={setAddress}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>City</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="New Delhi"
                placeholderTextColor={colors.textSecondary}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>State</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Delhi"
                placeholderTextColor={colors.textSecondary}
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textPrimary }]}>Pincode</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="110001"
            placeholderTextColor={colors.textSecondary}
            value={pincode}
            onChangeText={setPincode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleSubmitProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Next: Vehicle Details</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  locationButtonText: { fontWeight: '700', fontSize: 14 },
  locationHint: { fontSize: 12, lineHeight: 17, marginBottom: 16 },
  row: {
    flexDirection: 'row',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    elevation: 2,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
