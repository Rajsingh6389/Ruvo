import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from 'react-native-geolocation-service';
import { Controller, useForm } from 'react-hook-form';
import { launchImageLibrary } from 'react-native-image-picker';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Layout } from '../../components/Layout';
import { TextInput } from '../../components/TextInput';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { uploadShop } from '../../services/shopService';
import { reverseGeocode } from '../../utils/locationUtils';
import type { ShopInput } from '../../types';
import type { RootStackParamList } from '../../types/navigation';

type ShopForm = {
  name: string;
  category: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
  deliveryAvailable: boolean;
};

const CATEGORIES = [
  'Groceries',
  'Vegetables',
  'Dairy',
  'Electronics',
  'General store',
  'medical store'
];

export const RegisterShopScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token, user } = useAuth(); // ADDED useAuth
  const { control, handleSubmit, reset, setValue, watch } = useForm<ShopForm>({
    defaultValues: {
      name: '',
      category: '',
      address: '',
      phone: '',
      latitude: '',
      longitude: '',
      deliveryAvailable: false,
    },
  });
  const category = watch('category');
  const [logo, setLogo] = useState<any>(null);
  const [banner, setBanner] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number; longitude: number} | null>(null);

  const [mapRegion, setMapRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });

  const selectImage = (kind: 'logo' | 'banner') => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, response => {
      if (response.didCancel) return;
      if (response.errorCode || !response.assets?.[0]) {
        Alert.alert(
          'Image error',
          response.errorMessage || 'Could not select an image.',
        );
        return;
      }

      if (kind === 'logo') {
        setLogo(response.assets[0]);
      } else {
        setBanner(response.assets[0]);
      }
    });
  };

  const useCurrentLocation = async () => {
    setIsFetchingLocation(true);

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        if (!fineGranted && !coarseGranted) {
          Alert.alert(
            'Location permission denied',
            'Enter your shop latitude and longitude manually.',
          );
          setIsFetchingLocation(false);
          return;
        }
      }

        Geolocation.getCurrentPosition(
        position => {
          setValue('latitude', position.coords.latitude.toFixed(6), {
            shouldValidate: true,
          });
          setValue('longitude', position.coords.longitude.toFixed(6), {
            shouldValidate: true,
          });
          setSelectedLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          setMapRegion({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          
          reverseGeocode(position.coords.latitude, position.coords.longitude).then(addressString => {
            if (addressString) {
              setValue('address', addressString, { shouldValidate: true });
            }
          });
          
          setIsFetchingLocation(false);
        },
        error => {
          Alert.alert('Location error', error.message);
          setIsFetchingLocation(false);
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 },
      );
    } catch (error) {
      Alert.alert(
        'Location error',
        error instanceof Error ? error.message : 'Unexpected error',
      );
      setIsFetchingLocation(false);
    }
  };

  const onSubmit = async (data: ShopForm) => {
    if (!token || !user?.id) {
      Alert.alert('Session Error', 'You must be logged in to register a shop.');
      return;
    }

    if (!logo) {
      Alert.alert(
        'Add a shop logo',
        'Please select a logo or storefront photo before submitting.',
      );
      return;
    }

    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert(
        'Invalid location',
        'Enter a valid latitude and longitude for your shop.',
      );
      return;
    }

    const shopData: ShopInput = {
      name: data.name.trim(),
      category: data.category,
      address: data.address.trim(),
      phone: data.phone.trim(),
      latitude,
      longitude,
      deliveryAvailable: data.deliveryAvailable,
      ownerId: user.id.toString(), // Added ownerId
    };

    setIsSubmitting(true);
    try {
      await uploadShop(shopData, logo, banner, token);
      Alert.alert(
        'Shop submitted for approval',
        'Your shop registration has been submitted and is pending admin approval.',
      );
      reset();
      setLogo(null);
      setBanner(null);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'Registration failed',
        `Error: ${err.message || 'Unknown error'}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout noPadding>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={[styles.backText, { color: colors.primary }]}>
              Back to groceries
            </Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Register your shop
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Add your shop details so customers in your area can find you.
          </Text>

          <Card style={styles.formCard}>
            <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>
              Shop details
            </Text>
            <Controller
              control={control}
              name="name"
              rules={{ required: 'Shop name is required.' }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <TextInput
                  label="Shop name"
                  placeholder="e.g. Singh General Store"
                  value={value}
                  onChangeText={onChange}
                  error={error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="category"
              rules={{ required: 'Choose a category.' }}
              render={({ field: { onChange }, fieldState: { error } }) => (
                <View style={styles.categoryField}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    Category
                  </Text>
                  <View style={styles.categoryList}>
                    {CATEGORIES.map(item => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => onChange(item)}
                        style={[
                          styles.categoryChip,
                          {
                            borderColor:
                              category === item
                                ? colors.primary
                                : colors.border,
                            backgroundColor:
                              category === item ? colors.primary : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            {
                              color:
                                category === item
                                  ? '#FFFFFF'
                                  : colors.textPrimary,
                            },
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {error ? (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />
            <Controller
              control={control}
              name="address"
              rules={{ required: 'Shop address is required.' }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <TextInput
                  label="Address"
                  placeholder="Village, town or landmark"
                  value={value}
                  onChangeText={onChange}
                  error={error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="phone"
              rules={{
                required: 'Phone number is required.',
                minLength: {
                  value: 10,
                  message: 'Enter a valid phone number.',
                },
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <TextInput
                  label="Phone number"
                  placeholder="10-digit mobile number"
                  value={value}
                  onChangeText={onChange}
                  error={error?.message}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              )}
            />
          </Card>

          <Card style={styles.formCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationCopy}>
                <Text
                  style={[styles.groupTitle, { color: colors.textPrimary }]}
                >
                  Shop location
                </Text>
                <Text
                  style={[styles.helperText, { color: colors.textSecondary }]}
                >
                  This helps customers find nearby shops.
                </Text>
              </View>
              <Button
                title="Use current location"
                variant="secondary"
                size="sm"
                onPress={useCurrentLocation}
                loading={isFetchingLocation}
                style={{ marginBottom: 8 }}
              />
              <Button
                title="Select on Map"
                variant="outline"
                size="sm"
                onPress={() => setShowMap(true)}
              />
            </View>
            <View style={styles.coordinates}>
              <View style={styles.coordinateInput}>
                <Controller
                  control={control}
                  name="latitude"
                  rules={{
                    required: 'Latitude is required.',
                    validate: value =>
                      Number.isFinite(Number(value)) ||
                      'Enter a valid latitude.',
                  }}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <TextInput
                      label="Latitude"
                      placeholder="e.g. 28.6139"
                      value={value}
                      onChangeText={onChange}
                      error={error?.message}
                      keyboardType="decimal-pad"
                    />
                  )}
                />
              </View>
              <View style={styles.coordinateInput}>
                <Controller
                  control={control}
                  name="longitude"
                  rules={{
                    required: 'Longitude is required.',
                    validate: value =>
                      Number.isFinite(Number(value)) ||
                      'Enter a valid longitude.',
                  }}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <TextInput
                      label="Longitude"
                      placeholder="e.g. 77.2090"
                      value={value}
                      onChangeText={onChange}
                      error={error?.message}
                      keyboardType="decimal-pad"
                    />
                  )}
                />
              </View>
            </View>
          </Card>

          <Modal visible={showMap} animationType="slide" transparent={false}>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={mapRegion}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setSelectedLocation({ latitude, longitude });
                }}
              >
                {selectedLocation && (
                  <Marker coordinate={selectedLocation} />
                )}
              </MapView>
              <View style={styles.mapActions}>
                <Button title="Cancel" variant="secondary" onPress={() => setShowMap(false)} style={{ flex: 1, marginRight: 8 }} />
                <Button title="Confirm" onPress={() => {
                  if (selectedLocation) {
                    setValue('latitude', selectedLocation.latitude.toFixed(6), { shouldValidate: true });
                    setValue('longitude', selectedLocation.longitude.toFixed(6), { shouldValidate: true });
                    setShowMap(false);
                    reverseGeocode(selectedLocation.latitude, selectedLocation.longitude).then(addressString => {
                      if (addressString) {
                        setValue('address', addressString, { shouldValidate: true });
                      }
                    });
                  } else {
                    Alert.alert("Error", "Please tap on the map to select a location");
                  }
                }} style={{ flex: 1 }} />
              </View>
            </View>
          </Modal>

          <Card style={styles.formCard}>
            <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>
              Photos
            </Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              A logo is required. A storefront banner is optional.
            </Text>
            <View style={styles.photoActions}>
              <Button
                title={logo ? 'Change logo' : 'Add logo'}
                variant="outline"
                onPress={() => selectImage('logo')}
                style={styles.photoButton}
              />
              <Button
                title={banner ? 'Change banner' : 'Add banner'}
                variant="outline"
                onPress={() => selectImage('banner')}
                style={styles.photoButton}
              />
            </View>
            {logo ? (
              <Image
                source={{ uri: logo.uri }}
                style={[styles.logoPreview, { borderColor: colors.border }]}
              />
            ) : null}
            {banner ? (
              <Image
                source={{ uri: banner.uri }}
                style={[styles.bannerPreview, { borderColor: colors.border }]}
              />
            ) : null}
          </Card>

          <Card style={styles.formCard}>
            <View style={styles.deliveryRow}>
              <View style={styles.deliveryCopy}>
                <Text
                  style={[styles.groupTitle, { color: colors.textPrimary }]}
                >
                  Delivery available
                </Text>
                <Text
                  style={[styles.helperText, { color: colors.textSecondary }]}
                >
                  Let customers know you offer delivery.
                </Text>
              </View>
              <Controller
                control={control}
                name="deliveryAvailable"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                )}
              />
            </View>
          </Card>

          <Button
            title="Register shop"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8 },
  backText: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  formCard: { marginVertical: 8 },
  groupTitle: { fontSize: 17, fontWeight: '700' },
  helperText: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  categoryField: { marginVertical: 8 },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
  },
  categoryText: { fontSize: 13, fontWeight: '600' },
  fieldError: { fontSize: 12, marginTop: 4 },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  locationCopy: { flex: 1, paddingRight: 8, minWidth: '50%' },
  mapActions: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingBottom: 40,
  },
  coordinates: { flexDirection: 'row', marginHorizontal: -4 },
  coordinateInput: { flex: 1, marginHorizontal: 4 },
  photoActions: { flexDirection: 'row', marginHorizontal: -4, marginTop: 8 },
  photoButton: { flex: 1, marginHorizontal: 4 },
  logoPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    marginTop: 12,
    alignSelf: 'center',
  },
  bannerPreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryCopy: { flex: 1, paddingRight: 16 },
  submitButton: { marginTop: 16 },
});

