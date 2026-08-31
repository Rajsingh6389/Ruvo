/**
 * MapLocationPicker — RuvoShop
 * Full-screen modal: Google Places search + draggable map pin + Google Geocoding
 * Returns { latitude, longitude, address, city, state, pincode, formattedAddress }
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
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const MAPS_API_KEY: string =
  (Constants.expoConfig?.extra as any)?.googleMapsApiKey ||
  'AIzaSyBHLzfYTywdmSUoGSm6xyoqL2kPOVjM9B0';

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
    const res  = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK' || !json.results?.length) return {};
    const best = json.results[0];
    const components: Record<string, string> = {};
    for (const comp of best.address_components ?? []) {
      for (const type of comp.types) components[type] = comp.long_name;
    }
    const streetParts = [
      components['street_number'],
      components['route'],
      components['sublocality_level_2'],
      components['sublocality_level_1'] || components['sublocality'],
      components['neighborhood'],
    ].filter(Boolean);
    return {
      address        : streetParts.join(', ') || components['premise'] || '',
      city           : components['locality'] || components['administrative_area_level_2'] || '',
      state          : components['administrative_area_level_1'] || '',
      pincode        : components['postal_code'] || '',
      formattedAddress: best.formatted_address || '',
    };
  } catch {
    return {};
  }
}

const DEFAULT_REGION: Region = {
  latitude: 20.5937, longitude: 78.9629, latitudeDelta: 8, longitudeDelta: 8,
};

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  visible, onClose, onConfirm, initialRegion, title = 'Pick Location', colors, typography,
}) => {
  const mapRef  = useRef<MapView>(null);
  const [region,    setRegion]    = useState<Region>(initialRegion ?? DEFAULT_REGION);
  const [geocoding, setGeocoding] = useState(false);
  const [preview,   setPreview]   = useState<Partial<LocationResult>>({});

  const geocodeAndPreview = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    const result = await reverseGeocodeGoogle(lat, lng);
    setPreview(result);
    setGeocoding(false);
  }, []);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setRegion(r);
    geocodeAndPreview(r.latitude, r.longitude);
  }, [geocodeAndPreview]);

  const handlePlaceSelected = useCallback((data: any, detail: any) => {
    const loc = detail?.geometry?.location;
    if (!loc) return;
    const newRegion: Region = {
      latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.008, longitudeDelta: 0.008,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 500);
    geocodeAndPreview(loc.lat, loc.lng);
  }, [geocodeAndPreview]);

  const handleConfirm = () => {
    if (!preview.address && !preview.formattedAddress) {
      Alert.alert('Loading…', 'Still resolving address. Please wait a moment.');
      return;
    }
    onConfirm({
      latitude        : region.latitude,
      longitude       : region.longitude,
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

        {/* Google Places search */}
        <View style={[s.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <GooglePlacesAutocomplete
            placeholder="Search for your shop address…"
            onPress={handlePlaceSelected}
            fetchDetails
            query={{ key: MAPS_API_KEY, language: 'en', components: 'country:in' }}
            styles={{
              container  : { flex: 0 },
              textInput  : {
                ...typography.body,
                color           : colors.textPrimary,
                backgroundColor : colors.surfaceSunken,
                borderRadius    : 8,
                paddingHorizontal: 12,
                height          : 44,
              },
              listView   : { backgroundColor: colors.card },
              row        : { backgroundColor: colors.card, paddingVertical: 10 },
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
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            region={region}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
          />
          {/* Fixed centre pin */}
          <View style={s.pinWrapper} pointerEvents="none">
            <Ionicons name="location" size={42} color={colors.primary} />
            <View style={[s.pinShadow, { backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Address preview + confirm */}
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
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]} numberOfLines={2}>
                    {preview.address || preview.formattedAddress}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                    {[preview.city, preview.state, preview.pincode].filter(Boolean).join(', ')}
                  </Text>
                </>
              ) : (
                <Text style={[typography.caption, { color: colors.textHint }]}>
                  Drag the map or search to select your shop location
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[s.confirmBtn, { backgroundColor: preview.formattedAddress ? colors.primary : colors.border }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={geocoding}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }]}>
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
    marginLeft: -21, marginTop: -42, alignItems: 'center',
  },
  pinShadow   : { width: 8, height: 8, borderRadius: 4, marginTop: -2, opacity: 0.4 },
  previewCard : {
    borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  previewRow  : { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  geocodingRow: { flexDirection: 'row', alignItems: 'center' },
  confirmBtn  : {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 10,
  },
});
