import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, AccessibilityInfo, StatusBar } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

interface RuvoLaunchScreenProps {
  onFinish?: () => void;
  isReady?: boolean;
  roleSubtitle?: string;
}

export const RuvoLaunchScreen: React.FC<RuvoLaunchScreenProps> = ({
  onFinish,
  isReady = true,
  roleSubtitle = 'LOCAL • CONNECTED • MOVING',
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.4)).current;

  // Injecting the User's Real Image Logo for Splash display
  const APP_LOGO = require('../../../assets/images/RuvoIcon.png');

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start(() => setAnimationCompleted(true));
      return;
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.8, duration: 750, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1.8, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(wordmarkTranslateY, { toValue: 0, duration: 550, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]),
      Animated.delay(650),
    ]).start(() => setAnimationCompleted(true));
  }, [reduceMotion]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationCompleted(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animationCompleted && isReady) {
      Animated.timing(containerOpacity, {
        toValue: 0, duration: 380, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true,
      }).start(() => onFinish && onFinish());
    }
  }, [animationCompleted, isReady, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.brandCenterWrapper}>
        <Animated.View style={[ styles.ambientGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
        
        <Animated.Image 
          source={APP_LOGO} 
          style={[styles.logoImage, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]} 
          resizeMode="contain" 
        />
        
        <Animated.View style={[styles.wordmarkWrapper, { opacity: wordmarkOpacity, transform: [{ translateY: wordmarkTranslateY }] }]}>
          <Text style={styles.taglineText}>{roleSubtitle}</Text>
        </Animated.View>
      </View>

      <View style={styles.bottomWatermark}>
        <View style={styles.bottomDot} />
        <Text style={styles.bottomBrandText}>POWERED BY RUVO</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 99999 },
  ambientGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(23, 63, 53, 0.09)' },
  brandCenterWrapper: { alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 170, height: 170, marginBottom: 8 },
  wordmarkWrapper: { marginTop: 18, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(23, 26, 31, 0.04)' },
  taglineText: { fontSize: 13, fontFamily: 'Poppins_800ExtraBold', color: '#77736B', letterSpacing: 2.5, textTransform: 'uppercase' },
  bottomWatermark: { position: 'absolute', bottom: 42, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.7 },
  bottomDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#173F35' },
  bottomBrandText: { fontSize: 11, fontFamily: 'Poppins_800ExtraBold', color: '#8A867E', letterSpacing: 1.8 },
});
