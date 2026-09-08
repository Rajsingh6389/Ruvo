import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  StatusBar,
  Animated,
  View,
  Text,
  Dimensions,
  Easing,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export const SplashScreen = () => {
  // Main animations
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoTranslateY = useRef(new Animated.Value(25)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;

  const loaderWidth = useRef(new Animated.Value(0)).current;

  // Decorative animations
  const circleScale = useRef(new Animated.Value(0.9)).current;
  const circleOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 750,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.spring(logoScale, {
        toValue: 1,
        delay: 250,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),

      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 750,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // Tagline
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 600,
        delay: 700,
        useNativeDriver: true,
      }),

      Animated.timing(taglineTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // Loader
      Animated.timing(loaderWidth, {
        toValue: 1,
        // Loop the loader conceptually via a long duration for isLoading states
        duration: 210000, 
        delay: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // Subtle breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circleScale, {
            toValue: 1.08,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(circleOpacity, {
            toValue: 0.65,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),

        Animated.parallel([
          Animated.timing(circleScale, {
            toValue: 0.9,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(circleOpacity, {
            toValue: 0.4,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();

  }, [
    screenOpacity,
    logoOpacity,
    logoScale,
    logoTranslateY,
    taglineOpacity,
    taglineTranslateY,
    loaderWidth,
    circleScale,
    circleOpacity,
  ]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: screenOpacity,
        },
      ]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* =========================
          BACKGROUND
      ========================= */}

      <View style={styles.background}>
        <View style={styles.topYellowShape} />
        <View style={styles.bottomYellowShape} />
        <Animated.View
          style={[
            styles.centerGlow,
            {
              opacity: circleOpacity,
              transform: [{ scale: circleScale }],
            },
          ]}
        />
        <View style={styles.smallCircleOne} />
        <View style={styles.smallCircleTwo} />
        <View style={styles.smallCircleThree} />

        <View style={styles.dotGrid}>
          {Array.from({ length: 16 }).map((_, index) => (
            <View key={index} style={styles.dot} />
          ))}
        </View>
      </View>

      {/* =========================
          BRAND
      ========================= */}

      <View style={styles.content}>

        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [
              { scale: logoScale },
              { translateY: logoTranslateY },
            ],
          }}
        >
          <Animated.Image
            source={{ uri: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1788798945/RuvoPartner.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineOpacity,
              transform: [
                {
                  translateY: taglineTranslateY,
                },
              ],
            },
          ]}
        >
          <Text style={styles.tagline}>
            EMPOWERING YOUR JOURNEY
          </Text>

          <View style={styles.taglineLine} />
        </Animated.View>
      </View>

      {/* =========================
          BOTTOM
      ========================= */}

      <View style={styles.bottomContainer}>

        <Text style={styles.loadingText}>
          Logging you in...
        </Text>

        <View style={styles.loaderTrack}>
          <Animated.View
            style={[
              styles.loaderProgress,
              {
                width: loaderWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100000%'],
                }),
              },
            ]}
          />
        </View>

        <Text style={styles.brandFooter}>
          RUVO PARTNER
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  topYellowShape: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width * 0.48,
    backgroundColor: '#FFD21C',
    top: -width * 0.72,
    left: -width * 0.32,
    opacity: 0.95,
  },
  bottomYellowShape: {
    position: 'absolute',
    width: width * 1.15,
    height: width * 0.7,
    borderRadius: width * 0.5,
    backgroundColor: '#FFD21C',
    bottom: -width * 0.48,
    right: -width * 0.38,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.95,
  },
  centerGlow: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: '#FFF2A6',
    alignSelf: 'center',
    top: height * 0.25,
  },
  smallCircleOne: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFD21C',
    top: height * 0.18,
    right: -25,
    opacity: 0.45,
  },
  smallCircleTwo: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#FFD21C',
    top: height * 0.32,
    left: 25,
    opacity: 0.55,
  },
  smallCircleThree: {
    position: 'absolute',
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFD21C',
    bottom: height * 0.25,
    left: -20,
    opacity: 0.35,
  },
  dotGrid: {
    position: 'absolute',
    right: 28,
    top: height * 0.25,
    width: 55,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    opacity: 0.35,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5A900',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: height * 0.05,
  },
  logo: {
    width: width * 0.58,
    height: width * 0.58,
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: -25,
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 2.8,
    color: '#555555',
    fontWeight: '500',
    textAlign: 'center',
  },
  taglineLine: {
    width: 45,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFD21C',
    marginTop: 12,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#777777',
    marginBottom: 12,
    letterSpacing: 0.4,
  },
  loaderTrack: {
    width: width * 0.42,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#F2E6A5',
    overflow: 'hidden',
  },
  loaderProgress: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#F6C800',
  },
  brandFooter: {
    marginTop: 16,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#222222',
  },
});
