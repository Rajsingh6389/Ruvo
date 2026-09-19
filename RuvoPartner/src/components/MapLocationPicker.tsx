/**
 * MapLocationPicker
 * A full-screen modal that lets the user:
 *  1. Search for a place via GooglePlacesAutocomplete
 *  2. Drag a pin on a MapView to fine-tune the exact location
 *  3. Confirm — returns { latitude, longitude, address, city, state, pincode }
 *
 * Uses the Google Maps / Geocoding API key from expo-constants.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MAPS_API_KEY: string =
  (Constants.expoConfig?.extra as any)?.googleMapsApiKey ||
  'AIzaSyDUhMspUQnPIjzOzzDNimx5vCP1-8HRGxQ';

export interface LocationResult {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  formattedAddress: string;
}

interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: LocationResult) => void;
  initialRegion?: Region;
  title?: string;
  colors: any;
  typography: any;
}

async function reverseGeocodeGoogle(lat: number, lng: number): Promise<Partial<LocationResult>> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_API_KEY}&language=en`;
    console.log('[GoogleGeocoding Partner] Requesting reverse geocode for:', lat, lng);
    const res  = await fetch(url);
    const json = await res.json();
    console.log('[GoogleGeocoding Partner] Response status:', json.status, json.error_message ? `Error: ${json.error_message}` : '');
    
    if (json.status === 'OK' && json.results?.length) {
      const best = json.results[0];
      const components: Record<string, string> = {};
      for (const comp of best.address_components ?? []) {
        for (const type of comp.types) {
          components[type] = comp.long_name;
        }
      }

      // Build clean street address
      const streetParts = [
        components['street_number'],
        components['route'],
        components['sublocality_level_2'],
        components['sublocality_level_1'] || components['sublocality'],
        components['neighborhood'],
      ].filter(Boolean);

      const result = {
        address         : streetParts.join(', ') || components['premise'] || '',
        city            : components['locality'] || components['administrative_area_level_2'] || '',
        state           : components['administrative_area_level_1'] || '',
        pincode         : components['postal_code'] || '',
        formattedAddress: best.formatted_address || '',
      };
      console.log('[GoogleGeocoding Partner] Resolved address:', result.formattedAddress);
      return result;
    }
    console.warn('[GoogleGeocoding Partner] Web API non-OK status (' + json.status + '). Falling back to native device geocoder...');
  } catch (err) {
    console.error('[GoogleGeocoding Partner] Web API fetch error:', err);
  }

  // ── Native Expo Location Fallback ──────────────────────────────────────────
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (places && places.length > 0) {
      const p = places[0];
      const streetParts = [p.streetNumber, p.street, p.subregion !== p.city ? p.subregion : null, p.district].filter(Boolean);
      const fallbackResult = {
        address         : streetParts.join(', ') || p.name || '',
        city            : p.city || p.subregion || '',
        state           : p.region || '',
        pincode         : p.postalCode || '',
        formattedAddress: [streetParts.join(', ') || p.name, p.city || p.subregion, p.region, p.postalCode].filter(Boolean).join(', '),
      };
      console.log('[NativeGeocoding Partner Fallback] Resolved:', fallbackResult.formattedAddress);
      return fallbackResult;
    }
  } catch (expoErr) {
    console.error('[NativeGeocoding Partner Fallback Error]:', expoErr);
  }
  return {};
}

const DEFAULT_REGION: Region = {
  latitude      : 20.5937,
  longitude     : 78.9629,
  latitudeDelta : 0.01,
  longitudeDelta: 0.01,
};

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  visible, onClose, onConfirm, initialRegion, title = 'Pick Location', colors, typography,
}) => {
  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<Region>(initialRegion ?? DEFAULT_REGION);
  const [geocoding, setGeocoding] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [preview,   setPreview]   = useState<Partial<LocationResult>>({});

  const geocodeAndPreview = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    const result = await reverseGeocodeGoogle(lat, lng);
    setPreview(result);
    setGeocoding(false);
  }, []);

  const fetchAndGoToCurrentLocation = useCallback(async () => {
    setLocatingUser(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[MapLocationPicker Partner] Location permission denied');
        setLocatingUser(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      console.log('[MapLocationPicker Partner] Fetched user current location:', pos.coords.latitude, pos.coords.longitude);
      const newRegion: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      currentRegionRef.current = newRegion;
      mapRef.current?.animateToRegion(newRegion, 600);
      geocodeAndPreview(pos.coords.latitude, pos.coords.longitude);
    } catch (err) {
      console.warn('[MapLocationPicker Partner] Error getting current GPS position:', err);
    } finally {
      setLocatingUser(false);
    }
  }, [geocodeAndPreview]);

  React.useEffect(() => {
    if (visible) {
      if (initialRegion) {
        currentRegionRef.current = initialRegion;
        geocodeAndPreview(initialRegion.latitude, initialRegion.longitude);
      } else {
        fetchAndGoToCurrentLocation();
      }
    }
  }, [visible, initialRegion, fetchAndGoToCurrentLocation, geocodeAndPreview]);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    console.log('[MapView Partner] Region change complete:', r.latitude, r.longitude);
    currentRegionRef.current = r;
    geocodeAndPreview(r.latitude, r.longitude);
  }, [geocodeAndPreview]);

  const handlePlaceSelected = useCallback((data: any, detail: any = null) => {
    console.log('[GooglePlacesAutocomplete Partner] Place selected:', data?.description, 'Detail:', detail?.geometry?.location);
    const loc = detail?.geometry?.location;
    if (!loc) {
      console.warn('[GooglePlacesAutocomplete Partner] Missing location in details:', detail);
      return;
    }
    const newRegion: Region = {
      latitude      : loc.lat,
      longitude     : loc.lng,
      latitudeDelta : 0.008,
      longitudeDelta: 0.008,
    };
    currentRegionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion, 500);
    geocodeAndPreview(loc.lat, loc.lng);
  }, [geocodeAndPreview]);

  const handleConfirm = () => {
    if (!preview.address && !preview.formattedAddress) {
      Alert.alert('Loading…', 'Still resolving address. Please wait a moment.');
      return;
    }
    const finalCoords = currentRegionRef.current;
    onConfirm({
      latitude        : finalCoords.latitude,
      longitude       : finalCoords.longitude,
      address         : preview.address         || '',
      city            : preview.city            || '',
      state           : preview.state           || '',
      pincode         : preview.pincode         || '',
      formattedAddress: preview.formattedAddress || '',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[s.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[typography.headingS, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
            {title}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search bar */}
        <View style={[s.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <GooglePlacesAutocomplete
            placeholder="Search for an address or place…"
            onPress={handlePlaceSelected}
            fetchDetails
            query={{ key: MAPS_API_KEY, language: 'en', components: 'country:in' }}
            onFail={(error) => console.error('[GooglePlacesAutocomplete Partner ERROR]:', error)}
            textInputProps={{
              placeholderTextColor: colors.textHint,
            }}
            styles={{
              container  : { flex: 0, zIndex: 999 },
              textInput  : {
                ...typography.body,
                color           : colors.textPrimary,
                backgroundColor : colors.surfaceSunken,
                borderRadius    : 8,
                paddingHorizontal: 12,
                height          : 44,
              },
              listView   : {
                backgroundColor: colors.card,
                position: 'absolute',
                top: 50,
                left: 0,
                right: 0,
                borderRadius: 8,
                elevation: 5,
                zIndex: 1000,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
              },
              row        : { backgroundColor: colors.card, paddingVertical: 12 },
              description: { color: colors.textPrimary },
              separator  : { backgroundColor: colors.border },
            }}
            renderLeftButton={() => (
              <View style={s.searchIcon}>
                <Ionicons name="search-outline" size={18} color={colors.textHint} />
              </View>
            )}
            enablePoweredByContainer={false}
            debounce={300}
          />
        </View>

        {/* Map */}
        <View style={s.mapContainer}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            initialRegion={initialRegion ?? DEFAULT_REGION}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
          />

          {/* Fixed centre pin */}
          <View style={s.pinWrapper} pointerEvents="none">
            <Ionicons name="location" size={42} color={colors.primary} />
            <View style={[s.pinShadow, { backgroundColor: colors.primary }]} />
          </View>

          {/* My-location FAB */}
          <TouchableOpacity
            style={[s.myLocationBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={fetchAndGoToCurrentLocation}
            disabled={locatingUser}
            activeOpacity={0.8}
          >
            {locatingUser ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="locate" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Address preview card */}
        <View style={[s.previewCard, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={s.previewRow}>
            <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              {geocoding ? (
                <View style={s.geocodingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 8 }]}>
                    Resolving address…
                  </Text>
                </View>
              ) : preview.formattedAddress ? (
                <>
                  <Text style={[typography.body, { color: colors.textPrimary, fontFamily: 'Poppins_700Bold' }]} numberOfLines={2}>
                    {preview.address || preview.formattedAddress}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                    {[preview.city, preview.state, preview.pincode].filter(Boolean).join(', ')}
                  </Text>
                </>
              ) : (
                <Text style={[typography.caption, { color: colors.textHint }]}>
                  Drag the map to select your exact location
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              s.confirmBtn,
              { backgroundColor: preview.formattedAddress ? colors.primary : colors.border },
            ]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={geocoding}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={[typography.body, { color: '#FFFFFF', fontFamily: 'Poppins_700Bold', marginLeft: 6 }]}>
              Confirm Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root        : { flex: 1 },
  header      : {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: Platform.OS === 'android' ? 36 : 52,
  },
  closeBtn    : { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchWrap  : { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10 },
  searchIcon  : { justifyContent: 'center', paddingLeft: 2, paddingRight: 6 },
  mapContainer: { flex: 1 },
  pinWrapper  : {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -21, marginTop: -42,
    alignItems: 'center',
  },
  pinShadow   : {
    width: 8, height: 8, borderRadius: 4, marginTop: -2, opacity: 0.4,
  },
  myLocationBtn: {
    position: 'absolute', right: 16, bottom: 16,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  previewCard : {
    borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  previewRow  : { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  geocodingRow: { flexDirection: 'row', alignItems: 'center' },
  confirmBtn  : {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 10,
  },
});
