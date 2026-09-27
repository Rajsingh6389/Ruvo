import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useDeliveryLocation,
  type AddressDetails,
} from '../context/DeliveryLocationContext';
import {
  searchLocationSuggestions,
  geocodeDetails,
  type LocationSearchResult,
} from '../utils/locationUtils';
import MapView, { Region, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

// Handle blank map in Expo Go vs Production
const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
const MAP_PROVIDER = isExpoGo ? undefined : PROVIDER_GOOGLE;

console.log('[LocationPickerModal] ENV CHECK ->', {
  executionEnvironment: Constants.executionEnvironment,
  appOwnership: Constants.appOwnership,
  isExpoGo,
  MAP_PROVIDER
});

type Props = {
  visible: boolean;
  onClose: () => void;
};

const emptyForm = (): AddressDetails => ({
  house: '',
  street: '',
  landmark: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
  receiverName: '',
  phone: '',
});

export const LocationPickerModal = ({ visible, onClose }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    location,
    savedAddresses,
    isLoading,
    isTracking,
    refreshFromGps,
    startTracking,
    stopTracking,
    saveAddress,
    deleteAddress,
    selectSavedAddress,
  } = useDeliveryLocation();

  const [mode, setMode] = useState<'list' | 'map' | 'form'>('list');
  const [form, setForm] = useState<AddressDetails>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  // List-mode search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Map-mode search state
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<LocationSearchResult[]>([]);
  const [isMapSearching, setIsMapSearching] = useState(false);

  // Map state
  const mapRef = useRef<MapView>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [mapAddressLoading, setMapAddressLoading] = useState(false);
  const [mapGeocodedAddress, setMapGeocodedAddress] = useState<{ short: string; full: string }>({ short: '', full: '' });

  // Animation for the fixed map pin jumping
  const pinAnimY = useRef(new Animated.Value(0)).current;

  // On open, reset state
  useEffect(() => {
    if (visible) {
      setMode('list');
      setForm(location?.details ?? emptyForm());
      setEditingId(null);
      setEditingLabel('');
      setFormError(null);
      setSearchQuery('');
      setSearchResults([]);
      setMapSearchQuery('');
      setMapSearchResults([]);
      startTracking();
    }
  }, [visible]);

  // Handle live search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    if (mode === 'map' || mode === 'form') return; // Do not search if not in list mode

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchLocationSuggestions(searchQuery);
        setSearchResults(res);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  // Debounced live search for MAP mode
  useEffect(() => {
    if (!mapSearchQuery.trim() || mapSearchQuery.trim().length < 3) {
      setMapSearchResults([]);
      setIsMapSearching(false);
      return;
    }
    setIsMapSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchLocationSuggestions(mapSearchQuery);
        setMapSearchResults(res);
      } catch {
        setMapSearchResults([]);
      } finally {
        setIsMapSearching(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [mapSearchQuery]);

  // Animate Map Pin
  useEffect(() => {
    if (isMapMoving) {
      Animated.timing(pinAnimY, { toValue: -15, duration: 150, useNativeDriver: true }).start();
    } else {
      Animated.spring(pinAnimY, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true }).start();
    }
  }, [isMapMoving]);

  // Form updater
  const update = (key: keyof AddressDetails, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (missingFields.includes(key)) {
      setMissingFields(prev => prev.filter(f => f !== key));
    }
  };

  // 1. User clicks "Use Current Location"
  const handleUseGps = async () => {
    setGpsLoading(true);
    try {
      // Ask for permission explicitly first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsLoading(false);
        return;
      }
      // Get current GPS position directly
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Switch to map mode and animate to position immediately
      setMode('map');
      setMapRegion(prev => ({ ...prev, latitude: lat, longitude: lng }));
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 300);
        }
      }, 350); // wait for map to mount

      // Fetch address in background
      const geo = await geocodeDetails(lat, lng);
      setMapGeocodedAddress({
        short: geo.shortAddress || 'Current Location',
        full: geo.fullAddress || '',
      });
      setForm(prev => ({
        ...prev,
        house: geo.house || prev.house,
        street: geo.street || prev.street,
        area: geo.area || prev.area,
        city: geo.city || prev.city,
        state: geo.state || prev.state,
        pincode: geo.pincode || prev.pincode,
      }));
    } catch {
      // Fall back to context GPS if direct call fails
      await refreshFromGps();
      setMode('map');
    } finally {
      setGpsLoading(false);
    }
  };
  
  // Keep local map centered if context gps completes
  useEffect(() => {
    if (mode === 'map' && location && !isMapMoving) {
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 300);
      }
      setMapGeocodedAddress({
        short: location.shortLabel || 'Current Location',
        full: location.fullAddress || '',
      });
    }
  }, [location?.latitude, location?.longitude, mode]);

  // 2. User selects a Search Result -> Go to Map Mode directly at that coordinate
  const handleSelectSearchResult = async (res: LocationSearchResult) => {
    stopTracking(); 
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: res.latitude,
        longitude: res.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 300);
    }
    setMapGeocodedAddress({ short: res.title, full: res.details.fullAddress || res.subtitle });
    setForm(prev => ({
      ...prev,
      house: res.details.house || prev.house,
      street: res.details.street || prev.street,
      area: res.details.area || prev.area,
      city: res.details.city || prev.city,
      state: res.details.state || prev.state,
      pincode: res.details.pincode || prev.pincode,
    }));
    setMode('map');
  };

  // 3. User selects a Saved Address -> Use immediately & Close
  const handleSelectSavedAddress = async (item: any) => {
    await selectSavedAddress({
      id: item.id || Date.now().toString(),
      name: item.name || item.details.house || item.details.area,
      details: item.details,
      latitude: item.latitude,
      longitude: item.longitude,
    });
    onClose();
  };

  // 4. Map Region changes (user drags map)
  const onRegionChange = () => {
    if (!isMapMoving) {
      setIsMapMoving(true);
    }
  };
  
  const onRegionChangeComplete = async (region: Region) => {
    setIsMapMoving(false);
    setMapRegion(region);
    setMapAddressLoading(true);
    try {
      const geo = await geocodeDetails(region.latitude, region.longitude);
      if (geo) {
        setMapGeocodedAddress({
          short: geo.shortAddress || geo.area || 'Selected Location',
          full: geo.fullAddress || '',
        });
        setForm(prev => ({
          ...prev,
          house: geo.house || '',
          street: geo.street || '',
          landmark: geo.landmark || '',
          area: geo.area || '',
          city: geo.city || '',
          state: geo.state || '',
          pincode: geo.pincode || '',
        }));
      }
    } catch {} finally {
      setMapAddressLoading(false);
    }
  };

  // 5. Submit form
  const handleSaveFormAddress = async () => {
    setSaving(true);
    setFormError(null);
    setMissingFields([]);
    
    const missing = [];
    if (!form.house.trim()) missing.push('house');
    if (!form.area.trim()) missing.push('area');
    if (!form.city.trim()) missing.push('city');
    if (form.pincode.trim().length < 6) missing.push('pincode');
    if (form.phone.trim().length < 10) missing.push('phone');
    
    if (missing.length > 0) {
      setMissingFields(missing);
      setFormError('Please fill in the required fields correctly.');
      setSaving(false);
      return;
    }

    try {
      const labelToUse = editingLabel.trim() || form.house || form.area || 'Home';
      const saved = await saveAddress(form, editingId || undefined, labelToUse);
      if (saved) {
        onClose();
      } else {
        setFormError('Validation failed. Please check required fields (House, Area, City, Pincode of 6 digits, Phone of 10 digits).');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save delivery address.');
    } finally {
      setSaving(false);
    }
  };

  const displayAddresses = useMemo(() => {
    const list: any[] = [];
    savedAddresses.forEach(sa => {
      list.push({
        ...sa,
        addressString: `${sa.details.house ? sa.details.house + ', ' : ''}${sa.details.area}, ${sa.details.city}`,
        isSavedUserItem: true,
      });
    });
    if (location?.details && !list.some(l => l.details.house === location.details.house && l.details.area === location.details.area)) {
      list.push({
        id: 'current-gps',
        name: location.shortLabel || 'Current GPS Address',
        details: location.details,
        addressString: location.fullAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        isSavedUserItem: false,
      });
    }
    if (!searchQuery.trim()) return list;
    return list.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.addressString.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [savedAddresses, location, searchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          
          {/* ======================= MODE: LIST (SEARCH / SAVED) ======================= */}
          {mode === 'list' && (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              {/* Header */}
              <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={onClose} style={styles.backBtnWrapper} hitSlop={15}>
                  <Ionicons name="close" size={26} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Select a Location</Text>
                <View style={{ width: 26 }} />
              </View>

              {/* Search Bar */}
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color="#FF6B35" />
                <TextInput
                  placeholder="Search for your area or apartment..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  autoFocus={false}
                />
                {isSearching && <ActivityIndicator size="small" color="#FF6B35" />}
                {searchQuery.length > 0 && !isSearching && (
                   <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                     <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                   </TouchableOpacity>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                {searchQuery.trim().length > 2 && searchResults.length > 0 ? (
                  // Search Results View
                  <View style={styles.resultsBox}>
                    <Text style={[styles.sectionSectionHeader, { color: colors.textSecondary }]}>SEARCH RESULTS</Text>
                    {searchResults.map((res, idx) => (
                      <View key={res.id}>
                        {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                        <TouchableOpacity style={styles.addressListRow} onPress={() => handleSelectSearchResult(res)} activeOpacity={0.7}>
                          <View style={styles.listIconBox}><Ionicons name="pin" size={20} color="#71717A" /></View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.listTitle, { color: colors.textPrimary }]} numberOfLines={1}>{res.title}</Text>
                            <Text style={[styles.listSub, { color: colors.textSecondary }]} numberOfLines={2}>{res.subtitle || res.details.fullAddress}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  // Default View: Current Location Button + Saved Addresses
                  <>
                    <TouchableOpacity style={[styles.useCurrentCard, gpsLoading && { opacity: 0.7 }]} onPress={handleUseGps} activeOpacity={0.8} disabled={gpsLoading}>
                      <View style={styles.currentIconGlow}>
                        {gpsLoading
                          ? <ActivityIndicator size="small" color="#FF6B35" />
                          : <Ionicons name="locate" size={22} color="#FF6B35" />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.currentCardTitle}>{gpsLoading ? 'Getting location...' : 'Use Current Location'}</Text>
                        <Text style={styles.currentCardSub}>{location?.shortLabel || 'Using GPS'}</Text>
                      </View>
                      {!gpsLoading && <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />}
                    </TouchableOpacity>

                    {displayAddresses.length > 0 && (
                      <View style={{ marginTop: 24 }}>
                        <Text style={[styles.sectionSectionHeader, { color: colors.textSecondary }]}>SAVED ADDRESSES</Text>
                        <View style={[styles.savedCardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          {displayAddresses.map((item, index) => (
                            <View key={item.id}>
                              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                              <View style={styles.addressListRow}>
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => handleSelectSavedAddress(item)} activeOpacity={0.7}>
                                  <View style={styles.listIconBox}>
                                    <Ionicons name={item.name.toLowerCase() === 'home' ? 'home' : item.name.toLowerCase() === 'work' ? 'briefcase' : 'location'} size={20} color="#10B981" />
                                  </View>
                                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                      <Text style={[styles.listTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                                    </View>
                                    <Text style={[styles.listSub, { color: colors.textSecondary }]} numberOfLines={2}>{item.addressString}</Text>
                                  </View>
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <TouchableOpacity onPress={() => {
                                      setEditingId(item.id);
                                      setEditingLabel(item.name || '');
                                      setForm(item.details);
                                      setMode('form');
                                  }} style={{ padding: 6 }}>
                                    <Ionicons name="create-outline" size={20} color="#3B82F6" />
                                  </TouchableOpacity>
                                  {item.isSavedUserItem && (
                                    <TouchableOpacity onPress={() => deleteAddress(item.id)} style={{ padding: 6 }}>
                                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          )}

          {/* ======================= MODE: MAP SELECTION ======================= */}
          {mode === 'map' && (
            <View style={{ flex: 1, backgroundColor: '#E0E0E0' }}>
              <MapView
                ref={mapRef}
                provider={MAP_PROVIDER}
                style={{ flex: 1 }}
                initialRegion={mapRegion}
                onRegionChange={onRegionChange}
                onRegionChangeComplete={onRegionChangeComplete}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                {/* Tile Fallback in Expo Go / No Provider mode */}
                {MAP_PROVIDER === undefined && (
                  <UrlTile urlTemplate="https://a.tile.openstreetmap.de/{z}/{x}/{y}.png" maximumZ={19} />
                )}
              </MapView>

              {/* Back Button and Real Search Input Overlay */}
              <View
                style={[
                  styles.mapFloatingTopContainer,
                  { top: insets.top + 8, flexDirection: 'column', gap: 0 },
                ]}
                pointerEvents="box-none"
              >
                {/* Row: back + search input */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity style={styles.mapFloatingBack} onPress={() => { setMapSearchQuery(''); setMapSearchResults([]); setMode('list'); }} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={24} color="#171A1F" />
                  </TouchableOpacity>
                  <View style={[styles.mapSearchOverlay, { flex: 1 }]} pointerEvents="auto">
                    <Ionicons name="search" size={20} color="#FF6B35" />
                    <TextInput
                      style={[styles.mapSearchText, { flex: 1, color: '#0F172A', padding: 0 }]}
                      placeholder="Search area, building..."
                      placeholderTextColor="#94A3B8"
                      value={mapSearchQuery}
                      onChangeText={setMapSearchQuery}
                      returnKeyType="search"
                      autoCorrect={false}
                    />
                    {isMapSearching && <ActivityIndicator size="small" color="#FF6B35" style={{ marginLeft: 6 }} />}
                    {mapSearchQuery.length > 0 && !isMapSearching && (
                      <TouchableOpacity onPress={() => { setMapSearchQuery(''); setMapSearchResults([]); }} hitSlop={10}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Dropdown results */}
                {mapSearchResults.length > 0 && (
                  <View style={styles.mapSearchDropdown} pointerEvents="auto">
                    <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                      {mapSearchResults.map((res, idx) => (
                        <TouchableOpacity
                          key={res.id}
                          style={[
                            styles.mapSearchDropdownRow,
                            idx < mapSearchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }
                          ]}
                          onPress={() => {
                            setMapSearchQuery('');
                            setMapSearchResults([]);
                            if (mapRef.current) {
                              mapRef.current.animateToRegion({
                                latitude: res.latitude,
                                longitude: res.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                              }, 300);
                            }
                            setMapGeocodedAddress({ short: res.title, full: res.subtitle || res.details.fullAddress });
                            setForm(prev => ({
                              ...prev,
                              house: res.details.house || prev.house,
                              street: res.details.street || prev.street,
                              area: res.details.area || prev.area,
                              city: res.details.city || prev.city,
                              state: res.details.state || prev.state,
                              pincode: res.details.pincode || prev.pincode,
                            }));
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="location-outline" size={18} color="#FF6B35" style={{ marginRight: 10, marginTop: 2 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#0F172A' }} numberOfLines={1}>{res.title}</Text>
                            <Text style={{ fontSize: 12, color: '#64748B', fontFamily: 'Poppins_400Regular', marginTop: 2 }} numberOfLines={1}>{res.subtitle}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* The Fixed Center Pin */}
              <View style={styles.fixedPinContainer} pointerEvents="none">
                 <Animated.View style={[styles.mapPinGraphic, { transform: [{ translateY: pinAnimY }] }]}>
                    <View style={styles.mapPinInner}>
                       <Ionicons name="location" size={32} color="#FF5722" />
                    </View>
                    <View style={styles.mapPinStem} />
                 </Animated.View>
                 <View style={[styles.mapPinShadow, isMapMoving && { opacity: 0.3, transform: [{ scale: 0.8 }] }]} />
              </View>

              {/* Floating GPS Target */}
              <TouchableOpacity style={styles.mapFloatingGps} onPress={() => { refreshFromGps(); }} activeOpacity={0.8}>
                <Ionicons name="locate" size={24} color="#FF5722" />
              </TouchableOpacity>

              {/* Map Bottom Sheet overlay */}
              <View style={styles.mapBottomSheet}>
                 <Text style={styles.mapPromptTitle}>Select delivery location</Text>
                 <View style={styles.mapParsedLocationRow}>
                   <Ionicons name="location-sharp" size={26} color="#FF5722" style={{ marginRight: 12, marginTop: 2 }} />
                   <View style={{ flex: 1 }}>
                     <Text style={styles.mapParsedShort} numberOfLines={1}>
                       {mapAddressLoading ? 'Loading area...' : (mapGeocodedAddress.short || 'Locating...')}
                     </Text>
                     <Text style={styles.mapParsedFull} numberOfLines={2}>
                       {mapAddressLoading ? 'Fetching accurate address...' : (mapGeocodedAddress.full || 'Move pin to get precise address')}
                     </Text>
                   </View>
                 </View>

                 <TouchableOpacity style={[styles.confirmBtn, { marginTop: 16 }]} onPress={() => setMode('form')} disabled={mapAddressLoading} activeOpacity={0.8}>
                    {mapAddressLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>Enter complete address</Text>}
                 </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ======================= MODE: FORM (ENTERING HOUSE DETAILS) ======================= */}
          {mode === 'form' && (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => setMode(editingId ? 'list' : 'map')} style={styles.backBtnWrapper} hitSlop={15}>
                  <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{editingId ? 'Edit saved address' : 'Enter address details'}</Text>
                <View style={{ width: 26 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContainer, { paddingTop: 12 }]}>
                {/* Visual Map Context Snippet */}
                {!editingId && (
                  <View style={styles.formContextRow}>
                     <Ionicons name="location" size={20} color="#FF6B35" />
                     <View style={{ flex: 1, marginLeft: 8 }}>
                       <Text style={styles.listTitle} numberOfLines={1}>{mapGeocodedAddress.short}</Text>
                       <Text style={styles.listSub} numberOfLines={1}>{mapGeocodedAddress.full}</Text>
                     </View>
                     <TouchableOpacity onPress={() => setMode('map')}>
                       <Text style={{ fontSize: 13, color: '#FF6B35', fontFamily: 'Poppins_700Bold' }}>CHANGE</Text>
                     </TouchableOpacity>
                  </View>
                )}

                <View style={{ height: 16 }}/>
                
                <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#64748B', marginBottom: 10, letterSpacing: 0.5 }}>
                  SAVE ADDRESS AS
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {[
                    { label: 'Home', icon: 'home-outline', color: '#F97316' },
                    { label: 'Work', icon: 'briefcase-outline', color: '#3B82F6' },
                    { label: 'Other', icon: 'location-outline', color: '#10B981' },
                  ].map(tag => {
                    const active = (editingLabel || 'Home').toLowerCase() === tag.label.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={tag.label}
                        onPress={() => setEditingLabel(tag.label)}
                        style={[
                          styles.tagChip,
                          active && { backgroundColor: tag.color, borderColor: tag.color }
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={tag.icon as any} size={14} color={active ? '#FFF' : '#475569'} />
                        <Text style={[styles.tagText, active && { color: '#FFF' }]}>{tag.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

                <Field label="Flat / House no / Floor / Building *" value={form.house} onChangeText={v => update('house', v)} placeholder="E.g. Flat 402, 4th Floor..." isError={missingFields.includes('house')} />
                <Field label="Street / Road / Area *" value={form.street} onChangeText={v => update('street', v)} placeholder="E.g. Main Market Road" isError={missingFields.includes('street')} />
                <Field label="Landmark (Optional)" value={form.landmark} onChangeText={v => update('landmark', v)} placeholder="E.g. Near City Metro Station" />
                
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Locality / Sector *" value={form.area} onChangeText={v => update('area', v)} placeholder="" isError={missingFields.includes('area')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="City *" value={form.city} onChangeText={v => update('city', v)} placeholder="" isError={missingFields.includes('city')} />
                  </View>
                </View>
                <Field label="Pincode *" value={form.pincode} onChangeText={v => update('pincode', v)} placeholder="6-digit pincode" keyboardType="number-pad" isError={missingFields.includes('pincode')} />
                
                <Text style={{ fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#1E293B', marginTop: 12, marginBottom: 12 }}>Contact Details (for delivery)</Text>
                <Field label="Receiver Name *" value={form.receiverName} onChangeText={v => update('receiverName', v)} placeholder="E.g. Rahul Sharma" />
                <Field label="Phone Number *" value={form.phone} onChangeText={v => update('phone', v)} placeholder="10-digit number" keyboardType="phone-pad" isError={missingFields.includes('phone')} />

                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveFormAddress} disabled={saving} activeOpacity={0.8}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>{editingId ? 'Update & Proceed' : 'Save Address & Proceed'}</Text>}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Reusable Input Field Component
const Field = ({ label, isError, ...props }: { label: string, isError?: boolean } & React.ComponentProps<typeof TextInput>) => (
  <View style={styles.field}>
    <Text style={[styles.fieldLabel, isError && { color: '#EF4444' }]}>{label}</Text>
    <TextInput placeholderTextColor="#94A3B8" style={[styles.input, isError && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]} {...props} />
    {isError && <Text style={{ color: '#EF4444', fontSize: 11, fontFamily: 'Poppins_400Regular', marginTop: 4 }}>This field is required & must be valid.</Text>}
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  sheet: {
    flex: 1,
  },
  
  // Shared Top Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtnWrapper: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#0F172A',
  },
  
  // List Mode
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    marginLeft: 10,
    fontFamily: 'Poppins_400Regular',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  useCurrentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: '#FFDCD2',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  currentIconGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FF6B35',
  },
  currentCardSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#FB923C',
    marginTop: 2,
  },
  sectionSectionHeader: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.8,
  },
  resultsBox: {
    marginTop: 16,
  },
  savedCardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  listIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#0F172A',
  },
  listSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Poppins_400Regular',
  },

  // Map Mode
  mapFloatingTopContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  mapFloatingBack: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginRight: 12,
  },
  mapSearchOverlay: {
    flex: 1,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  mapSearchText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Poppins_400Regular',
  },
  mapSearchDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  mapSearchDropdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mapFloatingGps: {
    position: 'absolute',
    right: 20,
    bottom: 230,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fixedPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -44, // offset exact center
    marginLeft: -16,
    alignItems: 'center',
    zIndex: 10,
  },
  mapPinGraphic: {
    alignItems: 'center',
  },
  mapPinInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  mapPinStem: {
    width: 4,
    height: 14,
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: -2, // tuck under the circle
    zIndex: -1,
  },
  mapPinShadow: {
    width: 12,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
    marginTop: 2,
  },
  mapBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  mapPromptTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#64748B',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapParsedLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mapParsedShort: {
    fontSize: 20,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#0F172A',
  },
  mapParsedFull: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },

  // Form Mode
  formContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0ED',
    padding: 12,
    borderRadius: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#475569',
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    backgroundColor: '#FF5722',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 16,
    fontFamily: 'Poppins_700Bold',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
});
