import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { sw, sh, sf } from '../../utils/responsive';

const CATEGORIES = [
  { id: 'BUG_REPORT', label: 'Bug Report', icon: 'bug-outline', color: '#E53935' },
  { id: 'FEATURE_REQUEST', label: 'Feature Request', icon: 'lightbulb-outline', color: '#FFC107' },
  { id: 'IMPROVEMENT', label: 'Improvement', icon: 'trending-up-outline', color: '#4CAF50' },
  { id: 'ORDER_ISSUE', label: 'Order Issue', icon: 'receipt-outline', color: '#2196F3' },
  { id: 'PAYMENT_ISSUE', label: 'Payment Issue', icon: 'card-outline', color: '#9C27B0' },
  { id: 'GENERAL', label: 'General', icon: 'chatbubble-outline', color: '#607D8B' },
];

const PRIORITIES = [
  { id: 'LOW', label: 'Low', color: '#4CAF50' },
  { id: 'MEDIUM', label: 'Medium', color: '#FFC107' },
  { id: 'HIGH', label: 'High', color: '#FF9800' },
  { id: 'URGENT', label: 'Urgent', color: '#E53935' },
];

export const HelpScreen = () => {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation();

  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category) {
      Alert.alert('Category Required', 'Please select a category for your feedback.');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Subject Required', 'Please enter a subject for your feedback.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Description Required', 'Please describe your issue or feedback.');
      return;
    }

    setSubmitting(true);

    try {
      const userId = (user as any)?.userId || (user as any)?.id;
      const userType = (user as any)?.userType || 'USER';

      const res = await fetch(`${API_BASE_URL}/api/help`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          userType,
          category,
          subject: subject.trim(),
          description: description.trim(),
          priority,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        Alert.alert(
          'Thank You!',
          'Your feedback has been submitted successfully. We will review it and get back to you if needed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to submit feedback.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Help & Feedback</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Category <Text style={{ color: '#E53935' }}>*</Text>
          </Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: category === cat.id ? cat.color : colors.border,
                    borderWidth: category === cat.id ? 2 : 1,
                  },
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons name={cat.icon as any} size={sf(24)} color={cat.color} />
                <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Subject <Text style={{ color: '#E53935' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surface, 
              color: colors.textPrimary,
              borderColor: colors.border 
            }]}
            placeholder="Brief summary of your feedback"
            placeholderTextColor={colors.textSecondary}
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Description <Text style={{ color: '#E53935' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, { 
              backgroundColor: colors.surface, 
              color: colors.textPrimary,
              borderColor: colors.border 
            }]}
            placeholder="Please provide detailed information..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {description.length}/2000
          </Text>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.priorityButton,
                  { 
                    backgroundColor: priority === p.id ? p.color : colors.surface,
                    borderColor: p.color,
                  },
                ]}
                onPress={() => setPriority(p.id)}
              >
                <Text style={[
                  styles.priorityLabel,
                  { color: priority === p.id ? '#FFFFFF' : p.color }
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { 
            backgroundColor: colors.primary,
            opacity: submitting ? 0.7 : 1 
          }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={sf(18)} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle-outline" size={sf(20)} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            We typically respond to feedback within 24-48 hours. For urgent issues, please select "High" or "Urgent" priority.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(16),
    paddingVertical: sh(12),
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: sf(18), fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: sw(16), paddingBottom: sh(32) },
  section: { marginBottom: sh(24) },
  sectionTitle: { fontSize: sf(16), fontWeight: '600', marginBottom: sh(12) },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sw(10),
  },
  categoryCard: {
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sw(16),
    borderRadius: sw(12),
    gap: sh(8),
  },
  categoryLabel: { fontSize: sf(13), fontWeight: '600', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: sw(12),
    padding: sw(14),
    fontSize: sf(14),
  },
  textArea: {
    borderWidth: 1,
    borderRadius: sw(12),
    padding: sw(14),
    fontSize: sf(14),
    minHeight: sh(150),
    marginBottom: sh(8),
  },
  charCount: { fontSize: sf(12), textAlign: 'right' },
  priorityRow: {
    flexDirection: 'row',
    gap: sw(8),
  },
  priorityButton: {
    flex: 1,
    paddingVertical: sh(10),
    borderRadius: sw(8),
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityLabel: { fontSize: sf(13), fontWeight: '600' },
  submitButton: {
    flexDirection: 'row',
    padding: sw(16),
    borderRadius: sw(12),
    alignItems: 'center',
    justifyContent: 'center',
    gap: sw(8),
    marginBottom: sh(20),
  },
  submitButtonText: { color: '#FFFFFF', fontSize: sf(16), fontWeight: '700' },
  infoCard: {
    flexDirection: 'row',
    padding: sw(14),
    borderRadius: sw(12),
    gap: sw(10),
  },
  infoText: { fontSize: sf(13), lineHeight: sh(18), flex: 1 },
});
