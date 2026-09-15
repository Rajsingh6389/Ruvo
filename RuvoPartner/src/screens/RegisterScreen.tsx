import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

export const RegisterScreen = () => {
  const navigation = useNavigation<any>();
  const { token, setVerificationStatus, authenticatedFetch, logout } = useAuth();

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressBtnIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressBtnOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

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
    <SafeAreaView className="flex-1 bg-ruvo-ink">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Decorative Glow Elements */}
      <View className="absolute top-0 right-[-100px] w-80 h-80 bg-[#FF7A00]/10 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <View className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 z-10 border-b border-gray-800 bg-ruvo-ink/90">
        <TouchableOpacity 
          className="w-10 h-10 items-center justify-center rounded-full bg-white/5 border border-white/10"
          onPress={() => {
            Alert.alert(
              'Go back?',
              'This will return you to the mobile number input.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes', onPress: () => logout?.() }
              ]
            );
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-black tracking-widest uppercase">Partner Registration</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <Text className="text-[#FF7A00] text-sm font-black tracking-widest uppercase mb-1">Step 1 of 2</Text>
          <Text className="text-white text-3xl font-black tracking-tight mb-2">
            Build your Profile
          </Text>
          <Text className="text-gray-400 text-sm font-bold leading-5 mb-8">
            Complete your profile to join the secure RuVo delivery network.
          </Text>

          {/* Form Card */}
          <View 
            className="w-full bg-[#1C2026] border border-gray-800 rounded-[32px] p-6 mb-6"
            style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 12}, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 }}
          >
            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">Full Name *</Text>
              <View className={`flex-row items-center h-14 rounded-2xl px-4 border transition-all ${focusedField === 'fullName' ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'}`}>
                <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                <TextInput
                  className="flex-1 text-white text-base font-bold ml-3"
                  placeholder="John Doe"
                  placeholderTextColor="#4B5563"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Date of Birth */}
            <View className="mb-6">
              <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">Date of Birth</Text>
              <TouchableOpacity 
                activeOpacity={0.8}
                className="flex-row items-center h-14 rounded-2xl px-4 border bg-[#171A1F] border-gray-800 justify-between"
                onPress={() => setShowDatePicker(true)}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                  <Text className={`text-base font-bold ml-3 ${dob ? 'text-white' : 'text-[#4B5563]'}`}>
                    {dob || 'YYYY-MM-DD'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dob ? new Date(`${dob}T12:00:00`) : new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(_, selectedDate) => { 
                    setShowDatePicker(Platform.OS === 'ios'); 
                    if (selectedDate) setDob(formatDate(selectedDate)); 
                  }}
                  textColor="#FFFFFF"
                />
              )}
            </View>

            <View className="h-[1px] bg-gray-800 w-full mb-6" />

            {/* Location Section */}
            <Text className="text-white text-lg font-black tracking-tight mb-4">Location Details</Text>
            
            <TouchableOpacity 
              className={`flex-row items-center justify-center p-4 rounded-2xl border mb-5 gap-2 ${locating ? 'bg-[#FF7A00]/10 border-[#FF7A00]/30' : 'bg-[#FF7A00]/5 border-[#FF7A00]/20'}`}
              onPress={useCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator color="#FF7A00" size="small" />
              ) : (
                <>
                  <Ionicons name="locate" size={20} color="#FF7A00" />
                  <Text className="text-[#FF7A00] font-black tracking-wider uppercase text-sm">Auto-fill via GPS</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Address */}
            <View className="mb-4">
              <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">Street Address *</Text>
              <View className={`flex-row items-center h-14 rounded-2xl px-4 border transition-all ${focusedField === 'address' ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'}`}>
                <Ionicons name="home-outline" size={20} color="#9CA3AF" />
                <TextInput
                  className="flex-1 text-white text-base font-bold ml-3"
                  placeholder="House No, Road, Locality"
                  placeholderTextColor="#4B5563"
                  value={address}
                  onChangeText={setAddress}
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* City & State */}
            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">City *</Text>
                <View className={`flex-row items-center h-14 rounded-2xl px-4 border transition-all ${focusedField === 'city' ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'}`}>
                  <TextInput
                    className="flex-1 text-white text-base font-bold"
                    placeholder="City"
                    placeholderTextColor="#4B5563"
                    value={city}
                    onChangeText={setCity}
                    onFocus={() => setFocusedField('city')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">State *</Text>
                <View className={`flex-row items-center h-14 rounded-2xl px-4 border transition-all ${focusedField === 'state' ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'}`}>
                  <TextInput
                    className="flex-1 text-white text-base font-bold"
                    placeholder="State"
                    placeholderTextColor="#4B5563"
                    value={state}
                    onChangeText={setState}
                    onFocus={() => setFocusedField('state')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            </View>

            {/* Pincode */}
            <View className="mb-6">
              <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">Pincode *</Text>
              <View className={`flex-row items-center h-14 rounded-2xl px-4 border transition-all ${focusedField === 'pincode' ? 'bg-[#242933] border-[#FF7A00]' : 'bg-[#171A1F] border-gray-800'}`}>
                <Ionicons name="map-outline" size={20} color="#9CA3AF" />
                <TextInput
                  className="flex-1 text-white text-base font-bold ml-3 tracking-widest"
                  placeholder="110001"
                  placeholderTextColor="#4B5563"
                  value={pincode}
                  onChangeText={setPincode}
                  onFocus={() => setFocusedField('pincode')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            {/* Giant CTA Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                className={`h-14 rounded-2xl items-center justify-center flex-row gap-2 ${loading ? 'bg-[#FF7A00]/70' : 'bg-[#FF7A00]'}`}
                style={{ shadowColor: '#FF7A00', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}
                onPress={handleSubmitProfile}
                onPressIn={pressBtnIn}
                onPressOut={pressBtnOut}
                disabled={loading}
                activeOpacity={1}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text className="text-white font-black text-base tracking-widest uppercase">Next Step</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
