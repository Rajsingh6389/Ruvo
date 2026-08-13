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
import { Ionicons } from '@expo/vector-icons';

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
  upiId: string;
};

const CATEGORIES = [
  'Groceries',
  'Vegetables',
  'Dairy',
  'Electronics',
  'General store',
  'medical store',
];

const PRIMARY = '#2E7D32';
const PRIMARY_DARK = '#256B2A';
const PRIMARY_LIGHT = '#E8F5E9';
const BG = '#F7F8FA';
const TEXT = '#1A1A1A';
const SUBTEXT = '#6B7280';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';

export const RegisterShopScreen = () => {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token, user } = useAuth();

  const { control, handleSubmit, reset, setValue, watch } =
    useForm<ShopForm>({
      defaultValues: {
        name: '',
        category: '',
        address: '',
        phone: '',
        latitude: '',
        longitude: '',
        deliveryAvailable: false,
        upiId: '',
      },
    });

  const category = watch('category');
  const deliveryAvailable = watch('deliveryAvailable');
  const address = watch('address');
  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const [logo, setLogo] = useState<any>(null);
  const [banner, setBanner] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [mapRegion, setMapRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });

  const selectImage = (kind: 'logo' | 'banner') => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: 1,
      },
      response => {
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
      },
    );
  };

  const useCurrentLocation = async () => {
    setIsFetchingLocation(true);

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;

        const coarseGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (!fineGranted && !coarseGranted) {
          Alert.alert(
            'Location permission denied',
            'Please allow location access in Settings, or enter your shop latitude and longitude manually.',
          );
          setIsFetchingLocation(false);
          return;
        }
      }

      Geolocation.getCurrentPosition(
        position => {
          setValue(
            'latitude',
            position.coords.latitude.toFixed(6),
            { shouldValidate: true },
          );

          setValue(
            'longitude',
            position.coords.longitude.toFixed(6),
            { shouldValidate: true },
          );

          setSelectedLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

          setMapRegion({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });

          reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
          ).then(addressString => {
            if (addressString) {
              setValue('address', addressString, {
                shouldValidate: true,
              });
            }
          });

          setIsFetchingLocation(false);
        },
        error => {
          setIsFetchingLocation(false);
          // Code 2 = POSITION_UNAVAILABLE (location services off or no provider)
          if (error.code === 2) {
            Alert.alert(
              'Location unavailable',
              'Please turn on Location Services in your device Settings, then try again. You can also set your location manually using the map.',
            );
          } else if (error.code === 3) {
            Alert.alert(
              'Location timed out',
              'Could not get your location in time. Make sure GPS or Wi-Fi is enabled, then try again.',
            );
          } else {
            Alert.alert('Location error', error.message);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000,
          forceRequestLocation: true,
        },
      );
    } catch (error) {
      Alert.alert(
        'Location error',
        error instanceof Error
          ? error.message
          : 'Unexpected error',
      );

      setIsFetchingLocation(false);
    }
  };

  const onSubmit = async (data: ShopForm) => {
    if (!token || !user?.id) {
      Alert.alert(
        'Session Error',
        'You must be logged in to register a shop.',
      );
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

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      Alert.alert(
        'Invalid location',
        'Make sure to select your shop location on the map.',
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
      upiId: data.upiId.trim(),
      ownerId: user.id.toString(),
    };

    setIsSubmitting(true);

    try {
      await uploadShop(
        shopData,
        logo,
        banner,
        token,
      );

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
        `Error: ${err.message || 'Unknown error'}`,
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
          {/* HEADER */}

          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.75}
            >
              <Ionicons
                name="arrow-back"
                size={18}
                color={PRIMARY}
              />

              <Text style={styles.backText}>
                Back
              </Text>
            </TouchableOpacity>

            <View style={styles.headerBadge}>
              <Ionicons
                name="storefront-outline"
                size={14}
                color={PRIMARY}
              />

              <Text style={styles.headerBadgeText}>
                SELL ON RUVO
              </Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="storefront"
                size={31}
                color={PRIMARY}
              />
            </View>

            <View style={styles.heroCopy}>
              <Text
                style={[
                  styles.title,
                  { color: colors.textPrimary },
                ]}
              >
                Register your shop
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Bring your local shop to RuVo and let
                customers nearby discover you.
              </Text>
            </View>
          </View>

          {/* PROGRESS */}

          <View style={styles.progressCard}>
            <View style={styles.progressStep}>
              <View style={styles.progressCircleActive}>
                <Ionicons
                  name="storefront"
                  size={14}
                  color={WHITE}
                />
              </View>

              <Text style={styles.progressTextActive}>
                Shop details
              </Text>
            </View>

            <View style={styles.progressLine} />

            <View style={styles.progressStep}>
              <View style={styles.progressCircle}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={PRIMARY}
                />
              </View>

              <Text style={styles.progressText}>
                Location
              </Text>
            </View>

            <View style={styles.progressLine} />

            <View style={styles.progressStep}>
              <View style={styles.progressCircle}>
                <Ionicons
                  name="images-outline"
                  size={14}
                  color={PRIMARY}
                />
              </View>

              <Text style={styles.progressText}>
                Photos
              </Text>
            </View>
          </View>

          {/* SHOP DETAILS */}

          <Card style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="storefront-outline"
                  size={19}
                  color={PRIMARY}
                />
              </View>

              <View style={styles.sectionCopy}>
                <Text
                  style={[
                    styles.groupTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Shop details
                </Text>

                <Text
                  style={[
                    styles.helperText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Tell customers about your shop.
                </Text>
              </View>
            </View>

            <Controller
              control={control}
              name="name"
              rules={{
                required: 'Shop name is required.',
              }}
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
              rules={{
                required: 'Choose a category.',
              }}
              render={({
                field: { onChange },
                fieldState: { error },
              }) => (
                <View style={styles.categoryField}>
                  <Text
                    style={[
                      styles.label,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Shop category
                  </Text>

                  <View style={styles.categoryList}>
                    {CATEGORIES.map(item => {
                      const active = category === item;

                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => onChange(item)}
                          activeOpacity={0.78}
                          style={[
                            styles.categoryChip,
                            {
                              borderColor: active
                                ? PRIMARY
                                : colors.border,
                              backgroundColor: active
                                ? PRIMARY_LIGHT
                                : colors.card,
                            },
                          ]}
                        >
                          {active ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={15}
                              color={PRIMARY}
                            />
                          ) : null}

                          <Text
                            style={[
                              styles.categoryText,
                              {
                                color: active
                                  ? PRIMARY
                                  : colors.textPrimary,
                              },
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {error ? (
                    <Text
                      style={[
                        styles.fieldError,
                        { color: colors.error },
                      ]}
                    >
                      {error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="address"
              rules={{
                required: 'Shop address is required.',
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <TextInput
                  label="Shop address"
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

            <Controller
              control={control}
              name="upiId"
              rules={{
                required: 'Shopkeeper UPI is required for payouts.',
                pattern: {
                  value: /[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+/,
                  message: 'Enter a valid UPI ID (e.g. name@okhdfcbank)',
                },
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <TextInput
                  label="Shopkeeper UPI ID"
                  placeholder="name@okbank"
                  value={value}
                  onChangeText={onChange}
                  error={error?.message}
                  autoCapitalize="none"
                />
              )}
            />
          </Card>

          {/* LOCATION */}

          <Card style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="location-outline"
                  size={19}
                  color={PRIMARY}
                />
              </View>

              <View style={styles.sectionCopy}>
                <Text
                  style={[
                    styles.groupTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Shop location
                </Text>

                <Text
                  style={[
                    styles.helperText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Help nearby customers find your shop.
                </Text>
              </View>
            </View>

            <View style={styles.locationActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={useCurrentLocation}
                disabled={isFetchingLocation}
                style={[
                  styles.locationActionPrimary,
                  isFetchingLocation &&
                    styles.locationActionDisabled,
                ]}
              >
                <Ionicons
                  name="locate-outline"
                  size={17}
                  color={WHITE}
                />

                <Text style={styles.locationActionPrimaryText}>
                  {isFetchingLocation
                    ? 'Finding...'
                    : 'Use current location'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowMap(true)}
                style={styles.locationActionSecondary}
              >
                <Ionicons
                  name="map-outline"
                  size={17}
                  color={PRIMARY}
                />

                <Text style={styles.locationActionSecondaryText}>
                  Select on map
                </Text>
              </TouchableOpacity>
            </View>

            {(latitude || longitude || address) ? (
              <View style={styles.locationPreview}>
                <View style={styles.locationPreviewIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={PRIMARY}
                  />
                </View>

                <View style={styles.locationPreviewCopy}>
                  <Text style={styles.locationPreviewTitle}>
                    Location selected
                  </Text>

                  {address ? (
                    <Text
                      style={styles.locationPreviewAddress}
                      numberOfLines={2}
                    >
                      {address}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.locationHint}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color={SUBTEXT}
                />

                <Text style={styles.locationHintText}>
                  Use your current location or tap anywhere
                  on the map to set the shop location.
                </Text>
              </View>
            )}


          </Card>

          {/* MAP */}

          <Modal
            visible={showMap}
            animationType="slide"
            transparent={false}
          >
            <View
              style={[
                styles.mapContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.mapHeader}>
                <TouchableOpacity
                  onPress={() => setShowMap(false)}
                  style={styles.mapBackButton}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={TEXT}
                  />
                </TouchableOpacity>

                <View style={styles.mapHeaderCopy}>
                  <Text style={styles.mapTitle}>
                    Choose shop location
                  </Text>

                  <Text style={styles.mapSubtitle}>
                    Tap on the map to place your shop
                  </Text>
                </View>
              </View>

              <MapView
                style={styles.map}
                initialRegion={mapRegion}
                onPress={e => {
                  const {
                    latitude,
                    longitude,
                  } = e.nativeEvent.coordinate;

                  setSelectedLocation({
                    latitude,
                    longitude,
                  });
                }}
              >
                {selectedLocation && (
                  <Marker coordinate={selectedLocation} />
                )}
              </MapView>

              <View style={styles.mapSelectedBar}>
                <View style={styles.mapSelectedIcon}>
                  <Ionicons
                    name="location"
                    size={18}
                    color={PRIMARY}
                  />
                </View>

                <Text style={styles.mapSelectedText}>
                  {selectedLocation
                    ? 'Location selected'
                    : 'Tap anywhere to select'}
                </Text>
              </View>

              <View style={styles.mapActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowMap(false)}
                  style={styles.mapCancel}
                />

                <Button
                  title="Confirm location"
                  onPress={() => {
                    if (selectedLocation) {
                      setValue(
                        'latitude',
                        selectedLocation.latitude.toFixed(6),
                        { shouldValidate: true },
                      );

                      setValue(
                        'longitude',
                        selectedLocation.longitude.toFixed(6),
                        { shouldValidate: true },
                      );

                      setShowMap(false);

                      reverseGeocode(
                        selectedLocation.latitude,
                        selectedLocation.longitude,
                      ).then(addressString => {
                        if (addressString) {
                          setValue(
                            'address',
                            addressString,
                            { shouldValidate: true },
                          );
                        }
                      });
                    } else {
                      Alert.alert(
                        'Select a location',
                        'Please tap on the map to select your shop location.',
                      );
                    }
                  }}
                  style={styles.mapConfirm}
                />
              </View>
            </View>
          </Modal>

          {/* PHOTOS */}

          <Card style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="images-outline"
                  size={19}
                  color={PRIMARY}
                />
              </View>

              <View style={styles.sectionCopy}>
                <Text
                  style={[
                    styles.groupTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Shop photos
                </Text>

                <Text
                  style={[
                    styles.helperText,
                    { color: colors.textSecondary },
                  ]}
                >
                  A logo is required. A banner is optional.
                </Text>
              </View>
            </View>

            {/* LOGO */}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => selectImage('logo')}
              style={[
                styles.logoUpload,
                {
                  borderColor: logo
                    ? PRIMARY
                    : colors.border,
                },
              ]}
            >
              {logo ? (
                <>
                  <Image
                    source={{ uri: logo.uri }}
                    style={styles.logoPreview}
                  />

                  <View style={styles.imageEditBadge}>
                    <Ionicons
                      name="camera"
                      size={13}
                      color={WHITE}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.uploadIcon}>
                    <Ionicons
                      name="camera-outline"
                      size={25}
                      color={PRIMARY}
                    />
                  </View>

                  <Text style={styles.uploadTitle}>
                    Add shop logo
                  </Text>

                  <Text style={styles.uploadSubtitle}>
                    Storefront or shop logo
                  </Text>

                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>
                      REQUIRED
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {logo ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => selectImage('logo')}
                style={styles.changePhotoButton}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={PRIMARY}
                />

                <Text style={styles.changePhotoText}>
                  Change logo
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* BANNER */}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => selectImage('banner')}
              style={[
                styles.bannerUpload,
                {
                  borderColor: banner
                    ? PRIMARY
                    : colors.border,
                },
              ]}
            >
              {banner ? (
                <>
                  <Image
                    source={{ uri: banner.uri }}
                    style={styles.bannerPreview}
                    resizeMode="cover"
                  />

                  <View style={styles.bannerEditOverlay}>
                    <View style={styles.bannerEditIcon}>
                      <Ionicons
                        name="camera"
                        size={16}
                        color={WHITE}
                      />
                    </View>

                    <Text style={styles.bannerEditText}>
                      Change banner
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.bannerEmpty}>
                  <Ionicons
                    name="image-outline"
                    size={27}
                    color={PRIMARY}
                  />

                  <View style={styles.bannerEmptyCopy}>
                    <Text style={styles.uploadTitle}>
                      Add storefront banner
                    </Text>

                    <Text style={styles.uploadSubtitle}>
                      Optional · Helps your shop stand out
                    </Text>
                  </View>

                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={PRIMARY}
                  />
                </View>
              )}
            </TouchableOpacity>
          </Card>

          {/* DELIVERY */}

          <Card style={styles.formCard}>
            <View style={styles.deliveryRow}>
              <View style={styles.deliveryIcon}>
                <Ionicons
                  name="bicycle-outline"
                  size={22}
                  color={PRIMARY}
                />
              </View>

              <View style={styles.deliveryCopy}>
                <View style={styles.deliveryTitleRow}>
                  <Text
                    style={[
                      styles.groupTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Delivery available
                  </Text>

                  {deliveryAvailable ? (
                    <View style={styles.enabledBadge}>
                      <Text style={styles.enabledBadgeText}>
                        ON
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.helperText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Let customers know you offer local
                  delivery.
                </Text>
              </View>

              <Controller
                control={control}
                name="deliveryAvailable"
                render={({
                  field: { onChange, value },
                }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{
                      false: colors.border,
                      true: PRIMARY,
                    }}
                    thumbColor={WHITE}
                  />
                )}
              />
            </View>
          </Card>

          {/* SUBMIT */}

          <View style={styles.submitArea}>
            <View style={styles.approvalNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={PRIMARY}
              />

              <Text style={styles.approvalText}>
                Your shop will be reviewed before it goes
                live on RuVo.
              </Text>
            </View>

            <Button
              title="Register shop"
              size="lg"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 45,
    backgroundColor: BG,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  backButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    marginLeft: -10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  backText: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },

  headerBadge: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  headerBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: PRIMARY,
    letterSpacing: 0.5,
  },

  /* HERO */

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  heroCopy: {
    flex: 1,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  /* PROGRESS */

  progressCard: {
    minHeight: 58,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    paddingHorizontal: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  progressCircleActive: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressTextActive: {
    fontSize: 9.5,
    fontWeight: '900',
    color: PRIMARY,
  },

  progressText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: SUBTEXT,
  },

  progressLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 5,
  },

  /* CARDS */

  formCard: {
    marginVertical: 7,
    padding: 15,
    borderRadius: 19,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  sectionCopy: {
    flex: 1,
  },

  groupTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  helperText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  /* CATEGORY */

  categoryField: {
    marginVertical: 8,
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
  },

  categoryChip: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    margin: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  categoryText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  fieldError: {
    fontSize: 11,
    marginTop: 4,
  },

  /* LOCATION */

  locationActions: {
    gap: 9,
    marginTop: 10,
  },

  locationActionPrimary: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  locationActionDisabled: {
    opacity: 0.65,
  },

  locationActionPrimaryText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '800',
  },

  locationActionSecondary: {
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  locationActionSecondaryText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: '800',
  },

  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 14,
    padding: 11,
    marginTop: 11,
  },

  locationPreviewIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  locationPreviewCopy: {
    flex: 1,
  },

  locationPreviewTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: PRIMARY,
  },

  locationPreviewAddress: {
    fontSize: 10.5,
    lineHeight: 15,
    color: SUBTEXT,
    marginTop: 2,
  },

  coordinatesText: {
    fontSize: 9,
    color: '#89918A',
    marginTop: 2,
  },

  locationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    marginTop: 11,
    gap: 7,
  },

  locationHintText: {
    flex: 1,
    color: SUBTEXT,
    fontSize: 10.5,
    lineHeight: 15,
  },

  coordinates: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginTop: 2,
  },

  coordinateInput: {
    flex: 1,
    marginHorizontal: 4,
  },

  /* MAP */

  mapContainer: {
    flex: 1,
  },

  mapHeader: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
  },

  mapBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  mapHeaderCopy: {
    flex: 1,
  },

  mapTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: TEXT,
  },

  mapSubtitle: {
    fontSize: 10.5,
    color: SUBTEXT,
    marginTop: 2,
  },

  map: {
    flex: 1,
  },

  mapSelectedBar: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 105,
    minHeight: 45,
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  mapSelectedIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  mapSelectedText: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT,
  },

  mapActions: {
    padding: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    backgroundColor: WHITE,
    flexDirection: 'row',
  },

  mapCancel: {
    flex: 1,
    marginRight: 7,
  },

  mapConfirm: {
    flex: 1.35,
    marginLeft: 7,
  },

  /* PHOTOS */

  logoUpload: {
    minHeight: 150,
    marginTop: 11,
    borderRadius: 17,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: '#FBFCFB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  logoPreview: {
    width: 122,
    height: 122,
    borderRadius: 61,
  },

  imageEditBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },

  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  uploadTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '900',
  },

  uploadSubtitle: {
    color: SUBTEXT,
    fontSize: 10,
    marginTop: 3,
  },

  requiredBadge: {
    marginTop: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: PRIMARY_LIGHT,
  },

  requiredText: {
    color: PRIMARY,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  changePhotoButton: {
    alignSelf: 'center',
    marginTop: 8,
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  changePhotoText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: '800',
  },

  bannerUpload: {
    minHeight: 92,
    marginTop: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: '#FBFCFB',
    overflow: 'hidden',
  },

  bannerPreview: {
    width: '100%',
    height: 145,
  },

  bannerEmpty: {
    minHeight: 90,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bannerEmptyCopy: {
    flex: 1,
    marginLeft: 11,
  },

  bannerEditOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 42,
    paddingHorizontal: 11,
    backgroundColor: 'rgba(0,0,0,0.48)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  bannerEditIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  bannerEditText: {
    color: WHITE,
    fontSize: 10.5,
    fontWeight: '800',
  },

  /* DELIVERY */

  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  deliveryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  deliveryCopy: {
    flex: 1,
    paddingRight: 8,
  },

  deliveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  enabledBadge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
  },

  enabledBadgeText: {
    color: PRIMARY,
    fontSize: 8,
    fontWeight: '900',
  },

  /* SUBMIT */

  submitArea: {
    marginTop: 10,
  },

  approvalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 13,
    padding: 10,
    gap: 7,
  },

  approvalText: {
    flex: 1,
    color: '#55705A',
    fontSize: 10.5,
    lineHeight: 15,
  },

  submitButton: {
    marginTop: 11,
  },
});

export default RegisterShopScreen;