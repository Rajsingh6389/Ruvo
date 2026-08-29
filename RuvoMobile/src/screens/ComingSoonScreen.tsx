import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Easing,
} from 'react-native';

const COLORS = {
  primary: '#F5B700',
  primaryDark: '#C98F00',
  light: '#FFF8E6',
  background: '#F8F9FB',
  white: '#FFFFFF',
  text: '#111827',
  secondary: '#6B7280',
  border: '#E5E7EB',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 52, 360);
const CARD_HEIGHT = CARD_WIDTH * 0.68;

export default function ComingSoonScreen({ navigation }: any) {
  // Main entrance
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const translateY = useRef(new Animated.Value(35)).current;

  // 3D floating motion
  const floatY = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const rotateX = useRef(new Animated.Value(0)).current;

  // 3D depth / glow
  const glowOpacity = useRef(new Animated.Value(0.35)).current;
  const glowScale = useRef(new Animated.Value(0.9)).current;

  // Content reveal
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.75)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;

  // Floating mini icons
  const icon1Y = useRef(new Animated.Value(0)).current;
  const icon2Y = useRef(new Animated.Value(0)).current;
  const icon3Y = useRef(new Animated.Value(0)).current;

  // Pulse
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const entrance = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(250),

      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          friction: 5,
          tension: 75,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(cardsOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    entrance.start();

    // Gentle 3D floating
    const floating = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(floatY, {
            toValue: -10,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatY, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rotateY, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotateY, {
            toValue: -1,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotateY, {
            toValue: 0,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rotateX, {
            toValue: 1,
            duration: 1900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotateX, {
            toValue: -1,
            duration: 1900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotateX, {
            toValue: 0,
            duration: 950,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // Glow breathing
    const glow = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.72,
            duration: 1300,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 1300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.12,
            duration: 1300,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.9,
            duration: 1300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // Small floating icons
    const iconFloat = Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(icon1Y, {
            toValue: -12,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(icon1Y, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(icon2Y, {
            toValue: -15,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(icon2Y, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(icon3Y, {
            toValue: -10,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(icon3Y, {
            toValue: 0,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);

    // Status pulse
    const statusPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    floating.start();
    glow.start();
    iconFloat.start();
    statusPulse.start();

    return () => {
      entrance.stop();
      floating.stop();
      glow.stop();
      iconFloat.stop();
      statusPulse.stop();
    };
  }, []);

  const cardRotateY = rotateY.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-7deg', '0deg', '7deg'],
  });

  const cardRotateX = rotateX.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['5deg', '0deg', '-5deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Small label */}
        <Animated.View
          style={[
            styles.topLabel,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Animated.View
            style={[styles.statusDot, { opacity: pulse }]}
          />
          <Text style={styles.topLabelText}>
            RUVO • SOMETHING NEW
          </Text>
        </Animated.View>

        {/* 3D HERO */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity,
              transform: [
                { perspective: 900 },
                { translateY },
                { scale },
                { rotateX: cardRotateX },
                { rotateY: cardRotateY },
              ],
            },
          ]}
        >
          {/* Ambient glow */}
          <Animated.View
            style={[
              styles.heroGlow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* Floating objects behind the main object */}
          <Animated.View
            style={[
              styles.floatingIcon,
              styles.iconOne,
              { transform: [{ translateY: icon1Y }, { rotate: '-10deg' }] },
            ]}
          >
            <Text style={styles.iconText}>⚡</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.floatingIcon,
              styles.iconTwo,
              { transform: [{ translateY: icon2Y }, { rotate: '9deg' }] },
            ]}
          >
            <Text style={styles.iconText}>✦</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.floatingIcon,
              styles.iconThree,
              { transform: [{ translateY: icon3Y }, { rotate: '-7deg' }] },
            ]}
          >
            <Text style={styles.iconText}>●</Text>
          </Animated.View>

          {/* Back depth layers */}
          <View style={[styles.depthLayer, styles.depthLayer3]} />
          <View style={[styles.depthLayer, styles.depthLayer2]} />
          <View style={[styles.depthLayer, styles.depthLayer1]} />

          {/* Main glass card */}
          <View style={styles.mainCard}>
            <View style={styles.cardTop}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>R</Text>
                </View>

                <View>
                  <Text style={styles.brandName}>RuVo</Text>
                  <Text style={styles.brandCaption}>
                    THE NEXT LOCAL EXPERIENCE
                  </Text>
                </View>
              </View>

              <View style={styles.previewPill}>
                <Animated.View
                  style={[styles.previewDot, { opacity: pulse }]}
                />
                <Text style={styles.previewText}>PREVIEW</Text>
              </View>
            </View>

            <View style={styles.cardCenter}>
              <View style={[styles.orbit, styles.orbitOne]} />
              <View style={[styles.orbit, styles.orbitTwo]} />

              <View style={styles.coreShadow} />

              <View style={styles.core}>
                <View style={styles.coreHighlight} />
                <Text style={styles.coreRuVo}>RuVo</Text>
                <Text style={styles.coreSmall}>BUILDING</Text>
              </View>
            </View>

            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.bottomSmall}>
                  NEW EXPERIENCE
                </Text>
                <Text style={styles.bottomMain}>
                  COMING SOON
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      opacity: pulse,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Glass shine */}
            <View style={styles.glassShine} />
          </View>

          {/* Front bottom shadow */}
          <View style={styles.groundShadow} />
        </Animated.View>

        {/* Main message */}
        <Animated.View
          style={[
            styles.message,
            {
              opacity: titleOpacity,
              transform: [{ scale: titleScale }],
            },
          ]}
        >
          <Text style={styles.mainTitle}>
            Something better is coming.
          </Text>

          <Text style={styles.subtitle}>
            RuVo is building a new experience for your neighborhood.
          </Text>
        </Animated.View>

        {/* Feature cards */}
        <Animated.View
          style={[
            styles.features,
            {
              opacity: cardsOpacity,
            },
          ]}
        >
        

          <View style={styles.featureCard}>
            <View style={styles.featureIconBox}>
              <Text style={styles.featureIcon}>💼</Text>
            </View>
            <Text style={styles.featureTitle}>Local Jobs</Text>
            <Text style={styles.featureStatus}>COMING SOON</Text>
          </View>

        
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Built for you.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 8 : 2,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },

  backArrow: {
    fontSize: 30,
    lineHeight: 30,
    color: COLORS.text,
    marginRight: 5,
  },

  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.secondary,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  topLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 7,
  },

  topLabelText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: COLORS.primaryDark,
  },

  hero: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT + 35,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  heroGlow: {
    position: 'absolute',
    width: CARD_WIDTH * 0.78,
    height: CARD_WIDTH * 0.78,
    borderRadius: CARD_WIDTH * 0.39,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
  },

  floatingIcon: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.light,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },

  iconOne: {
    left: 6,
    top: 35,
  },

  iconTwo: {
    right: 3,
    top: 60,
  },

  iconThree: {
    right: 25,
    bottom: 14,
    width: 30,
    height: 30,
    borderRadius: 10,
  },

  iconText: {
    fontSize: 18,
    color: COLORS.primaryDark,
  },

  depthLayer: {
    position: 'absolute',
    width: CARD_WIDTH - 22,
    height: CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  depthLayer3: {
    backgroundColor: '#EAD79B',
    transform: [
      { translateY: 17 },
      { translateX: 12 },
      { rotate: '2deg' },
    ],
    opacity: 0.9,
  },

  depthLayer2: {
    backgroundColor: '#F0E3B7',
    transform: [
      { translateY: 11 },
      { translateX: 8 },
      { rotate: '1deg' },
    ],
  },

  depthLayer1: {
    backgroundColor: '#FFF2C8',
    transform: [
      { translateY: 6 },
      { translateX: 4 },
    ],
  },

  mainCard: {
    width: CARD_WIDTH - 22,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E8D79E',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 13 },
  },

  cardTop: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    transform: [{ rotate: '-5deg' }],
  },

  brandMarkText: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
  },

  brandName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },

  brandCaption: {
    color: COLORS.secondary,
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 1,
  },

  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.light,
  },

  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 5,
  },

  previewText: {
    color: COLORS.primaryDark,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  cardCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#FFFCF2',
  },

  orbit: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#F0D77E',
    borderRadius: 999,
  },

  orbitOne: {
    width: 150,
    height: 72,
    transform: [{ rotate: '-12deg' }],
  },

  orbitTwo: {
    width: 110,
    height: 55,
    transform: [{ rotate: '22deg' }],
    opacity: 0.65,
  },

  coreShadow: {
    position: 'absolute',
    width: 94,
    height: 24,
    borderRadius: 50,
    backgroundColor: '#D8B45B',
    opacity: 0.2,
    bottom: '27%',
  },

  core: {
    width: 105,
    height: 105,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [
      { rotate: '-7deg' },
      { perspective: 400 },
      { rotateX: '5deg' },
    ],
    elevation: 10,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
  },

  coreHighlight: {
    position: 'absolute',
    width: 60,
    height: 115,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ rotate: '25deg' }, { translateX: -28 }],
  },

  coreRuVo: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -1,
  },

  coreSmall: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
    opacity: 0.85,
  },

  cardBottom: {
    height: 57,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.light,
  },

  bottomSmall: {
    color: COLORS.secondary,
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 1,
  },

  bottomMain: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },

  progressTrack: {
    width: 55,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.light,
    overflow: 'hidden',
  },

  progressFill: {
    width: '70%',
    height: '100%',
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  glassShine: {
    position: 'absolute',
    top: -CARD_HEIGHT * 0.15,
    left: CARD_WIDTH * 0.44,
    width: 70,
    height: CARD_HEIGHT * 1.3,
    backgroundColor: 'rgba(255,255,255,0.32)',
    transform: [{ rotate: '24deg' }],
  },

  groundShadow: {
    position: 'absolute',
    bottom: 4,
    width: CARD_WIDTH * 0.55,
    height: 15,
    borderRadius: 50,
    backgroundColor: '#D9C98F',
    opacity: 0.25,
    transform: [{ scaleX: 1.15 }],
    zIndex: -1,
  },

  message: {
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 13,
  },

  mainTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 315,
  },

  features: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 390,
    marginTop: 15,
    gap: 7,
  },

  featureCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.light,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },

  featureIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },

  featureIcon: {
    fontSize: 17,
  },

  featureTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },

  featureStatus: {
    fontSize: 6,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginTop: 3,
    letterSpacing: 0.4,
  },

  footer: {
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 10.5,
    color: COLORS.secondary,
  },
});
