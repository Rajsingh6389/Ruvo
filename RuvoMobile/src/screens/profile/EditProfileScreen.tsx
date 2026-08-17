import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../services/userService';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { token, user, refreshUser } = useAuth();
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

  return <SafeAreaView style={styles.root}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
      <Text style={styles.title}>Edit profile</Text><View style={{ width: 24 }} />
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.note}>Your mobile number is used for secure OTP login and cannot be changed here.</Text>
      <Field label="Full name" value={name} onChangeText={setName} />
      <Field label="Mobile number" value={user?.mobileNumber ?? ''} editable={false} />
      <Field label="Address" value={address} onChangeText={setAddress} placeholder="House, street or locality" />
      <Field label="City" value={city} onChangeText={setCity} />
      <Field label="State" value={state} onChangeText={setState} />
      <Field label="About you" value={bio} onChangeText={setBio} multiline placeholder="Optional" />
      <TouchableOpacity style={styles.save} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>SAVE CHANGES</Text>}
      </TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}

const Field = ({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={[styles.input, props.editable === false && styles.disabled]} placeholderTextColor="#9CA3AF" /></View>;
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F7F8FA' }, header: { height: 58, backgroundColor: '#fff', paddingHorizontal: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }, title: { fontSize: 18, fontWeight: '700', color: '#1F2937' }, content: { padding: 18, paddingBottom: 36 }, note: { backgroundColor: '#E8F5E9', color: '#27632A', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 19, marginBottom: 18 }, field: { marginBottom: 15 }, label: { color: '#374151', fontSize: 13, fontWeight: '700', marginBottom: 7 }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, color: '#111827' }, disabled: { backgroundColor: '#F3F4F6', color: '#6B7280' }, save: { backgroundColor: '#2E7D32', alignItems: 'center', borderRadius: 11, paddingVertical: 15, marginTop: 8 }, saveText: { color: '#fff', fontWeight: '800', fontSize: 14 } });
