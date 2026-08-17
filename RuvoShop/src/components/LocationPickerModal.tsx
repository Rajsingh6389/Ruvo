import React, { useEffect, useState } from 'react';
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

export const LocationPickerModal = ({ visible, onClose }: Props) => {
  const { colors } = useTheme();
  const {
    location,
    isLoading,
    isTracking,
    error,
    refreshFromGps,
    startTracking,
    saveAddress,
  } = useDeliveryLocation();
  const [form, setForm] = useState<AddressDetails>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setForm(location?.details ?? emptyForm());
      setFormError(null);
      startTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]); // Re-initialize ONLY when modal opens, to avoid wiping typed fields on GPS refresh

  const update = (key: keyof AddressDetails, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleUseGps = async () => {
    await refreshFromGps();
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const saved = await saveAddress(form);
      if (saved) {
        onClose();
      } else {
        setFormError('Please fill house, area, city, pincode and phone.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Complete delivery address
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <View
              style={[
                styles.trackCard,
                { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
              ]}
            >
              <Ionicons name="navigate-circle" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.trackTitle, { color: colors.textPrimary }]}>
                  {isTracking ? 'Live location on' : 'Location paused'}
                </Text>
                <Text style={[styles.trackText, { color: colors.textSecondary }]}>
                  {location
                    ? `${location.shortLabel} · ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : 'Tap below to detect your current place'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.gpsBtn, { borderColor: colors.primary }]}
              onPress={handleUseGps}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="locate" size={18} color={colors.primary} />
              )}
              <Text style={[styles.gpsBtnText, { color: colors.primary }]}>
                Fill from current location
              </Text>
            </TouchableOpacity>

            {(formError || error) ? (
              <Text style={styles.errorText}>{formError || error}</Text>
            ) : null}

            <Field
              label="House / Flat / Floor *"
              value={form.house}
              onChangeText={value => update('house', value)}
              placeholder="e.g. 12B, 2nd floor"
            />
            <Field
              label="Street / Building"
              value={form.street}
              onChangeText={value => update('street', value)}
              placeholder="Street name"
            />
            <Field
              label="Landmark"
              value={form.landmark}
              onChangeText={value => update('landmark', value)}
              placeholder="Near temple, school, shop"
            />
            <Field
              label="Area / Locality *"
              value={form.area}
              onChangeText={value => update('area', value)}
              placeholder="Colony or locality"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="City *"
                  value={form.city}
                  onChangeText={value => update('city', value)}
                  placeholder="City"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="State"
                  value={form.state}
                  onChangeText={value => update('state', value)}
                  placeholder="State"
                />
              </View>
            </View>
            <Field
              label="Pincode *"
              value={form.pincode}
              onChangeText={value => update('pincode', value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="6-digit pincode"
              keyboardType="number-pad"
            />
            <Field
              label="Receiver name"
              value={form.receiverName}
              onChangeText={value => update('receiverName', value)}
              placeholder="Who will receive the order"
            />
            <Field
              label="Phone *"
              value={form.phone}
              onChangeText={value => update('phone', value.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              disabled={saving}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save complete address</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const Field = ({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      placeholderTextColor="#9CA3AF"
      style={styles.input}
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    paddingBottom: 24,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  trackText: {
    fontSize: 12,
    marginTop: 2,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  gpsBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
