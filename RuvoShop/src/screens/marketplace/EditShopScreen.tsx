import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { updateShop, Shop } from '../../services/shopService';
import { CategoryDropdown } from '../../components/CategoryDropdown';
import { Button } from '../../components/ui/Button';
import { SuccessPopup } from '../../components/ui/SuccessPopup';
import { API_BASE_URL } from '../../config/api';

function resolveImage(url?: string): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function maskAccount(num?: string): string {
  if (!num || num.length < 4) return num || '—';
  return '•'.repeat(Math.max(0, num.length - 4)) + num.slice(-4);
}

const InputField = ({ label, icon, value, onChangeText, placeholder, errorText, isMultiline = false, keyboardType = 'default', ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className={`text-xs font-black uppercase tracking-wider ${isFocused ? 'text-[#FF7A00]' : 'text-gray-500'}`}>{label}</Text>
        {errorText && <Text className="text-[10px] font-bold text-red-500 uppercase">{errorText}</Text>}
      </View>
      <View className={`flex-row items-start border-[1.5px] rounded-2xl px-4 py-2 flex-1 bg-white shadow-sm ${
        errorText ? 'border-red-400' : isFocused ? 'border-[#FF7A00]' : 'border-gray-100'
      }`} style={{ minHeight: isMultiline ? 100 : 56 }}>
        <Ionicons name={icon} size={20} color={errorText ? '#F87171' : isFocused ? '#FF7A00' : '#9CA3AF'} className={`mr-3 ${isMultiline ? 'mt-2' : 'mt-2.5'}`} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={isMultiline}
          keyboardType={keyboardType}
          style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, flex: 1, paddingVertical: 10, textAlignVertical: isMultiline ? 'top' : 'center', minHeight: isMultiline ? 80 : 0 }}
          {...props}
        />
      </View>
    </View>
  );
};

