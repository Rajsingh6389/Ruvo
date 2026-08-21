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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

export const VehicleDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const { token, setVerificationStatus } = useAuth();
  const { colors } = useTheme();

  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [loading, setLoading] = useState(false);

  const handleSubmitVehicle = async () => {
    if (!vehicleNumber || !vehicleModel || !vehicleCapacity) {
      Alert.alert('Error', 'Please fill in all vehicle details.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicleType,
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          vehicleModel: vehicleModel.trim(),
          vehicleCapacity: vehicleCapacity.trim(),
          fuelType,
        }),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        throw new Error(`Server response error (${res.status}). Please ensure backend is running.`);
      }

      if (!res.ok) {
        throw new Error(data.message || 'Vehicle details submission failed.');
      }

      await setVerificationStatus(data.data?.verificationStatus || 'UNDER_REVIEW');
      Alert.alert('Success', 'Vehicle registration details saved and submitted for review!');
      navigation.navigate('VerificationStatus');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save vehicle details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Back Button Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vehicle Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Register the vehicle you will use for deliveries
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Vehicle Type</Text>
          <View style={styles.pickerRow}>
            {['Bike', 'Scooter', 'Auto', 'Van', 'Mini Truck'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerBtn,
                  { borderColor: colors.border },
                  vehicleType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setVehicleType(type)}
              >
                <Text style={[vehicleType === type ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: colors.textPrimary }, { fontSize: 13 }]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textPrimary }]}>Vehicle Registration Number</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="DL 3C AB 1234"
            placeholderTextColor={colors.textSecondary}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Vehicle Model / Name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Hero Splendor / Honda Activa"
            placeholderTextColor={colors.textSecondary}
            value={vehicleModel}
            onChangeText={setVehicleModel}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Carrying Capacity (kg)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="e.g. 50"
            placeholderTextColor={colors.textSecondary}
            value={vehicleCapacity}
            onChangeText={setVehicleCapacity}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Fuel Type</Text>
          <View style={styles.pickerRow}>
            {['Petrol', 'Diesel', 'EV'].map((fuel) => (
              <TouchableOpacity
                key={fuel}
                style={[
                  styles.pickerBtn,
                  { borderColor: colors.border },
                  fuelType === fuel && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setFuelType(fuel)}
              >
                <Text style={[fuelType === fuel ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: colors.textPrimary }]}>
                  {fuel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleSubmitVehicle}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Submit Verification</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
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
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    elevation: 2,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
