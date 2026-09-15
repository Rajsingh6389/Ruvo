import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  AccessibilityInfo,
  StatusBar,
  Platform,
} from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

interface RuvoLaunchScreenProps {
  onFinish?: () => void;
  isReady?: boolean; // When true, allows the animation to transition out
  roleSubtitle?: string;
}

const { width, height } = Dimensions.get('window');

export const RuvoLaunchScreen: React.FC<RuvoLaunchScreenProps> = ({
  onFinish,
  isReady = true,
  roleSubtitle = 'LOCAL • CONNECTED • MOVING',
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);

  // Animation values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  
  // Phase 1: Dot
  const dotScale = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const dotTranslateX = useRef(new Animated.Value(0)).current;
  const dotTranslateY = useRef(new Animated.Value(0)).current;
  const dotHaloScale = useRef(new Animated.Value(0.5)).current;
  const dotHaloOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2 & 3: Flow Ribbon & Symbol
  const flowScaleX = useRef(new Animated.Value(0)).current;
  const flowOpacity = useRef(new Animated.Value(0)).current;
  const symbolScale = useRef(new Animated.Value(0.7)).current;
  const symbolOpacity = useRef(new Animated.Value(0)).current;
  const symbolRotate = useRef(new Animated.Value(-12)).current;

  // Phase 5 & 6: Wordmark & Tagline
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(16)).current;
  const wordmarkScale = useRef(new Animated.Value(0.92)).current;
  
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  // Background glow
  const bgGlowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hide native splash screen immediately when this React launch screen mounts
    ExpoSplashScreen.hideAsync().catch(() => {});

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // Simplified transition for accessibility
      Animated.sequence([
        Animated.parallel([
          Animated.timing(symbolOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(wordmarkOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(800),
      ]).start(() => setAnimationCompleted(true));
      return;
    }

    // ── Phase 1: Dot Entrance (0.00s – 0.25s) ──────────────────────
    Animated.sequence([
      Animated.parallel([
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(dotHaloOpacity, {
          toValue: 0.6,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(dotHaloScale, {
          toValue: 2.2,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // ── Phase 2: Flow Movement & Ribbon Path (0.25s – 0.80s) ─────
      Animated.parallel([
        Animated.timing(dotTranslateX, {
          toValue: 34,
          duration: 550,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(dotTranslateY, {
          toValue: -28,
          duration: 550,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(flowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(flowScaleX, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bgGlowOpacity, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // ── Phase 3 & 4: Symbol Reveal & Settle (0.80s – 1.40s) ──────
      Animated.parallel([
        Animated.timing(symbolOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(symbolScale, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(symbolRotate, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(flowOpacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // ── Phase 5 & 6: Wordmark & Tagline Reveal (1.40s – 1.95s) ───
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(wordmarkScale, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkTranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          delay: 150,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 400,
          delay: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // ── Phase 7: Hold (2.00s – 2.30s) ────────────────────────────
      Animated.delay(300),
    ]).start(() => {
      setAnimationCompleted(true);
    });
  }, [reduceMotion]);

  // Safety fallback timer to guarantee splash dismisses after 2.5s maximum
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationCompleted(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Once animation finishes and app is ready (auth resolved), fade out seamlessly
  useEffect(() => {
    if (animationCompleted && isReady) {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }
  }, [animationCompleted, isReady, onFinish]);

  const rotateInterpolate = symbolRotate.interpolate({
    inputRange: [-12, 0],
    outputRange: ['-12deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />

      {/* Subtle Warm Background Glow */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: bgGlowOpacity,
          },
        ]}
      />

      {/* Center Brand Cluster */}
      <View style={styles.brandCenterWrapper}>
        
        {/* Animated RuVo Flow Arc & Moving Dot */}
        <View style={styles.flowAnchor}>
          {/* Dynamic Flow Ribbon */}
          <Animated.View
            style={[
              styles.flowRibbon,
              {
                opacity: flowOpacity,
                transform: [{ scaleX: flowScaleX }],
              },
            ]}
          />

          {/* Glowing Pulse Halo */}
          <Animated.View
            style={[
              styles.dotHalo,
              {
                opacity: dotHaloOpacity,
                transform: [{ scale: dotHaloScale }],
              },
            ]}
          />

          {/* The RuVo Leading Dot */}
          <Animated.View
            style={[
              styles.ruvoDot,
              {
                opacity: dotOpacity,
                transform: [
                  { scale: dotScale },
                  { translateX: dotTranslateX },
                  { translateY: dotTranslateY },
                ],
              },
            ]}
          />
        </View>

        {/* The RuVo Monogram Symbol (Engineered Geometric 'R') */}
        <Animated.View
          style={[
            styles.symbolContainer,
            {
              opacity: symbolOpacity,
              transform: [
                { scale: symbolScale },
                { rotate: rotateInterpolate },
              ],
            },
          ]}
        >
          {/* Custom Crafted Geometric RuVo 'R' Emblem */}
          <View style={styles.emblemContainer}>
            {/* Left Vertical Power Pillar */}
            <View style={styles.emblemLeftPillar} />

            {/* Top Loop (RuVo Gold Energy Arch) */}
            <View style={styles.emblemTopLoop}>
              <View style={styles.emblemTopLoopCutout} />
            </View>

            {/* Dynamic Kinetic Forward Leg (RuVo Gold Motion Kick) */}
            <View style={styles.emblemForwardLeg} />

            {/* Accent Connection Dot on Top Right */}
            <View style={styles.emblemConnectionDot} />
          </View>
        </Animated.View>

        {/* RuVo Wordmark */}
        <Animated.View
          style={[
            styles.wordmarkWrapper,
            {
              opacity: wordmarkOpacity,
              transform: [
                { scale: wordmarkScale },
                { translateY: wordmarkTranslateY },
              ],
            },
          ]}
        >
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmarkLetterPrimary}>R</Text>
            <Text style={styles.wordmarkLetterPrimary}>U</Text>
            <Text style={styles.wordmarkLetterPrimary}>V</Text>
            <Text style={styles.wordmarkLetterPrimary}>O</Text>
          </View>
        </Animated.View>

        {/* Tagline / Ecosystem Motto */}
        <Animated.View
          style={[
            styles.taglineWrapper,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <Text style={styles.taglineText}>{roleSubtitle}</Text>
        </Animated.View>
      </View>

      {/* Bottom Subtle Brand Mark */}
      <View style={styles.bottomWatermark}>
        <View style={styles.bottomDot} />
        <Text style={styles.bottomBrandText}>POWERED BY RUVO</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
<<<<<<< HEAD
    width: '100%',
    height: '100%',
=======
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
    backgroundColor: '#FAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  ambientGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(244, 180, 0, 0.12)',
  },
  brandCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowAnchor: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  flowRibbon: {
    position: 'absolute',
    width: 70,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F4B400',
    top: 24,
    left: 8,
  },
  ruvoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F4B400',
    shadowColor: '#F4B400',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  dotHalo: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 180, 0, 0.4)',
  },
  symbolContainer: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emblemContainer: {
    width: 76,
    height: 76,
    position: 'relative',
  },
  emblemLeftPillar: {
    position: 'absolute',
    left: 8,
    top: 6,
    bottom: 6,
    width: 14,
    borderRadius: 7,
    backgroundColor: '#171A1F',
  },
  emblemTopLoop: {
    position: 'absolute',
    left: 16,
    top: 6,
    width: 44,
    height: 38,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    backgroundColor: '#F4B400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemTopLoopCutout: {
    width: 18,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FAF7F0',
    marginLeft: -4,
  },
  emblemForwardLeg: {
    position: 'absolute',
    left: 28,
    top: 38,
    width: 14,
    height: 32,
    borderRadius: 7,
    backgroundColor: '#F4B400',
    transform: [{ rotate: '-32deg' }],
  },
  emblemConnectionDot: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#18A957',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FAF7F0',
  },
  wordmarkWrapper: {
    marginTop: 6,
    alignItems: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmarkLetterPrimary: {
    fontSize: 34,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#171A1F',
    letterSpacing: 4,
  },
  taglineWrapper: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(23, 26, 31, 0.05)',
  },
  taglineText: {
    fontSize: 11,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#77736B',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  bottomWatermark: {
    position: 'absolute',
    bottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.5,
  },
  bottomDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F4B400',
  },
  bottomBrandText: {
    fontSize: 10,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#77736B',
    letterSpacing: 1.5,
  },
});