export const EditShopScreen = () => {
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();
  const { token }  = useAuth();
  const existingShop: Shop = route.params?.shop;

  if (!existingShop) {
    Alert.alert('Error', 'No shop provided to edit');
    navigation.goBack();
    return null;
  }

  // ── Basic shop fields ─────────────────────────────────────────
  const [name,              setName]              = useState(existingShop.name || '');
  const [category,          setCategory]          = useState(existingShop.category || '');
  const [address,           setAddress]           = useState(existingShop.address || '');
  const [phone,             setPhone]             = useState(existingShop.phone || '');
  const [deliveryAvailable, setDeliveryAvailable] = useState(existingShop.deliveryAvailable ?? true);
  const [latitude,          setLatitude]          = useState<number | undefined>(existingShop.latitude);
  const [longitude,         setLongitude]         = useState<number | undefined>(existingShop.longitude);
  const [locationFetching,  setLocationFetching]   = useState(false);

  const [logoAsset,   setLogoAsset]   = useState<any>(null);
  const [bannerAsset, setBannerAsset] = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<{ name?: string; address?: string; phone?: string }>({});
  const [saved,       setSaved]       = useState(false);

  // ── Bank details — read directly from the shop object (set during onboarding) ──
  const bankAccountNumber = (existingShop as any).bankAccountNumber || '';
  const ifscCode          = (existingShop as any).ifscCode || '';
  const upiId             = (existingShop as any).upiId || '';
  const hasBankDetails    = !!(bankAccountNumber || ifscCode);

  // ── Image pickers ─────────────────────────────────────────────
  const pickLogo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1],
      });
      if (!res.canceled && res.assets?.length) setLogoAsset(res.assets[0]);
    } catch { Alert.alert('Error', 'Failed to pick logo image'); }
  };

  const handleUpdateLocation = async () => {
    setLocationFetching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to update shop location.');
        setLocationFetching(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: newLat, longitude: newLng } = loc.coords;
      
      setLatitude(newLat);
      setLongitude(newLng);

      // Perform reverse geocoding
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude: newLat, longitude: newLng });
        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          const addressParts = [
            place.name, place.street, place.district,
            place.city || place.subregion, place.region,
            place.postalCode, place.country
          ].filter(Boolean);
          
          if (addressParts.length > 0) setAddress(addressParts.join(', '));
        }
      } catch (geocodeError) {
        console.warn("Reverse geocode failed:", geocodeError);
      }
      Alert.alert('Location Captured!', 'Your new GPS coordinates have been securely captured.');
    } catch (error) {
      console.warn("Failed to get location:", error);
      Alert.alert('Error', 'Unable to fetch your GPS coordinates. Please ensure GPS is turned on.');
    } finally {
      setLocationFetching(false);
    }
  };

  const pickBanner = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [16, 9],
      });
      if (!res.canceled && res.assets?.length) setBannerAsset(res.assets[0]);
    } catch { Alert.alert('Error', 'Failed to pick banner image'); }
  };

  // ── Validation ────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: { name?: string; address?: string; phone?: string } = {};
    if (!name.trim())    errs.name    = 'Shop name is required';
    if (!address.trim()) errs.address = 'Shop address is required';
    if (!phone.trim())   errs.phone   = 'Phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!token) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      await updateShop(
        existingShop.id,
        { name: name.trim(), category, address: address.trim(), phone: phone.trim(), deliveryAvailable, latitude, longitude },
        logoAsset,
        bannerAsset,
        token,
      );
      setSaved(true);
      setTimeout(() => navigation.goBack(), 1800);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Failed to update shop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentLogoUri   = logoAsset   ? logoAsset.uri   : resolveImage(existingShop.logoUrl);
  const currentBannerUri = bannerAsset ? bannerAsset.uri : resolveImage(existingShop.bannerUrl);

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center gap-4 shadow-sm z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-gray-50 rounded-full border border-gray-100 items-center justify-center active:opacity-70">
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-gray-900 tracking-tight">Edit Shop Profile</Text>
          <Text className="text-[11px] text-[#FF7A00] font-black uppercase tracking-widest mt-0.5">Manage Details</Text>
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 250 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Images ──────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 items-center justify-center">
                  <Ionicons name="images" size={14} color="#FF7A00" />
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Shop Branding</Text>
              </View>

              <Text className="text-xs font-bold text-gray-900 mb-2">Banner Image</Text>
              <TouchableOpacity
                onPress={pickBanner}
                className="relative w-full h-36 bg-gray-50 rounded-2xl overflow-hidden mb-5 border border-gray-200 items-center justify-center"
              >
                {currentBannerUri
                  ? <Image source={{ uri: currentBannerUri }} className="w-full h-full" resizeMode="cover" />
                  : (
                    <View className="items-center gap-2">
                      <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                      <Text className="text-xs text-gray-400 font-semibold">Tap to select Banner</Text>
                    </View>
                  )}
                <View className="absolute bottom-2 right-2 bg-gray-900/80 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 shadow-md">
                  <Ionicons name="camera" size={14} color="#FFF" />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-white">Change Cover</Text>
                </View>
              </TouchableOpacity>

              <Text className="text-xs font-bold text-gray-900 mb-2">Shop Logo / Avatar</Text>
              <View className="flex-row items-center gap-4">
                <TouchableOpacity
                  onPress={pickLogo}
                  className="relative w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 items-center justify-center shadow-sm"
                >
                  {currentLogoUri
                    ? <Image source={{ uri: currentLogoUri }} className="w-full h-full" resizeMode="cover" />
                    : <Ionicons name="storefront" size={32} color="#9CA3AF" />}
                  <View className="absolute bottom-0 inset-x-0 bg-gray-900/70 py-1 items-center">
                    <Ionicons name="camera" size={12} color="#FFF" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickLogo} className="bg-[#FF7A00]/10 px-4 py-2 rounded-xl">
                  <Text className="text-xs font-black text-[#FF7A00] uppercase tracking-widest">Select New Logo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── General Details ──────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center justify-between mb-6 border-b border-gray-50 pb-4">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                    <Ionicons name="document-text" size={14} color="#3B82F6" />
                  </View>
                  <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">General Info</Text>
                </View>
              </View>

              <InputField label="Shop Name *" icon="storefront-outline" value={name} onChangeText={(t: string) => { setName(t); setErrors(e => ({ ...e, name: undefined })); }} placeholder="e.g. Ruvo Fresh Mart" errorText={errors.name} />
              
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`text-xs font-black uppercase tracking-wider text-gray-500`}>Category *</Text>
                </View>
                <CategoryDropdown value={category} onChange={setCategory} />
              </View>

              <InputField label="Address *" icon="location-outline" value={address} onChangeText={(t: string) => { setAddress(t); setErrors(e => ({ ...e, address: undefined })); }} placeholder="Shop physical address" isMultiline={true} errorText={errors.address} />
              <InputField label="Phone Number *" icon="call-outline" value={phone} onChangeText={(t: string) => { setPhone(t); setErrors(e => ({ ...e, phone: undefined })); }} placeholder="10-digit mobile number" keyboardType="phone-pad" errorText={errors.phone} />

              <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <View>
                  <Text className="text-sm font-black text-gray-900">Home Delivery</Text>
                  <Text className="text-xs text-gray-500 font-semibold mt-1">Enable local RuVo delivery</Text>
                </View>
                <Switch value={deliveryAvailable} onValueChange={setDeliveryAvailable} trackColor={{ false: '#E5E7EB', true: '#FF7A00' }} thumbColor="#FFF" />
              </View>

              <View className="flex-row items-center justify-between mt-6 pt-6 border-t border-dashed border-gray-200">
                <View className="flex-1 mr-4">
                  <Text className="text-sm font-black text-gray-900">GPS Location</Text>
                  {latitude && longitude ? (
                    <Text className="text-[11px] font-black text-green-600 uppercase tracking-widest mt-1">Found: {latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
                  ) : (
                    <Text className="text-xs text-gray-400 mt-1">Required for accurate delivery pairing</Text>
                  )}
                </View>
                <TouchableOpacity disabled={locationFetching} className={`px-4 py-3 rounded-xl flex-row items-center gap-2 ${locationFetching ? 'bg-gray-100' : 'bg-green-50 border border-green-200'}`} onPress={handleUpdateLocation}>
                  <Ionicons name="navigate" size={16} color={locationFetching ? '#9CA3AF' : '#16A34A'} />
                  <Text className={`text-xs font-black uppercase tracking-widest ${locationFetching ? 'text-gray-400' : 'text-green-700'}`}>
                    {locationFetching ? 'Fetching' : 'Update GPS'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── Bank & Settlement ───── */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center justify-between mb-6 border-b border-gray-50 pb-4">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 items-center justify-center">
                    <Ionicons name="card" size={14} color="#A855F7" />
                  </View>
                  <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Bank Details</Text>
                </View>
                <View className="flex-row items-center gap-1.5 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                  <Ionicons name="lock-closed" size={10} color="#16A34A" />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-green-700">Secured</Text>
                </View>
              </View>

              {hasBankDetails ? (
                <View>
                  {bankAccountNumber ? (
                    <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
                      <Text className="text-xs text-gray-500 font-bold tracking-widest uppercase">Account No.</Text>
                      <Text className="text-sm font-black text-gray-900">{maskAccount(bankAccountNumber)}</Text>
                    </View>
                  ) : null}
                  {ifscCode ? (
                    <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
                      <Text className="text-xs text-gray-500 font-bold tracking-widest uppercase">IFSC</Text>
                      <Text className="text-sm font-black text-gray-900">{ifscCode}</Text>
                    </View>
                  ) : null}
                  {upiId ? (
                    <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
                      <Text className="text-xs text-gray-500 font-bold tracking-widest uppercase">UPI ID</Text>
                      <Text className="text-sm font-black text-gray-900">{upiId}</Text>
                    </View>
                  ) : null}
                  <Text className="text-[11px] text-gray-400 font-semibold mt-3 text-center">
                    Tap below to update payout routing. Subject to re-verification.
                  </Text>
                </View>
              ) : (
                <View className="items-center py-6 bg-gray-50 rounded-2xl border border-gray-100 mt-2">
                  <Ionicons name="wallet-outline" size={36} color="#D1D5DB" />
                  <Text className="text-sm font-black text-gray-900 mt-3 text-center">No Account Attached</Text>
                  <Text className="text-xs text-gray-500 mt-1 text-center px-4">Link a bank to receive same-day vendor payouts securely.</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => navigation.navigate('EditBankAccount')}
                className="mt-5 flex-row items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl py-3 active:bg-gray-100"
              >
                <Ionicons name="create-outline" size={16} color="#4B5563" />
                <Text className="text-xs font-black uppercase tracking-widest text-gray-700">
                  {hasBankDetails ? 'Update Payout Details' : 'Attach Bank Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Save Button ──────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <TouchableOpacity onPress={handleSave} disabled={loading} className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-lg ${loading ? 'bg-gray-300' : 'bg-[#FF7A00]'}`}>
              {loading ? (
                <Text className="text-white text-sm font-black uppercase tracking-widest">Saving...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text className="text-white text-sm font-black uppercase tracking-widest">Update Shop</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessPopup 
        visible={saved} 
        message="Your shop details have been beautifully verified and published." 
      />
    </SafeAreaView>
  );
};

export default EditShopScreen;
