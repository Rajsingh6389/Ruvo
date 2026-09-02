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
        { name: name.trim(), category, address: address.trim(), phone: phone.trim(), deliveryAvailable },
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

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center gap-md">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 bg-warm-200 rounded-lg items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#231C10" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-extrabold text-ruvo-ink">Edit Shop</Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="px-lg pt-lg pb-2xl"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Images ──────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">
                Shop Images
              </Text>

              <Text className="text-xs font-bold text-warm-700 mb-xs">Banner Image</Text>
              <TouchableOpacity
                onPress={pickBanner}
                className="relative w-full h-36 bg-warm-200 rounded-xl overflow-hidden mb-md border border-warm-300 items-center justify-center"
              >
                {currentBannerUri
                  ? <Image source={{ uri: currentBannerUri }} className="w-full h-full" resizeMode="cover" />
                  : (
                    <View className="items-center gap-xs">
                      <Ionicons name="image-outline" size={28} color="#A79E92" />
                      <Text className="text-xs text-warm-600 font-semibold">Tap to select Banner</Text>
                    </View>
                  )}
                <View className="absolute bottom-xs right-xs bg-ruvo-ink/70 px-md py-xs rounded-lg flex-row items-center gap-xs">
                  <Ionicons name="camera" size={14} color="#FFF" />
                  <Text className="text-xs font-bold text-white">Change Banner</Text>
                </View>
              </TouchableOpacity>

              <Text className="text-xs font-bold text-warm-700 mb-xs">Logo / Avatar</Text>
              <View className="flex-row items-center gap-md">
                <TouchableOpacity
                  onPress={pickLogo}
                  className="relative w-20 h-20 bg-warm-200 rounded-xl overflow-hidden border border-warm-300 items-center justify-center"
                >
                  {currentLogoUri
                    ? <Image source={{ uri: currentLogoUri }} className="w-full h-full" resizeMode="cover" />
                    : <Ionicons name="storefront" size={32} color="#A79E92" />}
                  <View className="absolute bottom-0 inset-x-0 bg-ruvo-ink/70 py-0.5 items-center">
                    <Ionicons name="camera" size={10} color="#FFF" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickLogo} className="bg-warm-200 px-md py-sm rounded-lg">
                  <Text className="text-xs font-bold text-ruvo-ink">Select New Logo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── General Details ──────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">
                General Details
              </Text>

              <Text className="text-xs font-bold text-warm-700 mb-xs">Shop Name *</Text>
              <TextInput
                value={name}
                onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: undefined })); }}
                placeholder="e.g. Ruvo Fresh Mart"
                placeholderTextColor="#A79E92"
                className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink mb-xs ${errors.name ? 'border-red-400' : 'border-warm-300'}`}
              />
              {errors.name && <Text className="text-xs text-red-500 mb-sm">{errors.name}</Text>}

              <Text className="text-xs font-bold text-warm-700 mt-sm mb-xs">Category</Text>
              <CategoryDropdown value={category} onChange={setCategory} />

              <Text className="text-xs font-bold text-warm-700 mt-sm mb-xs">Address *</Text>
              <TextInput
                value={address}
                onChangeText={t => { setAddress(t); setErrors(e => ({ ...e, address: undefined })); }}
                placeholder="Shop physical address"
                placeholderTextColor="#A79E92"
                multiline
                numberOfLines={2}
                className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink mb-xs ${errors.address ? 'border-red-400' : 'border-warm-300'}`}
              />
              {errors.address && <Text className="text-xs text-red-500 mb-sm">{errors.address}</Text>}

              <Text className="text-xs font-bold text-warm-700 mt-sm mb-xs">Phone Number *</Text>
              <TextInput
                value={phone}
                onChangeText={t => { setPhone(t); setErrors(e => ({ ...e, phone: undefined })); }}
                placeholder="10-digit mobile"
                placeholderTextColor="#A79E92"
                keyboardType="phone-pad"
                className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink mb-xs ${errors.phone ? 'border-red-400' : 'border-warm-300'}`}
              />
              {errors.phone && <Text className="text-xs text-red-500 mb-sm">{errors.phone}</Text>}

              <View className="flex-row items-center justify-between mt-md pt-md border-t border-warm-200">
                <View>
                  <Text className="text-sm font-extrabold text-ruvo-ink">Home Delivery</Text>
                  <Text className="text-xs text-warm-600 font-medium mt-xs">Enable delivery for this shop</Text>
                </View>
                <Switch
                  value={deliveryAvailable}
                  onValueChange={setDeliveryAvailable}
                  trackColor={{ false: '#D1C7BA', true: '#F5B700' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>
          </Animated.View>

          {/* ── Bank & Settlement (read-only, from shop object) ───── */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <View className="flex-row items-center justify-between mb-md">
                <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider">
                  Bank & Settlement
                </Text>
                <View className="flex-row items-center gap-xs bg-green-100 px-sm py-xs rounded-full">
                  <Ionicons name="lock-closed" size={10} color="#16A34A" />
                  <Text className="text-xs font-bold text-green-700">Secured</Text>
                </View>
              </View>

              {hasBankDetails ? (
                <View>
                  {bankAccountNumber ? (
                    <View className="flex-row items-center justify-between py-sm border-b border-warm-100">
                      <Text className="text-xs text-warm-600 font-medium">Account No.</Text>
                      <Text className="text-sm font-bold text-ruvo-ink">{maskAccount(bankAccountNumber)}</Text>
                    </View>
                  ) : null}
                  {ifscCode ? (
                    <View className="flex-row items-center justify-between py-sm border-b border-warm-100">
                      <Text className="text-xs text-warm-600 font-medium">IFSC</Text>
                      <Text className="text-sm font-bold text-ruvo-ink">{ifscCode}</Text>
                    </View>
                  ) : null}
                  {upiId ? (
                    <View className="flex-row items-center justify-between py-sm border-b border-warm-100">
                      <Text className="text-xs text-warm-600 font-medium">UPI ID</Text>
                      <Text className="text-sm font-bold text-ruvo-ink">{upiId}</Text>
                    </View>
                  ) : null}
                  <Text className="text-xs text-warm-400 mt-sm">
                    To update bank details, tap below. Changes require re-verification.
                  </Text>
                </View>
              ) : (
                <View className="items-center py-md">
                  <Ionicons name="wallet-outline" size={32} color="#D1C7BA" />
                  <Text className="text-sm text-warm-500 mt-sm text-center">
                    {'No bank account linked yet.\nTap below to add one.'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => navigation.navigate('EditBankAccount')}
                className="mt-md flex-row items-center justify-center gap-sm bg-warm-100 border border-warm-300 rounded-lg py-sm"
              >
                <Ionicons name="create-outline" size={16} color="#6B5E52" />
                <Text className="text-sm font-bold text-warm-700">
                  {hasBankDetails ? 'Update Bank Details' : 'Add Bank Details'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Save Button ──────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <Button variant="primary" onPress={handleSave} loading={loading} icon="checkmark-circle">
              Save Shop Details
            </Button>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditShopScreen;
