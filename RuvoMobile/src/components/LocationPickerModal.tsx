import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useDeliveryLocation,
  type AddressDetails,
} from '../context/DeliveryLocationContext';
import {
  searchLocationSuggestions,
  type LocationSearchResult,
} from '../utils/locationUtils';

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

type SavedAddressItem = {
  id: string;
  name: string;
  address: string;
  distance: string;
  icon: keyof typeof Ionicons.glyphMap;
  details: AddressDetails;
  lat?: number;
  lng?: number;
};

const DEFAULT_SAVED_ADDRESSES: SavedAddressItem[] = [];

export const LocationPickerModal = ({ visible, onClose }: Props) => {
  const { colors } = useTheme();
  const {
    location,
    savedAddresses,
    isLoading,
    isTracking,
    error,
    refreshFromGps,
    startTracking,
    saveAddress,
    deleteAddress,
    selectSavedAddress,
  } = useDeliveryLocation();

  const [form, setForm] = useState<AddressDetails>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddNewView, setShowAddNewView] = useState(false);
  const [showMapConfirmModal, setShowMapConfirmModal] = useState(false);

  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(location?.details ?? emptyForm());
      setEditingId(null);
      setEditingLabel('');
      setFormError(null);
      setShowAddNewView(false);
      setShowMapConfirmModal(false);
      setSearchQuery('');
      setSearchResults([]);
      startTracking();
    }
  }, [visible]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

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
  }, [searchQuery]);

  const update = (key: keyof AddressDetails, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleUseGps = async () => {
    setFormError(null);
    setShowMapConfirmModal(true); // Open modal INSTANTLY (0ms latency!)
    refreshFromGps().catch(() => {}); // Fetch GPS coordinates asynchronously
  };

  const handleSelectAddressItem = async (item: { details: AddressDetails; latitude?: number; longitude?: number; name?: string }) => {
    await selectSavedAddress({
      id: Date.now().toString(),
      name: item.name || item.details.house || item.details.area,
      details: item.details,
      latitude: item.latitude,
      longitude: item.longitude,
    });
    onClose();
  };

  const handleEditAddress = (savedItem: any) => {
    setEditingId(savedItem.id);
    setEditingLabel(savedItem.name || '');
    setForm(savedItem.details);
    setShowAddNewView(true);
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteAddress(id);
  };

  const handleSaveFormAddress = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const labelToUse = editingLabel.trim() || form.house || form.area || 'Home';
      const saved = await saveAddress(form, editingId || undefined, labelToUse);
      if (saved) {
        setShowAddNewView(false);
        setEditingId(null);
        setEditingLabel('');
        onClose();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save delivery address.');
    } finally {
      setSaving(false);
    }
  };

  const displayAddresses = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      address: string;
      distance: string;
      details: AddressDetails;
      latitude?: number;
      longitude?: number;
      isSavedUserItem?: boolean;
    }> = [];

    // 1. All saved user addresses from context
    savedAddresses.forEach(sa => {
      list.push({
        id: sa.id,
        name: sa.name || sa.details.house || 'Saved Address',
        address: `${sa.details.house ? sa.details.house + ', ' : ''}${sa.details.street ? sa.details.street + ', ' : ''}${sa.details.area}, ${sa.details.city}`,
        distance: 'Saved',
        details: sa.details,
        latitude: sa.latitude,
        longitude: sa.longitude,
        isSavedUserItem: true,
      });
    });

    // 2. Current GPS active location if available & not already listed
    if (location?.details && !list.some(l => l.details.house === location.details.house && l.details.area === location.details.area)) {
      list.push({
        id: 'current-gps',
        name: location.shortLabel || 'Current GPS Address',
        address: location.fullAddress,
        distance: 'Current',
        details: location.details,
        latitude: location.latitude,
        longitude: location.longitude,
        isSavedUserItem: false,
      });
    }

    if (!searchQuery.trim()) return list;

    return list.filter(
      item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [savedAddresses, location, searchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={10}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Select Your Location</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* SEARCH BAR */}
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              placeholder="Search an area, locality or landmark"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
            {isSearching ? (
              <ActivityIndicator size="small" color="#FF6B35" />
            ) : (
              <Ionicons name="search" size={20} color={colors.textSecondary} />
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
            {searchResults.length > 0 && !showAddNewView && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SEARCH RESULTS ({searchResults.length})</Text>
                <View style={[styles.savedCardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {searchResults.map((res, index) => (
                    <View key={res.id}>
                      {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                      <TouchableOpacity
                        style={styles.addressRow}
                        onPress={() => handleSelectAddressItem({
                          name: res.title,
                          details: {
                            ...res.details,
                            receiverName: location?.details?.receiverName || '',
                            phone: location?.details?.phone || '',
                          },
                          latitude: res.latitude,
                          longitude: res.longitude,
                        })}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.addressIconBox, { backgroundColor: colors.surface }]}>
                          <Ionicons name="location" size={20} color="#FF6B35" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.addressName, { color: colors.textPrimary }]} numberOfLines={1}>{res.title}</Text>
                          <Text style={[styles.addressFullText, { color: colors.textSecondary }]} numberOfLines={2}>{res.subtitle || res.details.fullAddress}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {showAddNewView ? (
              /* ADD NEW ADDRESS FORM VIEW */
              <View style={styles.formContainer}>
                <View style={styles.formHeaderRow}>
                  <Text style={styles.formTitle}>{editingId ? 'Edit Saved Address' : 'Enter Address Details'}</Text>
                  <TouchableOpacity onPress={() => { setShowAddNewView(false); setEditingId(null); }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {/* GPS AUTOFILL BUTTON INSIDE FORM */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFF0ED',
                    borderWidth: 1,
                    borderColor: '#FFDCD2',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 16,
                    gap: 8,
                  }}
                  onPress={handleUseGps}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={18} color="#FF6B35" />
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#FF6B35', flex: 1 }}>
                    Use Current Location (Pin on Map)
                  </Text>
                  {isLoading && <ActivityIndicator size="small" color="#FF6B35" />}
                </TouchableOpacity>

                {/* SWIGGY-STYLE ADDRESS TAG CATEGORY SELECTOR */}
                <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#374151', marginBottom: 8 }}>
                  SAVE ADDRESS AS
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Home', icon: 'home-outline', color: '#FF5722' },
                    { label: 'Work', icon: 'briefcase-outline', color: '#3B82F6' },
                    { label: 'Friends', icon: 'people-outline', color: '#8B5CF6' },
                    { label: 'Other', icon: 'location-outline', color: '#10B981' },
                  ].map(tag => {
                    const active = (editingLabel || 'Home').toLowerCase() === tag.label.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={tag.label}
                        onPress={() => setEditingLabel(tag.label)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: active ? tag.color : '#F3F4F6',
                          borderWidth: 1,
                          borderColor: active ? tag.color : '#E5E7EB',
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={tag.icon as any} size={15} color={active ? '#FFFFFF' : '#6B7280'} />
                        <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: active ? '#FFFFFF' : '#374151' }}>
                          {tag.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

                <Field label="Flat / House / Floor / Building *" value={form.house} onChangeText={v => update('house', v)} placeholder="e.g. Flat 402, 4th Floor, Royal residency" />
                <Field label="Street / Road / Area *" value={form.street} onChangeText={v => update('street', v)} placeholder="e.g. Main Market Road, Sector 62" />
                <Field label="Landmark (Optional)" value={form.landmark} onChangeText={v => update('landmark', v)} placeholder="e.g. Near City Metro Station / Opp. Green Park" />
                <Field label="Locality / Sector *" value={form.area} onChangeText={v => update('area', v)} placeholder="e.g. Civil Lines / Sector B" />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="City *" value={form.city} onChangeText={v => update('city', v)} placeholder="e.g. New Delhi" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Pincode *" value={form.pincode} onChangeText={v => update('pincode', v)} placeholder="6-digit pincode" keyboardType="number-pad" />
                  </View>
                </View>
                <Field label="Receiver Name *" value={form.receiverName} onChangeText={v => update('receiverName', v)} placeholder="e.g. Rahul Sharma" />
                <Field label="Phone *" value={form.phone} onChangeText={v => update('phone', v)} placeholder="10-digit phone" keyboardType="phone-pad" />

                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveFormAddress} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>{editingId ? 'Update Address' : 'Save Address'}</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* 2 TOP QUICK ACTION CARDS */}
                <View style={styles.cardsRow}>
                  {/* Current Location */}
                  <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handleUseGps}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: '#FFF0ED' }]}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FF6B35" />
                      ) : (
                        <Ionicons name="navigate-outline" size={20} color="#FF6B35" />
                      )}
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                      {isLoading ? 'Locating...' : 'Use Current Location'}
                    </Text>
                  </TouchableOpacity>

                  {/* Add New Address */}
                  <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => { setEditingId(null); setForm(emptyForm()); setShowAddNewView(true); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: '#FFF0ED' }]}>
                      <Ionicons name="add-circle-outline" size={22} color="#FF6B35" />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Add New Address</Text>
                  </TouchableOpacity>
                </View>

                {/* SAVED ADDRESSES SECTION */}
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                  SAVED ADDRESSES ({displayAddresses.length})
                </Text>

                <View style={[styles.savedCardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {displayAddresses.map((item, index) => {
                    const isSelected = location?.shortLabel && (location.shortLabel.includes(item.name) || (location.details && location.details.house === item.details.house));
                    return (
                      <View key={item.id}>
                        {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                        <View style={styles.addressRow}>
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                            onPress={() => handleSelectAddressItem(item)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.addressIconBox, { backgroundColor: '#FFF0ED' }]}>
                              <Ionicons name="location" size={22} color="#FF6B35" />
                              <Text style={[styles.distBadge, { color: '#FF6B35' }]}>{item.distance}</Text>
                            </View>

                            <View style={{ flex: 1, marginLeft: 14, marginRight: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.addressName, { color: colors.textPrimary }]} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                {isSelected && (
                                  <View style={styles.selectedBadge}>
                                    <Text style={styles.selectedBadgeText}>ACTIVE</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.addressFullText, { color: colors.textSecondary }]} numberOfLines={2}>
                                {item.address}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* EDIT & DELETE BUTTONS */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <TouchableOpacity onPress={() => handleEditAddress(item)} style={{ padding: 6 }} hitSlop={8}>
                              <Ionicons name="create-outline" size={20} color="#3B82F6" />
                            </TouchableOpacity>
                            {item.isSavedUserItem && (
                              <TouchableOpacity onPress={() => handleDeleteAddress(item.id)} style={{ padding: 6 }} hitSlop={8}>
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          {/* MAP CONFIRMATION OVERLAY MODAL */}
          {showMapConfirmModal && (
            <Modal transparent visible animationType="fade">
              <View style={styles.mapModalOverlay}>
                {/* Vector Map Simulation Graphic */}
                <View style={styles.mapBg}>
                  {/* Decorative Map Grid & Roads Background */}
                  <View style={StyleSheet.absoluteFill}>
                    <View style={{ flex: 1, backgroundColor: '#E4EDE4' }}>
                      {/* Road lines simulation */}
                      <View style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: 18, backgroundColor: '#FFFFFF', transform: [{ rotate: '-8deg' }] }} />
                      <View style={{ position: 'absolute', top: '55%', left: 0, right: 0, height: 28, backgroundColor: '#FDE68A', transform: [{ rotate: '5deg' }] }} />
                      <View style={{ position: 'absolute', top: 0, bottom: 0, left: '35%', width: 22, backgroundColor: '#FFFFFF', transform: [{ rotate: '15deg' }] }} />
                      <View style={{ position: 'absolute', top: 0, bottom: 0, left: '68%', width: 14, backgroundColor: '#FFFFFF', transform: [{ rotate: '-12deg' }] }} />
                      {/* Park / Green block */}
                      <View style={{ position: 'absolute', top: '15%', left: '45%', width: 120, height: 90, borderRadius: 16, backgroundColor: '#CBE5C9' }} />
                      {/* River / Blue block */}
                      <View style={{ position: 'absolute', bottom: '20%', right: '-10%', width: 160, height: 160, borderRadius: 80, backgroundColor: '#BFDBFE', opacity: 0.7 }} />
                      {/* Building / Gray blocks */}
                      <View style={{ position: 'absolute', top: '35%', left: '10%', width: 60, height: 40, borderRadius: 6, backgroundColor: '#CBD5E1' }} />
                      <View style={{ position: 'absolute', top: '40%', right: '15%', width: 70, height: 50, borderRadius: 6, backgroundColor: '#CBD5E1' }} />
                    </View>
                  </View>

                  {/* Top Bar with back button and search */}
                  <View style={styles.mapTopHeader}>
                    <TouchableOpacity style={styles.mapBackCircle} onPress={() => setShowMapConfirmModal(false)}>
                      <Ionicons name="arrow-back" size={20} color="#171A1F" />
                    </TouchableOpacity>
                    <View style={styles.mapSearchBar}>
                      <TextInput
                        placeholder="Search an area or landmark"
                        placeholderTextColor="#77736B"
                        value={searchQuery}
                        onChangeText={text => {
                          setSearchQuery(text);
                          if (text.length > 2) {
                            update('area', text);
                          }
                        }}
                        style={{ flex: 1, fontSize: 14, color: '#171A1F' }}
                      />
                      <Ionicons name="search" size={18} color="#77736B" />
                    </View>
                  </View>

                  {/* Pin Graphic with Radar Pulse */}
                  <View style={styles.pinCenterBox}>
                    <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255, 87, 34, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 87, 34, 0.25)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="location" size={44} color="#FF5722" />
                      </View>
                    </View>
                    <View style={styles.pinShadow} />
                  </View>

                  {/* Floating Current Location Pill */}
                  <TouchableOpacity
                    style={styles.currentLocPill}
                    onPress={async () => {
                      await refreshFromGps();
                    }}
                  >
                    <Ionicons name="navigate-circle" size={18} color="#FF5722" />
                    <Text style={styles.currentLocPillText}>
                      {isTracking || isLoading ? 'Locating...' : 'Current location'}
                    </Text>
                  </TouchableOpacity>

                  {/* Bottom Sheet Card */}
                  <View style={styles.mapBottomCard}>
                    <Text style={styles.mapSubtitle}>Place the pin at exact delivery location</Text>
                    <View style={styles.mapLocTitleRow}>
                      <Ionicons name="location-sharp" size={24} color="#FF5722" style={{ marginRight: 6 }} />
                      <Text style={styles.mapLocTitle} numberOfLines={1}>
                        {searchQuery.trim() ? searchQuery : location?.shortLabel || form.house || form.area || 'Selected Map Location'}
                      </Text>
                    </View>
                    <Text style={styles.mapLocAddress} numberOfLines={2}>
                      {location?.fullAddress || `${form.house ? form.house + ', ' : ''}${form.street ? form.street + ', ' : ''}${form.area ? form.area + ', ' : ''}${form.city || ''}`}
                    </Text>

                    <TouchableOpacity
                      style={styles.confirmProceedBtn}
                      onPress={() => {
                        if (location?.details) {
                          setForm(prev => ({
                            ...location.details,
                            house: prev.house || (location.details.house ?? ''),
                            phone: prev.phone || (location.details.phone ?? ''),
                            receiverName: prev.receiverName || (location.details.receiverName ?? ''),
                          }));
                        }
                        if (searchQuery.trim()) {
                          update('area', searchQuery);
                        }
                        setShowMapConfirmModal(false);
                        if (!showAddNewView) {
                          onClose();
                        }
                      }}
                    >
                      <Text style={styles.confirmProceedText}>Confirm & proceed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const Field = ({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput placeholderTextColor="#9CA3AF" style={styles.input} {...props} />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#F7F7FA',
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#171A1F',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#171A1F',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 96,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#333333',
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#77736B',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  savedCardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  addressIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distBadge: {
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    color: '#77736B',
    marginTop: 1,
  },
  addressName: {
    fontSize: 15,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#171A1F',
    flexShrink: 1,
  },
  selectedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#059669',
  },
  addressFullText: {
    fontSize: 12,
    color: '#77736B',
    marginTop: 4,
    lineHeight: 16,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#171A1F',
  },
  cancelText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FF5722',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginBottom: 10,
    fontFamily: 'Poppins_700Bold',
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    backgroundColor: '#FF5722',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_800ExtraBold',
  },

  // Map Modal Styles
  mapModalOverlay: {
    flex: 1,
    backgroundColor: '#EAEAEA',
  },
  mapBg: {
    flex: 1,
    backgroundColor: '#EBF2F7',
    justifyContent: 'space-between',
  },
  mapTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  mapBackCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  mapSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapSearchText: {
    flex: 1,
    fontSize: 14,
    color: '#77736B',
  },
  pinCenterBox: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -48 }],
    alignItems: 'center',
  },
  pinShadow: {
    width: 16,
    height: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: -4,
  },
  currentLocPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    elevation: 3,
  },
  currentLocPillText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#171A1F',
  },
  mapBottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    elevation: 8,
  },
  mapSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#77736B',
    marginBottom: 12,
  },
  mapLocTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mapLocTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#171A1F',
    flex: 1,
  },
  mapLocAddress: {
    fontSize: 13,
    color: '#77736B',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmProceedBtn: {
    backgroundColor: '#FF5722',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmProceedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
  },
});

