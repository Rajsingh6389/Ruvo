import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';
import { DURATIONS } from '../../theme/motion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RuvoFirstOrderPromoBannerProps {
  compact?: boolean;
  onApplyCoupon?: (code: string) => void;
  onPressBanner?: () => void;
}

export const RuvoFirstOrderPromoBanner: React.FC<RuvoFirstOrderPromoBannerProps> = ({
  compact = false,
  onApplyCoupon,
  onPressBanner,
}) => {
  const { colors, radius, shadows } = useTheme();
  const { sf, sw, sh } = useResponsive();
  const [copied, setCopied] = useState(false);

  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance animation (slide up + fade in)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Floating 3D Mascot Loop (gentle bobbing up and down)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Subtle Badge Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, opacityAnim, pulseAnim, slideAnim]);

  const handleCopyCode = () => {
    setCopied(true);
    if (onApplyCoupon) {
      onApplyCoupon('WELCOME100');
    }
    setTimeout(() => {
      setCopied(false);
    }, 2500);
  };

  const mascotSource = require('../../assets/images/3d_mascot.png');

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            backgroundColor: '#0F291E',
            borderColor: '#10B981',
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
          shadows.md,
        ]}
      >
        <Animated.Image
          source={mascotSource}
          style={[
            styles.compactMascot,
            { transform: [{ translateY: floatAnim }] },
          ]}
          resizeMode="contain"
        />
        <View style={styles.compactTextCol}>
          <View style={styles.compactBadgeRow}>
            <Text style={styles.compactBadgeText}>SPECIAL PROMO</Text>
            <Text style={styles.compactSubBadge}>1st 10 Orders</Text>
          </View>
          <Text style={styles.compactTitle}>Flat ₹100 OFF (Min ₹299)</Text>
        </View>

        <TouchableOpacity
          style={[styles.copyBtnCompact, { backgroundColor: copied ? '#10B981' : '#059669' }]}
          onPress={handleCopyCode}
          activeOpacity={0.8}
        >
          <Text style={styles.copyBtnTextCompact}>
            {copied ? 'COPIED!' : 'WELCOME100'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.bannerCard,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
        shadows.lg,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPressBanner}
        style={styles.cardInner}
      >
        {/* Background Decorative Circles */}
        <View style={styles.bgGlowCircle1} />
        <View style={styles.bgGlowCircle2} />

        {/* Content Column */}
        <View style={styles.contentCol}>
          {/* Header Tag */}
          <Animated.View
            style={[
              styles.promoBadge,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons name="sparkles" size={12} color="#FFF" />
            <Text style={styles.promoBadgeText}>FIRST 10 ORDERS DISCOUNT</Text>
          </Animated.View>

          {/* Main Title */}
          <Text style={styles.mainHeading}>
            Get <Text style={styles.highlightText}>₹100 OFF</Text> on Every Order!
          </Text>

          <Text style={styles.subHeading}>
            Valid on min order value ₹299. Applied across all RuVo partners.
          </Text>

          {/* Coupon Code Action Row */}
          <View style={styles.couponRow}>
            <View style={styles.codeBox}>
              <Ionicons name="pricetag-outline" size={15} color="#10B981" />
              <Text style={styles.codeText}>WELCOME100</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.copyButton,
                { backgroundColor: copied ? '#059669' : '#10B981' },
              ]}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color="#FFF"
              />
              <Text style={styles.copyButtonText}>
                {copied ? 'Copied & Applied' : 'Copy Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3D Animated Cartoon Mascot Image */}
        <Animated.View
          style={[
            styles.mascotWrapper,
            { transform: [{ translateY: floatAnim }] },
          ]}
        >
          <Image
            source={mascotSource}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerCard: {
    marginHorizontal: 16,
    marginVertical: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#062319',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
    minHeight: 155,
  },
  bgGlowCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  bgGlowCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  contentCol: {
    flex: 1,
    paddingRight: 10,
    zIndex: 2,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 6,
  },
  promoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  highlightText: {
    color: '#FBBF24',
    fontWeight: '900',
  },
  subHeading: {
    color: '#A7F3D0',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  codeText: {
    color: '#34D399',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  mascotWrapper: {
    width: 105,
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },

  // Compact styles
  compactContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  compactMascot: {
    width: 44,
    height: 44,
  },
  compactTextCol: {
    flex: 1,
    marginLeft: 8,
  },
  compactBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactBadgeText: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '800',
  },
  compactSubBadge: {
    color: '#9CA3AF',
    fontSize: 9,
  },
  compactTitle: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
  copyBtnCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnTextCompact: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
  },
});
