import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { sw, sh, sf } from '../../utils/responsive';

export const RateOrderScreen = () => {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId, shopId, shopName } = route.params as any;

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkIfCanReview();
  }, []);

  const checkIfCanReview = async () => {
    const userId = (user as any)?.userId || (user as any)?.id;
    if (!userId || !orderId) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/reviews/can-review?userId=${userId}&orderId=${orderId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const data = await res.json();

      if (res.ok && !data.canReview) {
        Alert.alert('Already Reviewed', 'You have already reviewed this order.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Check review error:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: (user as any)?.userId || (user as any)?.id,
          shopId,
          orderId,
          rating,
          reviewText: reviewText.trim(),
          isAnonymous,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        Alert.alert('Thank You!', 'Your review has been submitted successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to submit review.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={sf(48)}
              color={star <= rating ? '#FFC107' : colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select a rating';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Rate Your Order</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Shop Info */}
        <View style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="storefront" size={sf(32)} color={colors.primary} />
          <Text style={[styles.shopName, { color: colors.textPrimary }]}>{shopName}</Text>
        </View>

        {/* Rating Stars */}
        <View style={styles.ratingSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            How was your experience?
          </Text>
          {renderStars()}
          <Text style={[styles.ratingText, { color: colors.primary }]}>
            {getRatingText()}
          </Text>
        </View>

        {/* Review Text */}
        <View style={styles.reviewSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Write a review (optional)
          </Text>
          <TextInput
            style={[styles.reviewInput, { 
              backgroundColor: colors.surface, 
              color: colors.textPrimary,
              borderColor: colors.border 
            }]}
            placeholder="Share your experience with this shop..."
            placeholderTextColor={colors.textSecondary}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {reviewText.length}/1000
          </Text>
        </View>

        {/* Anonymous Toggle */}
        <TouchableOpacity
          style={[styles.anonymousToggle, { backgroundColor: colors.surface }]}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <View style={styles.toggleLeft}>
            <Ionicons
              name={isAnonymous ? 'eye-off-outline' : 'eye-outline'}
              size={sf(20)}
              color={colors.textPrimary}
            />
            <Text style={[styles.toggleText, { color: colors.textPrimary }]}>
              Post anonymously
            </Text>
          </View>
          <Ionicons
            name={isAnonymous ? 'checkmark-circle' : 'ellipse-outline'}
            size={sf(24)}
            color={isAnonymous ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { 
            backgroundColor: rating > 0 ? colors.primary : colors.border,
            opacity: submitting ? 0.7 : 1 
          }]}
          onPress={handleSubmitReview}
          disabled={submitting || rating === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
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
  contentContainer: { padding: sw(16) },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sw(16),
    borderRadius: sw(12),
    borderWidth: 1,
    marginBottom: sh(24),
    gap: sw(12),
  },
  shopName: { fontSize: sf(18), fontWeight: '700' },
  ratingSection: { alignItems: 'center', marginBottom: sh(32) },
  sectionTitle: { fontSize: sf(16), fontWeight: '600', marginBottom: sh(16) },
  starsContainer: { flexDirection: 'row', gap: sw(8), marginBottom: sh(12) },
  starButton: { padding: sw(4) },
  ratingText: { fontSize: sf(16), fontWeight: '600' },
  reviewSection: { marginBottom: sh(24) },
  reviewInput: {
    borderWidth: 1,
    borderRadius: sw(12),
    padding: sw(12),
    fontSize: sf(14),
    minHeight: sh(120),
    marginBottom: sh(8),
  },
  charCount: { fontSize: sf(12), textAlign: 'right' },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: sw(16),
    borderRadius: sw(12),
    marginBottom: sh(24),
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: sw(12) },
  toggleText: { fontSize: sf(14), fontWeight: '500' },
  submitButton: {
    padding: sw(16),
    borderRadius: sw(12),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: sh(50),
  },
  submitButtonText: { color: '#FFFFFF', fontSize: sf(16), fontWeight: '700' },
});
