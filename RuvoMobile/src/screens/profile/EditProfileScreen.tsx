import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../services/userService';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { token, user, refreshUser } = useAuth();
  const { colors, typography, radius, shadows, spacing } = useTheme();

  const [name, setName] = useState(user?.name ?? '');
  const [address, setAddress] = useState((user as any)?.address ?? '');
  const [city, setCity] = useState((user as any)?.city ?? '');
  const [state, setState] = useState((user as any)?.state ?? '');
  const [bio, setBio] = useState((user as any)?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!token || !name.trim()) { Alert.alert('Name required', 'Please enter your name.'); return; }
    setSaving(true);
    try {
      await updateUserProfile(token, { name: name.trim(), address: address.trim(), city: city.trim(), state: state.trim(), bio: bio.trim() });
      await refreshUser();
      Alert.alert('Profile updated', 'Your profile details have been saved.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Could not save profile', error?.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ─ HEADER ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.headingM, { color: colors.textPrimary }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.gutter }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─ INFO NOTE ───────────────────────────────────────────────────── */}
        <View style={[styles.noteBox, { backgroundColor: colors.successSoft, borderRadius: radius.md, padding: 12, marginBottom: spacing.section }]}>
          <Ionicons name="information-circle" size={18} color={colors.accent} />
          <Text style={[typography.body, { color: colors.accent, marginLeft: 8, flex: 1, lineHeight: 19 }]}>
            Your mobile number is used for secure OTP login and cannot be changed here.
          </Text>
        </View>

        {/* ─ FULL NAME ───────────────────────────────────────────────────── */}
        <Field label="Full name" value={name} onChangeText={setName} />
        <Field label="Mobile number" value={user?.mobileNumber ?? ''} editable={false} />

        {/* ─ ADDRESS ─────────────────────────────────────────────────────── */}
        <View style={styles.addressRow}>
          <View style={{ flex: 1 }}>
            <Field label="Address" value={address} onChangeText={setAddress} placeholder="House, street or locality" />
          </View>
        </View>

        {/* ─ CITY & STATE ────────────────────────────────────────────────── */}
        <View style={styles.addressRow}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Field label="City" value={city} onChangeText={setCity} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="State" value={state} onChangeText={setState} />
          </View>
        </View>

        {/* ─ ABOUT YOU ───────────────────────────────────────────────────── */}
        <Field
          label="About you"
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="Tell us about yourself (optional)"
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />

        {/* ─ SAVE BUTTON ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: radius.button }, shadows.brand]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={[typography.button, { color: colors.onPrimary }]}>Save Changes</Text>
              <Ionicons name="save-outline" size={18} color={colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FieldProps {
  label: string;
  multiline?: boolean;
  style?: any;
}

const Field: React.FC<FieldProps & React.ComponentProps<typeof TextInput>> = ({
  label,
  multiline,
  style,
  ...props
}) => {
  const { colors, typography, radius } = useTheme();

  return (
    <View style={[styles.field, { marginBottom: multiline ? 16 : 12 }]}>
      <Text style={[typography.label, { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }]}>
        {label}
      </Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.input,
            color: colors.textPrimary,
          },
          props.editable === false && { backgroundColor: colors.surface, color: colors.textSecondary },
          style,
        ]}
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    borderBottomWidth: 1,
  },
  content: {
    paddingBottom: 120,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  field: {},
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 48,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 20,
  },
});
