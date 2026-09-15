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
import { API_BASE_URL } from '../../config/api';

function resolveImage(url?: string): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function maskAccount(num?: string): string {
  if (!num || num.length < 4) return num || '—';
  return '•'.repeat(Math.max(0, num.length - 4)) + num.slice(-4);
}

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
            place.name,
            place.street,
            place.district,
            place.city || place.subregion,
            place.region,
            place.postalCode,
            place.country
          ].filter(Boolean); // removes null, undefined, empty strings
          
          if (addressParts.length > 0) {
            setAddress(addressParts.join(', '));
          }
        }
      } catch (geocodeError) {
        console.warn("Reverse geocode failed:", geocodeError);
      }

      Alert.alert('Location Captured!', 'Your new GPS coordinates have been captured and the address was updated. Don\'t forget to click "Save Shop Details" to save it permanently.');
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

  // ── Save — only basic shop fields, no bank fields ─────────────
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
      Alert.alert('Success', 'Shop updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Failed to update shop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentLogoUri   = logoAsset   ? logoAsset.uri   : resolveImage(existingShop.logoUrl);
  const currentBannerUri = bannerAsset ? bannerAsset.uri : resolveImage(existingShop.bannerUrl);

  const inputClass = "bg-warm-50 border border-warm-200 rounded-[18px] px-4 py-[16px] text-[15px] font-semibold text-ruvo-ink";
  const labelClass = "text-[13px] font-extrabold text-ruvo-ink mb-2";
  const sectionClass = "bg-ruvo-surface border border-warm-200 rounded-[24px] p-5 mb-5 shadow-sm";
  const sectionHeaderClass = "text-[12px] font-black text-warm-500 uppercase tracking-widest mb-4 border-b border-warm-100 pb-3";

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-200 shadow-sm z-10 px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 bg-warm-50 rounded-[12px] border border-warm-200 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#171A1F" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-ruvo-ink tracking-tight">Edit Shop</Text>
          <Text className="text-[12px] font-bold text-warm-600">Keep your storefront information up to date</Text>
        </View>
        <View className="w-10 h-10 bg-ruvo-yellow/20 rounded-[12px] border border-ruvo-yellow/30 items-center justify-center">
          <Ionicons name="storefront" size={18} color="#D97706" />
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="px-4 pt-5 pb-10"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Shop Branding ──────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <View className={sectionClass}>
              <Text className={sectionHeaderClass}>
                Shop Branding
              </Text>

              <Text className={labelClass}>Banner</Text>
              <TouchableOpacity
                onPress={pickBanner}
                activeOpacity={0.8}
                className="relative w-full h-[160px] bg-warm-100 rounded-[20px] overflow-hidden mb-6 border border-warm-200 items-center justify-center shadow-sm"
              >
                {currentBannerUri ? (
                  <>
                    <Image source={{ uri: currentBannerUri }} className="w-full h-full absolute" resizeMode="cover" />
                    <View className="absolute inset-0 bg-black/30" /> 
                    <View className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 flex-row items-center gap-2">
                       <Ionicons name="camera" size={16} color="#FFF" />
                       <Text className="text-[13px] font-black text-white tracking-wide shadow-sm">CHANGE BANNER</Text>
                    </View>
                  </>
                ) : (
                  <View className="items-center gap-2">
                    <Ionicons name="image-outline" size={32} color="#A79E92" />
                    <Text className="text-[13px] font-bold text-warm-500">Tap to upload 16:9 Banner</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text className={labelClass}>Logo / Avatar</Text>
              <View className="flex-row items-center gap-4">
                <TouchableOpacity
                  onPress={pickLogo}
                  activeOpacity={0.8}
                  className="relative w-24 h-24 bg-warm-100 rounded-[24px] overflow-hidden border border-warm-200 items-center justify-center shadow-sm"
                >
                  {currentLogoUri ? (
                     <>
                        <Image source={{ uri: currentLogoUri }} className="w-full h-full absolute" resizeMode="cover" />
                        <View className="absolute bottom-0 inset-x-0 bg-black/50 py-1.5 items-center backdrop-blur-sm">
                          <Ionicons name="camera" size={12} color="#FFF" />
                        </View>
                     </>
                  ) : (
                    <Ionicons name="storefront" size={36} color="#A79E92" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                   onPress={pickLogo} 
                   className="bg-ruvo-surface border border-warm-200 px-4 py-3 rounded-[14px] shadow-xs"
                >
                  <Text className="text-[13px] font-bold text-ruvo-ink">Select New Logo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── General Information ──────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <View className={sectionClass}>
              <Text className={sectionHeaderClass}>
                General Information
              </Text>

              <Text className={labelClass}>Shop Name *</Text>
              <TextInput
                value={name}
                onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: undefined })); }}
                placeholder="e.g. Ruvo Fresh Mart"
                placeholderTextColor="#A79E92"
                className={`${inputClass} mb-1 ${errors.name ? 'border-red-400 bg-red-50' : ''}`}
              />
              {errors.name ? <Text className="text-[11px] font-bold text-red-600 mb-4">{errors.name}</Text> : <View className="mb-4" />}

              <Text className={labelClass}>Category</Text>
              <View className="mb-4">
                <CategoryDropdown value={category} onChange={setCategory} />
              </View>

              <Text className={labelClass}>Address *</Text>
              <TextInput
                value={address}
                onChangeText={t => { setAddress(t); setErrors(e => ({ ...e, address: undefined })); }}
                placeholder="Shop physical address"
                placeholderTextColor="#A79E92"
                multiline
                numberOfLines={2}
                className={`bg-warm-50 border rounded-[18px] px-4 py-[16px] text-[15px] font-semibold text-ruvo-ink mb-1 min-h-[80px] ${errors.address ? 'border-red-400 bg-red-50' : 'border-warm-200'}`}
              />
              {errors.address ? <Text className="text-[11px] font-bold text-red-600 mb-4">{errors.address}</Text> : <View className="mb-4" />}

              <Text className={labelClass}>Phone Number *</Text>
              <TextInput
                value={phone}
                onChangeText={t => { setPhone(t); setErrors(e => ({ ...e, phone: undefined })); }}
                placeholder="10-digit mobile"
                placeholderTextColor="#A79E92"
                keyboardType="phone-pad"
                className={`${inputClass} mb-1 ${errors.phone ? 'border-red-400 bg-red-50' : ''}`}
              />
              {errors.phone ? <Text className="text-[11px] font-bold text-red-600 mb-4">{errors.phone}</Text> : <View className="mb-4" />}

              <View className="flex-row items-center justify-between mt-2 pt-5 border-t border-warm-100">
                <View className="flex-1">
                  <Text className="text-[15px] font-black text-ruvo-ink">Home Delivery</Text>
                  <Text className="text-[12px] text-warm-600 font-medium mt-0.5">Enable delivery for this shop</Text>
                </View>
                <Switch
                  value={deliveryAvailable}
                  onValueChange={setDeliveryAvailable}
                  trackColor={{ false: '#E5E7EB', true: '#F5B700' }}
                  thumbColor="#FFF"
                />
              </View>

              <View className="flex-row items-center justify-between mt-5 pt-5 border-t border-warm-100">
                <View className="flex-1 mr-3">
                  <Text className="text-[15px] font-black text-ruvo-ink">GPS Location</Text>
                  {latitude && longitude ? (
                    <Text className="text-[12px] font-bold text-green-600 mt-1">Coordinates set: {latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
                  ) : (
                    <Text className="text-[12px] text-warm-500 mt-1 leading-[16px]">GPS accuracy is highly recommended for routing</Text>
                  )}
                </View>
                <TouchableOpacity 
                   disabled={locationFetching}
                   activeOpacity={0.7}
                   className={`px-4 py-2.5 rounded-[12px] flex-row items-center gap-1.5 shadow-sm ${locationFetching ? 'bg-warm-100 border border-warm-200' : 'bg-ruvo-yellow/20 border border-ruvo-yellow'}`}
                   onPress={handleUpdateLocation}
                >
                  <Ionicons name="navigate" size={14} color={locationFetching ? '#A79E92' : '#D97706'} />
                  <Text className={`text-[12px] font-black ${locationFetching ? 'text-warm-500' : 'text-ruvo-yellow-dark'}`}>
                    {locationFetching ? 'Fetching...' : 'Update GPS'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── Bank & Settlement (read-only, from shop object) ───── */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <View className={sectionClass}>
              <View className="flex-row items-center justify-between mb-4 border-b border-warm-100 pb-3">
                <Text className="text-[12px] font-black text-warm-500 uppercase tracking-widest">
                  Bank & Settlement
                </Text>
                <View className="flex-row items-center gap-1 bg-green-50 border border-green-200 px-2 py-1 rounded-[8px]">
                  <Ionicons name="lock-closed" size={10} color="#16A34A" />
                  <Text className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider">Secured</Text>
                </View>
              </View>

              {hasBankDetails ? (
                <View>
                  {bankAccountNumber ? (
                    <View className="flex-row items-center justify-between py-2.5">
                      <Text className="text-[13px] text-warm-600 font-bold">Account No.</Text>
                      <Text className="text-[14px] font-black text-ruvo-ink">{maskAccount(bankAccountNumber)}</Text>
                    </View>
                  ) : null}
                  {ifscCode ? (
                    <View className="flex-row items-center justify-between py-2.5 border-t border-warm-100 border-dashed">
                      <Text className="text-[13px] text-warm-600 font-bold">IFSC</Text>
                      <Text className="text-[14px] font-black text-ruvo-ink">{ifscCode}</Text>
                    </View>
                  ) : null}
                  {upiId ? (
                    <View className="flex-row items-center justify-between py-2.5 border-t border-warm-100 border-dashed">
                      <Text className="text-[13px] text-warm-600 font-bold">UPI ID</Text>
                      <Text className="text-[14px] font-black text-ruvo-ink">{upiId}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View className="items-center py-6 bg-warm-50 rounded-[16px] border border-warm-100 border-dashed mb-2">
                  <Ionicons name="wallet-outline" size={32} color="#D1C7BA" />
                  <Text className="text-[13px] text-warm-600 mt-2 font-medium text-center px-4">
                    No bank account linked yet.{'\n'}Tap below to add one for payouts.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => navigation.navigate('EditBankAccount')}
                activeOpacity={0.7}
                className="mt-4 flex-row items-center justify-center gap-2 bg-warm-50 border border-warm-200 rounded-[14px] py-3"
              >
                <Ionicons name="create" size={16} color="#6B5E52" />
                <Text className="text-[13px] font-extrabold text-warm-700">
                  {hasBankDetails ? 'Update Bank Details' : 'Add Bank Details'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Save Button ──────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
             <TouchableOpacity 
               onPress={handleSave} 
               disabled={loading}
               activeOpacity={0.8}
               className={`w-full py-[16px] rounded-[18px] items-center justify-center flex-row gap-2 shadow-sm mb-4 ${loading ? 'bg-warm-200' : 'bg-ruvo-yellow'}`}
             >
                <Ionicons name="cloud-upload" size={20} color="#231C10" />
                <Text className="text-[16px] font-black text-ruvo-ink">
                  {loading ? 'Saving Changes...' : 'Save Shop Details'}
                </Text>
             </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditShopScreen;
