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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { sw, sh, sf } from '../../utils/responsive';
import { submitHelpFeedback } from '../../services/helpService';

import { CATEGORIES, PRIORITIES } from '../../constants/helpConstants';

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

      const data = await submitHelpFeedback({
        userId,
        userType,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      }, token || '');

      if (data.success) {
        Alert.alert(
          'Thank You!',
          'Your feedback has been submitted successfully. We will review it and get back to you if needed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to submit feedback.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
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
            {CATEGORIES.map((cat, index) => {
              const isActive = category === cat.id;
              return (
                <Animated.View 
                  key={cat.id} 
                  entering={FadeInDown.delay(index * 100).duration(500).springify()}
                  style={{ width: '48%' }}
                >
                  <TouchableOpacity
                    style={[
                      styles.categoryCard,
                      { 
                        backgroundColor: isActive ? '#F5B700' : '#FFFFFF',
                        borderColor: isActive ? '#D99B00' : colors.border,
                        shadowColor: isActive ? '#D99B00' : '#1A1A1A',
                      },
                    ]}
                    onPress={() => setCategory(cat.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconWrapper, { backgroundColor: isActive ? '#FFF' : cat.color + '15' }]}>
                      <Ionicons name={cat.icon as any} size={22} color={isActive ? '#1A1A1A' : cat.color} />
                    </View>
                    <Text style={[styles.categoryLabel, { color: isActive ? '#1A1A1A' : colors.textPrimary }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
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
  headerTitle: { fontSize: sf(18), fontFamily: 'Poppins_700Bold' },
  content: { flex: 1 },
  contentContainer: { padding: sw(16), paddingBottom: sh(32) },
  section: { marginBottom: sh(24) },
  sectionTitle: { fontSize: sf(16), fontFamily: 'Poppins_600SemiBold', marginBottom: sh(12) },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sw(16),
    borderRadius: 24,
    borderWidth: 0.5,
    gap: sh(12),
    minHeight: 110,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontSize: sf(13), fontFamily: 'Poppins_800ExtraBold', textAlign: 'center' },
  input: {
    borderWidth: 0.5,
    borderRadius: 16,
    padding: sw(16),
    fontSize: sf(15),
    fontFamily: 'Poppins_500Medium',
  },
  textArea: {
    borderWidth: 0.5,
    borderRadius: 16,
    padding: sw(16),
    fontSize: sf(15),
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
    borderWidth: 0.5,
    alignItems: 'center',
  },
  priorityLabel: { fontSize: sf(13), fontFamily: 'Poppins_600SemiBold' },
  submitButton: {
    flexDirection: 'row',
    padding: sw(16),
    borderRadius: sw(12),
    alignItems: 'center',
    justifyContent: 'center',
    gap: sw(8),
    marginBottom: sh(20),
  },
  submitButtonText: { color: '#FFFFFF', fontSize: sf(16), fontFamily: 'Poppins_700Bold' },
  infoCard: {
    flexDirection: 'row',
    padding: sw(14),
    borderRadius: sw(12),
    gap: sw(10),
  },
  infoText: { fontSize: sf(13), lineHeight: sh(18), flex: 1 },
});
