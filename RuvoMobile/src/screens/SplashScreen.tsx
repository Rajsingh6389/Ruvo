import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { ROUTES } from '../constants/routes';

export const SplashScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { colors, typography, radius, shadows } = useTheme();

  // Main entrance animation
  const opacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.65)).current;
  const logoY = useRef(new Animated.Value(20)).current;

  // Text animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(12)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(10)).current;

  // Background decorative animations
  const circleOne = useRef(new Animated.Value(0)).current;
  const circleTwo = useRef(new Animated.Value(0)).current;

  // Loader
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),

        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),

        Animated.timing(logoY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),

        Animated.timing(titleY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),

        Animated.timing(subtitleY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtle floating background animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(circleOne, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(circleOne, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(circleTwo, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(circleTwo, {
          toValue: 0,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => {
      circleOne.stopAnimation();
      circleTwo.stopAnimation();
    };
  }, [
    opacity,
    logoScale,
    logoY,
    titleOpacity,
    titleY,
    subtitleOpacity,
    subtitleY,
    loaderOpacity,
    circleOne,
    circleTwo,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace(ROUTES.LOGIN);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
        },
      ]}
    >
      <StatusBar
        backgroundColor={colors.primary}
        barStyle="light-content"
      />

      {/* Decorative background */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundCircleLarge,
          {
            transform: [
              {
                translateY: circleOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -25],
                }),
              },
              {
                translateX: circleOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 18],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundCircleSmall,
          {
            transform: [
              {
                translateY: circleTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 25],
                }),
              },
              {
                translateX: circleTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -15],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity,
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: logoScale },
                { translateY: logoY },
              ],
            },
          ]}
        >
          <View style={[styles.logoOuter, { borderRadius: radius.xl }]}>
            <View style={[styles.logoInner, { borderRadius: radius.lg, backgroundColor: colors.card }]}>
              <Ionicons
                name="storefront"
                size={42}
                color={colors.primary}
              />
            </View>
          </View>
        </Animated.View>

        {/* Brand */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
          }}
        >
          <Text style={[typography.display, styles.brand, { color: colors.onPrimary }]}>RUVO</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleY }],
          }}
        >
          <Text style={[typography.headingM, styles.tagline, { color: colors.onPrimary }]}>
            One App for Every Village
          </Text>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.onPrimary }]} />
            <View style={[styles.dividerDot, { backgroundColor: colors.onPrimary }]} />
            <View style={[styles.dividerLine, { backgroundColor: colors.onPrimary }]} />
          </View>

          <Text style={[typography.caption, styles.description, { color: colors.onPrimary }]}>
            Shop local. Deliver faster. Live better.
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Bottom loading section */}
      <Animated.View
        style={[
          styles.loadingSection,
          {
            opacity: loaderOpacity,
          },
        ]}
      >
        <View style={styles.loadingDots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotMiddle, { backgroundColor: colors.onPrimary }]} />
          <View style={styles.dot} />
        </View>

        <Text style={[typography.caption, styles.loadingText, { color: colors.onPrimary }]}>
          Launching RuVo...
        </Text>
      </Animated.View>

      {/* Version */}
      <Text style={[typography.caption, styles.version, { color: colors.onPrimary }]}>
        RUVO • LOCAL COMMERCE
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  /* Background */

  backgroundCircleLarge: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: 'rgba(255,255,255,0.055)',
    top: -120,
    right: -110,
  },

  backgroundCircleSmall: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.045)',
    bottom: -80,
    left: -100,
  },

  /* Logo */

  logoContainer: {
    marginBottom: 22,
  },

  logoOuter: {
    width: 108,
    height: 108,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  logoInner: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Brand */

  brand: {
    marginTop: 22,
    textAlign: 'center',
  },

  tagline: {
    marginTop: 8,
    textAlign: 'center',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 8,
  },

  dividerLine: {
    width: 35,
    height: 1,
  },

  dividerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  description: {
    marginTop: 12,
  },

  /* Loading */

  loadingSection: {
    position: 'absolute',
    bottom: 68,
    alignItems: 'center',
  },

  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  dotMiddle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },

  loadingText: {
    letterSpacing: 0.7,
  },

  version: {
    position: 'absolute',
    bottom: 20,
    letterSpacing: 1.2,
  },
});

export default SplashScreen;