import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width: SW } = Dimensions.get('window');

interface OnboardingShopEmptyStateProps {
  category?: string;
  onExploreMore?: () => void;
  onResetCategory?: () => void;
}

// ── Ambient Background Animation ──
const AmbientBackground = ({ isDark }: { isDark: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 3200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -16, duration: 3800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 16, duration: 3800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = isDark ? 0.35 : 0.6;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Blob 1: Orange/Amber Top Right */}
      <Animated.View
        style={{
          position: 'absolute', top: -40, right: -40, width: 220, height: 220,
          borderRadius: 110, opacity: Animated.multiply(pulseAnim, opacity),
          transform: [{ translateY: floatAnim }]
        }}
      >
        <LinearGradient colors={['#FF7A00', '#F59E0B']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Blob 2: Cyan/Blue Bottom Left */}
      <Animated.View
        style={{
          position: 'absolute', bottom: -50, left: -50, width: 240, height: 240,
          borderRadius: 120, opacity: Animated.multiply(pulseAnim, opacity * 0.8),
          transform: [{ translateY: Animated.multiply(floatAnim, -1) }]
        }}
      >
        <LinearGradient colors={['#06B6D4', '#3B82F6']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Blob 3: Rose/Purple Center Right */}
      <Animated.View
        style={{
          position: 'absolute', top: '40%', right: -60, width: 180, height: 180,
          borderRadius: 90, opacity: Animated.multiply(pulseAnim, opacity * 0.6),
          transform: [{ translateY: Animated.multiply(floatAnim, 0.7) }]
        }}
      >
        <LinearGradient colors={['#EC4899', '#8B5CF6']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Soft overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(15,15,18,0.7)' : 'rgba(255,255,255,0.65)' }]} />
    </View>
  );
};

export const OnboardingShopEmptyState: React.FC<OnboardingShopEmptyStateProps> = ({
  category,
  onExploreMore,
  onResetCategory,
}) => {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  // Hero Medallion Scale Animation
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.25, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.2, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const pressIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const formattedCategory = category && category !== 'All' ? category : '';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0E1A' : '#F9FAFB' }]}>
      {/* Cool Ambient Background Animation */}
      <AmbientBackground isDark={isDark} />

      <View style={styles.content}>
        {/* Animated Hero Medallion */}
        <View style={styles.heroWrap}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              }
            ]}
          />
          <LinearGradient
            colors={['#FF7A00', '#FF4500']}
            style={styles.heroCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="storefront-outline" size={38} color="#FFFFFF" />
            <View style={styles.rocketBadge}>
              <Ionicons name="rocket" size={14} color="#FF7A00" />
            </View>
          </LinearGradient>
        </View>

        {/* Onboarding Pill Badge */}
        <View style={[styles.badgePill, { backgroundColor: isDark ? 'rgba(255,122,0,0.2)' : '#FFF7ED', borderColor: isDark ? 'rgba(255,122,0,0.4)' : '#FED7AA' }]}>
          <View style={styles.greenPulseDot} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            NOW ONBOARDING NEARBY
          </Text>
        </View>

        {/* Main Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {formattedCategory
            ? `We are onboarding ${formattedCategory} shops in your area!`
            : 'We are onboarding local shops in your area!'}
        </Text>

        {/* Subtitle Description */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Our merchant team is actively onboarding top-rated local{' '}
          <Text style={{ color: colors.primary, fontFamily: 'Poppins_700Bold' }}>
            {formattedCategory || 'retail'}
          </Text>{' '}
          stores near you. Explore other categories or check back soon!
        </Text>

        {/* Action Buttons */}
        <View style={styles.btnCol}>
          {/* Primary CTA: Explore More */}
          {onExploreMore && (
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                onPress={onExploreMore}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FF7A00', '#FF6B35']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Ionicons name="compass-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Explore More Categories</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Secondary CTA: Reset/Show All */}
          {onResetCategory && (
            <TouchableOpacity
              onPress={onResetCategory}
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                }
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="grid-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                Show All Categories
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },

  // Hero Circle Animation
  heroWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF7A00',
  },
  heroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  rocketBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // Badge
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  badgeText: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1,
  },

  // Title & Subtitle
  title: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },

  // Buttons
  btnCol: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 20,
    gap: 10,
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    gap: 8,
  },
  secondaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});
