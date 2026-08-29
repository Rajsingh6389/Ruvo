/**
 * RuvoShop Onboarding — Step 1: Shop Details
 * Collects shop name, category, phone, and address.
 * Posts to /api/shop/onboarding/register then advances to Aadhaar.
 */

import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/radius';
import { API_BASE_URL } from '../../config/api';
import {
  StepBar, SectionCard, FieldLabel,
  StyledInput, CtaBtn, ErrorBox,
} from './OnboardingShared';

const CATEGORIES = [
  { key: 'Grocery',             icon: 'basket-outline'         as const },
  { key: 'Fruits & Vegetables', icon: 'nutrition-outline'      as const },
  { key: 'Snacks',              icon: 'fast-food-outline'      as const },
  { key: 'Personal Care',       icon: 'sparkles-outline'       as const },
  { key: 'Stationery',          icon: 'book-outline'           as const },
  { key: 'Pharmacy',            icon: 'medical-outline'        as const },
  { key: 'Electronics',         icon: 'hardware-chip-outline'  as const },
  { key: 'Cafe',                icon: 'cafe-outline'           as const },
  { key: 'General Store',       icon: 'storefront-outline'     as const },
  { key: 'Other',               icon: 'grid-outline'           as const },
];

export const Step1_ShopDetails = () => {
  const navigation = useNavigation<any>();
  const { token, userId, user, setOnboardingStatus, logout } = useAuth();
  const { colors, typography, spacing, shadows } = useTheme();

  const [shopName,   setShopName]   = useState('');
  const [category,   setCategory]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [address,    setAddress]    = useState('');
  const [city,       setCity]       = useState('');
  const [stateName,  setStateName]  = useState('');
  const [pincode,    setPincode]    = useState('');
  const [gstin,      setGstin]      = useState('');
  const [logo,       setLogo]       = useState<any>(null);
  const [banner,     setBanner]     = useState<any>(null);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [locating,   setLocating]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [focused,    setFocused]    = useState<string | null>(null);

  const MAX_GALLERY = 8;

  const selectSingleImage = async (kind: 'logo' | 'banner') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const imgObj = {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `${kind}.jpg`,
      };
      if (kind === 'logo') setLogo(imgObj);
      else setBanner(imgObj);
    } catch (err: any) {
      Alert.alert('Image error', err?.message || 'Could not select image.');
    }
  };

  const addGalleryImages = async () => {
    const remaining = MAX_GALLERY - galleryImages.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_GALLERY} gallery photos.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
      });
      if (result.canceled || !result.assets?.length) return;
      const newImgs = result.assets.map((asset, i) => ({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `gallery_${Date.now()}_${i}.jpg`,
      }));
      setGalleryImages(prev => [...prev, ...newImgs].slice(0, MAX_GALLERY));
    } catch (err: any) {
      Alert.alert('Image error', err?.message || 'Could not select images.');
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const fld = (name: string) => ({
    focused: focused === name,
    colors, typography,
    onFocus: () => setFocused(name),
    onBlur:  () => setFocused(null),
  });

  const useGPS = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access or enter address manually.');
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert('Location off', 'Turn on GPS / location services, then try again.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      console.log(pos)
      let places: Location.LocationGeocodedAddress[] = [];
      try {
        places = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch {
        Alert.alert('Geocode failed', 'Could not resolve address. Please enter it manually.');
        return;
      }
      const p = places[0];
      if (!p) { Alert.alert('Not found', 'Could not resolve address. Please enter manually.'); return; }

      // Build precise street address: house no + street name + sublocality
      const streetParts = [
        p.streetNumber,
        p.street,
        p.subregion !== p.city ? p.subregion : null,
        p.district,
      ].filter(Boolean);
      const builtStreet = streetParts.join(', ');

      setAddress(builtStreet || p.name || '');
      setCity(p.city || '');
      setStateName(p.region || '');
      setPincode(p.postalCode || '');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Location error. Enter address manually.');
    } finally { setLocating(false); }
  };

  const handleNext = async () => {
    if (!shopName.trim())  { setError('Shop name is required.');       return; }
    if (!category)         { setError('Please select a category.');    return; }
    if (!phone.trim() || phone.replace(/\D/g, '').length !== 10) {
      setError('Enter a valid 10-digit shop phone number.'); return;
    }
    if (!address.trim() || !city.trim() || !stateName.trim() || !pincode.trim()) {
      setError('Please fill in all address fields.'); return;
    }
    setError(null);
    setLoading(true);
    try {
      const ownerIdentifier = userId || (user as any)?.phone || phone.replace(/\D/g, '') || 'owner_default';

      if (logo?.uri) {
        // Use multipart upload endpoint /api/shops/upload
        const formData = new FormData();
        const shopPayload = {
          name: shopName.trim(),
          category,
          phone: '+91' + phone.replace(/\D/g, ''),
          address: `${address.trim()}, ${city.trim()}, ${stateName.trim()} - ${pincode.trim()}`,
          ownerId: ownerIdentifier,
          gstin: gstin.trim() || null,
        };
        formData.append('shop', JSON.stringify(shopPayload));

        formData.append('logo', {
          uri: logo.uri,
          name: logo.fileName || 'logo.jpg',
          type: logo.type || 'image/jpeg',
        } as any);

        if (banner?.uri) {
          formData.append('banner', {
            uri: banner.uri,
            name: banner.fileName || 'banner.jpg',
            type: banner.type || 'image/jpeg',
          } as any);
        }

        galleryImages.forEach((img, idx) => {
          formData.append('images', {
            uri: img.uri,
            name: img.fileName || `gallery_${idx}.jpg`,
            type: img.type || 'image/jpeg',
          } as any);
        });

        let uploaded = false;
        try {
          const res = await fetch(`${API_BASE_URL}/api/shops/upload`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          });

          if (res.ok) {
            uploaded = true;
          } else {
            const errData = await res.json().catch(() => null);
            console.warn('Multipart upload fallback:', res.status, errData);
          }
        } catch (e: any) {
          console.warn('Multipart upload network error:', e?.message);
        }

        // Fallback to standard JSON endpoint if multipart upload failed or logo was empty
        if (!uploaded) {
          await fetch(`${API_BASE_URL}/api/shops`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              name: shopName.trim(),
              category,
              phone: '+91' + phone.replace(/\D/g, ''),
              address: `${address.trim()}, ${city.trim()}, ${stateName.trim()} - ${pincode.trim()}`,
              ownerId: ownerIdentifier,
              approved: false,
            }),
          }).catch(() => null);
        }
      } else {
        // Standard JSON register endpoint /api/shops
        const res = await fetch(`${API_BASE_URL}/api/shops`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: shopName.trim(),
            category,
            phone: '+91' + phone.replace(/\D/g, ''),
            address: `${address.trim()}, ${city.trim()}, ${stateName.trim()} - ${pincode.trim()}`,
            ownerId: ownerIdentifier,
            approved: false,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          console.warn('Shop create response:', res.status, errData);
        }
      }

      await setOnboardingStatus('AADHAAR_PENDING');
      navigation.navigate('Step2_Aadhaar');
    } catch (e: any) {
      console.warn('Shop creation catch:', e?.message);
      await setOnboardingStatus('AADHAAR_PENDING');
      navigation.navigate('Step2_Aadhaar');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StepBar current={1} colors={colors} typography={typography} />

      {/* Header with sign-out escape hatch */}
      <View style={[s.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.sm }]}
          onPress={() =>
            Alert.alert(
              'Sign Out?',
              'You will be taken back to the login screen.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
              ],
            )
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={[s.brandBadge, { backgroundColor: colors.primary, borderRadius: RADIUS.sm }]}>
          <Ionicons name="storefront" size={16} color="#FFFFFF" />
        </View>
        <Text style={[typography.headingS, { color: colors.textPrimary, marginLeft: 8 }]}>
          RuVo Shop
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: spacing.gutter }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Page heading */}
          <View style={s.pageHeader}>
            <View style={[s.pageIconBox, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.md }]}>
              <Ionicons name="storefront-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[typography.headingL, { color: colors.textPrimary, marginBottom: 4 }]}>
              Shop Details
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 20, marginBottom: 16 }]}>
              Tell us about your shop to register it on RuVo.
            </Text>
          </View>

          {/* Basic info */}
          <SectionCard colors={colors}>
            <FieldLabel text="Shop Name" required colors={colors} typography={typography} />
            <StyledInput
              {...fld('name')} iconLeft="storefront-outline"
              placeholder="e.g. Fresh Mart, City Pharmacy"
              value={shopName}
              onChangeText={t => { setShopName(t); setError(null); }}
              autoCapitalize="words"
              style={{ marginBottom: 12 }}
            />

            <FieldLabel text="Shop Phone Number" required colors={colors} typography={typography} />
            <View style={[
              s.phoneWrap,
              {
                backgroundColor: colors.surfaceSunken,
                borderColor: focused === 'phone' ? colors.primary : colors.border,
                borderRadius: RADIUS.input,
              },
              focused === 'phone' && s.phoneFocused,
            ]}>
              <View style={[s.prefixBox, { borderRightColor: colors.border }]}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>🇮🇳 +91</Text>
              </View>
              <TextInput
                placeholder="10-digit number"
                placeholderTextColor={colors.placeholder}
                style={[typography.body, { flex: 1, height: '100%', color: colors.textPrimary }]}
                value={phone}
                onChangeText={t => { setPhone(t.replace(/\D/g, '')); setError(null); }}
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
                keyboardType="phone-pad"
                maxLength={10}
                editable={true}
              />
              {phone.replace(/\D/g, '').length === 10 && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              )}
            </View>

            <FieldLabel text="GSTIN (optional)" colors={colors} typography={typography} />
            <StyledInput
              {...fld('gstin')} iconLeft="document-text-outline"
              placeholder="22AAAAA0000A1Z5"
              value={gstin}
              onChangeText={t => { setGstin(t.toUpperCase()); setError(null); }}
              autoCapitalize="characters"
              maxLength={15}
            />
          </SectionCard>

          {/* Category */}
          <SectionCard colors={colors}>
            <Text style={[typography.headingS, { color: colors.textPrimary, marginBottom: 12 }]}>
              Shop Category
            </Text>
            <View style={s.catGrid}>
              {CATEGORIES.map(cat => {
                const active = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      s.catCard,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.surfaceSunken,
                        borderColor    : active ? colors.primary      : colors.border,
                        borderRadius   : RADIUS.md,
                      },
                      active && shadows.sm,
                    ]}
                    onPress={() => { setCategory(cat.key); setError(null); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={cat.icon} size={22} color={active ? colors.primary : colors.textHint} />
                    <Text style={[
                      typography.caption,
                      { color: active ? colors.primary : colors.textSecondary, fontWeight: '700', marginTop: 6, textAlign: 'center' },
                    ]}>
                      {cat.key}
                    </Text>
                    {active && (
                      <View style={[s.checkDot, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Shop Photos */}
          <SectionCard colors={colors}>
            <View style={s.addrTitleRow}>
              <Ionicons name="images-outline" size={18} color={colors.primary} />
              <Text style={[typography.headingS, { color: colors.textPrimary, marginLeft: 8 }]}>Shop Photos</Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 12 }]}>
              Add a shop logo (storefront), banner, and multiple gallery photos.
            </Text>

            {/* Logo */}
            <FieldLabel text="Shop Logo / Storefront Photo" required colors={colors} typography={typography} />
            <TouchableOpacity
              style={[s.photoPickBox, { backgroundColor: colors.surfaceSunken, borderColor: logo ? colors.primary : colors.border }]}
              onPress={() => selectSingleImage('logo')}
              activeOpacity={0.8}
            >
              {logo ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={{ uri: logo.uri }} style={s.logoPreviewThumb} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>Logo Selected</Text>
                    <Text style={[typography.caption, { color: colors.primary }]}>Tap to change logo</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700', marginTop: 4 }]}>Select Shop Logo</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Required storefront or logo photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Banner */}
            <FieldLabel text="Storefront Banner (optional)" colors={colors} typography={typography} />
            <TouchableOpacity
              style={[s.bannerPickBox, { backgroundColor: colors.surfaceSunken, borderColor: banner ? colors.primary : colors.border }]}
              onPress={() => selectSingleImage('banner')}
              activeOpacity={0.8}
            >
              {banner ? (
                <Image source={{ uri: banner.uri }} style={s.bannerPreviewImg} resizeMode="cover" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 }}>
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                  <Text style={[typography.body, { color: colors.primary, fontWeight: '700', marginLeft: 8 }]}>Add Banner Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Gallery Photos */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
              <FieldLabel text="Gallery Photos" colors={colors} typography={typography} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{galleryImages.length}/{MAX_GALLERY}</Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
              Select multiple photos of your shop interior, items, or ambient space.
            </Text>

            <View style={s.galleryGridRow}>
              {galleryImages.map((img, index) => (
                <View key={`${img.uri}-${index}`} style={s.galleryItemWrapper}>
                  <Image source={{ uri: img.uri }} style={s.galleryItemThumb} />
                  <TouchableOpacity style={s.galleryDeleteBtn} onPress={() => removeGalleryImage(index)}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {galleryImages.length < MAX_GALLERY && (
                <TouchableOpacity style={[s.galleryAddCard, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]} onPress={addGalleryImages}>
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>Add Photos</Text>
                </TouchableOpacity>
              )}
            </View>
          </SectionCard>

          {/* Address */}
          <SectionCard colors={colors}>
            <View style={s.addrTitleRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[typography.headingS, { color: colors.textPrimary, marginLeft: 8 }]}>Shop Address</Text>
            </View>

            <TouchableOpacity
              style={[s.gpsBtn, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.sm }]}
              onPress={useGPS}
              disabled={locating}
            >
              {locating
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Ionicons name="locate-outline" size={16} color={colors.primary} />
              }
              <Text style={[typography.body, { color: colors.primary, fontWeight: '700', marginLeft: 6 }]}>
                {locating ? 'Fetching location…' : 'Use GPS to fill address'}
              </Text>
            </TouchableOpacity>

            <FieldLabel text="Street / Locality" required colors={colors} typography={typography} />
            <StyledInput
              {...fld('addr')} iconLeft="home-outline"
              placeholder="Shop No, Road, Area"
              value={address}
              onChangeText={t => { setAddress(t); setError(null); }}
              style={{ marginBottom: 12 }}
            />

            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <FieldLabel text="City" required colors={colors} typography={typography} />
                <StyledInput {...fld('city')} placeholder="New Delhi" value={city} onChangeText={t => { setCity(t); setError(null); }} />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel text="State" required colors={colors} typography={typography} />
                <StyledInput {...fld('state')} placeholder="Delhi" value={stateName} onChangeText={t => { setStateName(t); setError(null); }} />
              </View>
            </View>

            <FieldLabel text="Pincode" required colors={colors} typography={typography} />
            <StyledInput
              {...fld('pin')} iconLeft="mail-outline"
              placeholder="110001"
              value={pincode}
              onChangeText={t => { setPincode(t.replace(/\D/g, '')); setError(null); }}
              keyboardType="number-pad"
              maxLength={6}
            />
          </SectionCard>

          <ErrorBox error={error} colors={colors} typography={typography} />
          <CtaBtn
            label="Save & Continue"
            onPress={handleNext}
            loading={loading}
            colors={colors} typography={typography}
            icon="arrow-forward"
          />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 32 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  brandBadge: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  pageHeader: {
    paddingHorizontal: 4, paddingTop: 16, paddingBottom: 4,
  },
  pageIconBox: {
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  phoneWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, height: 50, paddingHorizontal: 14,
    marginBottom: 12, overflow: 'hidden',
  },
  phoneFocused: { borderWidth: 2 },
  prefixBox: {
    paddingRight: 10, borderRightWidth: 1, height: '60%', justifyContent: 'center', marginRight: 4,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: {
    width: '22%', aspectRatio: 0.9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, position: 'relative', paddingTop: 4,
  },
  checkDot: {
    position: 'absolute', top: 5, right: 5,
    width: 15, height: 15, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  addrTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14,
  },
  row: { flexDirection: 'row' },
  photoPickBox: {
    borderWidth: 1.5,
    borderRadius: RADIUS.input,
    padding: 12,
    marginBottom: 12,
  },
  logoPreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
  },
  bannerPickBox: {
    borderWidth: 1.5,
    borderRadius: RADIUS.input,
    overflow: 'hidden',
    marginBottom: 12,
  },
  bannerPreviewImg: {
    width: '100%',
    height: 90,
  },
  galleryGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  galleryItemWrapper: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.sm,
    position: 'relative',
  },
  galleryItemThumb: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.sm,
  },
  galleryDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  galleryAddCard: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    paddingTop: 8,
  },
});
