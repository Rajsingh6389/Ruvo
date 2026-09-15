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

const DEFAULT_SAVED_ADDRESSES: SavedAddressItem[] = [
  {
    id: '1',
    name: 'Smridhi Grand Avenue',
    address: 'G-2003, Smridhi Grand Avenue, Greater Noida West Link Road, Amrapali Dream Valley',
    distance: '207 m',
    icon: 'home-outline',
    details: {
      house: 'G-2003',
      street: 'Smridhi Grand Avenue',
      landmark: 'Greater Noida West Link Road',
      area: 'Amrapali Dream Valley',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      pincode: '201306',
      receiverName: 'User',
      phone: '9876543210',
    },
    lat: 28.5833,
    lng: 77.4475,
  },
  {
    id: '2',
    name: 'Home',
    address: 'C1203 Proview Laboni, Crossings Republik Road, Chipiyana Buzurg',
    distance: '3.6 km',
    icon: 'home-outline',
    details: {
      house: 'C1203',
      street: 'Proview Laboni',
      landmark: 'Crossings Republik Road',
      area: 'Chipiyana Buzurg',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      pincode: '201016',
      receiverName: 'User',
      phone: '9876543210',
    },
    lat: 28.628,
    lng: 77.437,
  },
  {
    id: '3',
    name: 'aligarh railway station platform',
    address: 'Plateform Number 3, Railway Station Road, Civil Lines, Aligarh',
    distance: '99.2 km',
    icon: 'navigate-outline',
    details: {
      house: 'Platform 3',
      street: 'Railway Station Road',
      landmark: 'Civil Lines',
      area: 'Railway Colony',
      city: 'Aligarh',
      state: 'Uttar Pradesh',
      pincode: '202001',
      receiverName: 'User',
      phone: '9876543210',
    },
    lat: 27.8974,
    lng: 78.088,
  },
];

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

  useEffect(() => {
    if (visible) {
      setForm(location?.details ?? emptyForm());
      setEditingId(null);
      setEditingLabel('');
      setFormError(null);
      setShowAddNewView(false);
      setShowMapConfirmModal(false);
      startTracking();
    }
  }, [visible]);

  const update = (key: keyof AddressDetails, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleUseGps = async () => {
    setFormError(null);
    await refreshFromGps();
    setShowMapConfirmModal(true);
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
              placeholder="Search an area or address"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
            <Ionicons name="search" size={20} color={colors.textSecondary} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
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
                  onPress={async () => {
                    await refreshFromGps();
                    setShowMapConfirmModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={18} color="#FF6B35" />
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#FF6B35', flex: 1 }}>
                    Use Current Location (Pin on Map)
                  </Text>
                  {isLoading && <ActivityIndicator size="small" color="#FF6B35" />}
                </TouchableOpacity>

                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

                <Field label="Address Label (e.g. Home, Office, Flat 402)" value={editingLabel} onChangeText={setEditingLabel} placeholder="e.g. Home" />
                <Field label="House / Flat / Floor *" value={form.house} onChangeText={v => update('house', v)} placeholder="e.g. G-2003, 20th floor" />
                <Field label="Street / Building *" value={form.street} onChangeText={v => update('street', v)} placeholder="e.g. Smridhi Grand Avenue" />
                <Field label="Landmark" value={form.landmark} onChangeText={v => update('landmark', v)} placeholder="Near Link Road" />
                <Field label="Area / Locality *" value={form.area} onChangeText={v => update('area', v)} placeholder="Amrapali Dream Valley" />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="City *" value={form.city} onChangeText={v => update('city', v)} placeholder="Greater Noida" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Pincode *" value={form.pincode} onChangeText={v => update('pincode', v)} placeholder="201306" keyboardType="number-pad" />
                  </View>
                </View>
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
                  <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleUseGps} activeOpacity={0.7}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Use Current Location</Text>
                  </TouchableOpacity>

                  {/* Add New Address */}
                  <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { setEditingId(null); setForm(emptyForm()); setShowAddNewView(true); }} activeOpacity={0.7}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Add New Address</Text>
                  </TouchableOpacity>
                </View>

                {/* SAVED ADDRESSES SECTION */}
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SAVED ADDRESSES ({displayAddresses.length})</Text>

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
                            <View style={[styles.addressIconBox, { backgroundColor: colors.surface }]}>
                              <Ionicons name={item.isSavedUserItem ? "bookmark" : "location"} size={20} color={colors.primary} />
                              <Text style={[styles.distBadge, { color: colors.textSecondary }]}>{item.distance}</Text>
                            </View>

                            <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity onPress={() => handleEditAddress(item)} style={{ padding: 6 }}>
                              <Ionicons name="create-outline" size={20} color="#3B82F6" />
                            </TouchableOpacity>
                            {item.isSavedUserItem && (
                              <TouchableOpacity onPress={() => handleDeleteAddress(item.id)} style={{ padding: 6 }}>
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
                      {location?.fullAddress || `${form.house ? form.house + ', ' : ''}${form.street ? form.street + ', ' : ''}${form.area ? form.area + ', ' : ''}${form.city || 'Greater Noida'}`}
                    </Text>

                    <TouchableOpacity
                      style={styles.confirmProceedBtn}
                      onPress={() => {
                        if (searchQuery.trim()) {
                          update('area', searchQuery);
                        } else if (location?.details) {
                          setForm(location.details);
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

