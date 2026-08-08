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
  primary: '#2E7D32',
  green: '#4C9A55',
  lightGreen: '#E8F5E9',
  background: '#F7F8FA',
  white: '#FFFFFF',
  text: '#1A1A1A',
  secondary: '#6B7280',
  border: '#DDEFE0',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TV_WIDTH = Math.min(SCREEN_WIDTH - 40, 390);
const TV_HEIGHT = TV_WIDTH * 0.62;

export default function ComingSoonScreen({ navigation }: any) {
  // TV entrance
  const tvOpacity = useRef(new Animated.Value(0)).current;
  const tvScale = useRef(new Animated.Value(0.94)).current;
  const tvTranslateY = useRef(new Animated.Value(20)).current;

  // Broadcast indicator
  const indicatorOpacity = useRef(new Animated.Value(0.4)).current;

  // Hand / gesture animation
  const handX = useRef(new Animated.Value(-35)).current;
  const handY = useRef(new Animated.Value(35)).current;
  const handOpacity = useRef(new Animated.Value(0)).current;
  const handScale = useRef(new Animated.Value(0.8)).current;

  // Gesture trail
  const trailOpacity = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0.4)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  // Coming soon reveal
  const comingOpacity = useRef(new Animated.Value(0)).current;
  const comingScale = useRef(new Animated.Value(0.75)).current;
  const comingTranslateY = useRef(new Animated.Value(12)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  // Bottom content
  const bottomOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      // ---------------------------------------
      // 1. TV enters
      // ---------------------------------------
      Animated.parallel([
        Animated.timing(tvOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),

        Animated.spring(tvScale, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),

        Animated.timing(tvTranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // ---------------------------------------
      // 2. Small pause
      // ---------------------------------------
      Animated.delay(350),

      // ---------------------------------------
      // 3. Hand appears inside TV
      // ---------------------------------------
      Animated.parallel([
        Animated.timing(handOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),

        Animated.spring(handScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),

      // ---------------------------------------
      // 4. Hand moves across TV
      // ---------------------------------------
      Animated.parallel([
        Animated.timing(handX, {
          toValue: 45,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(handY, {
          toValue: -5,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(trailOpacity, {
          toValue: 0.7,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),

      // ---------------------------------------
      // 5. Hand performs gesture
      // ---------------------------------------
      Animated.parallel([
        Animated.sequence([
          Animated.timing(handX, {
            toValue: 75,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(handX, {
            toValue: 48,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),

        Animated.sequence([
          Animated.timing(handScale, {
            toValue: 1.08,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(handScale, {
            toValue: 0.96,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      ]),

      // ---------------------------------------
      // 6. Ripple
      // ---------------------------------------
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: 2.4,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.sequence([
          Animated.timing(rippleOpacity, {
            toValue: 0.5,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),

      // ---------------------------------------
      // 7. Hide hand
      // ---------------------------------------
      Animated.timing(handOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),

      // ---------------------------------------
      // 8. COMING SOON reveal
      // ---------------------------------------
      Animated.parallel([
        Animated.timing(comingOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),

        Animated.spring(comingScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),

        Animated.timing(comingTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // ---------------------------------------
      // 9. Subtitle
      // ---------------------------------------
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      // ---------------------------------------
      // 10. Bottom cards
      // ---------------------------------------
      Animated.timing(bottomOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    // Broadcast indicator pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();

    return () => {
      animation.stop();
      pulse.stop();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      {/* Header */}
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
        {/* Small RuVo heading */}
        <Animated.View
          style={[
            styles.topLabel,
            {
              opacity: tvOpacity,
              transform: [{ translateY: tvTranslateY }],
            },
          ]}
        >
          <View style={styles.ruvoDot} />
          <Text style={styles.topLabelText}>RUVO PREVIEW</Text>
        </Animated.View>

        {/* TV */}
        <Animated.View
          style={[
            styles.tvWrapper,
            {
              opacity: tvOpacity,
              transform: [
                { scale: tvScale },
                { translateY: tvTranslateY },
              ],
            },
          ]}
        >
          {/* TV outer frame */}
          <View style={styles.tvFrame}>
            {/* TV top bar */}
            <View style={styles.tvTopBar}>
              <View style={styles.broadcastLeft}>
                <Animated.View
                  style={[
                    styles.liveDot,
                    { opacity: indicatorOpacity },
                  ]}
                />
                <Text style={styles.broadcastText}>RUVO</Text>
              </View>

              <Text style={styles.previewText}>PREVIEW</Text>
            </View>

            {/* Actual TV screen */}
            <View style={styles.tvScreen}>
              {/* subtle screen lines */}
              <View style={styles.screenLineOne} />
              <View style={styles.screenLineTwo} />

              {/* Center RuVo mark */}
              <Text style={styles.screenRuvo}>RuVo</Text>

              {/* Hand gesture */}
              <Animated.View
                style={[
                  styles.handContainer,
                  {
                    opacity: handOpacity,
                    transform: [
                      { translateX: handX },
                      { translateY: handY },
                      { scale: handScale },
                    ],
                  },
                ]}
              >
                {/* palm */}
                <View style={styles.palm} />

                {/* index finger */}
                <View style={styles.indexFinger} />

                {/* thumb */}
                <View style={styles.thumb} />
              </Animated.View>

              {/* Gesture trail */}
              <Animated.View
                style={[
                  styles.gestureTrail,
                  {
                    opacity: trailOpacity,
                  },
                ]}
              />

              {/* Ripple */}
              <Animated.View
                style={[
                  styles.ripple,
                  {
                    opacity: rippleOpacity,
                    transform: [{ scale: rippleScale }],
                  },
                ]}
              />

              {/* Coming Soon */}
              <Animated.View
                style={[
                  styles.comingContainer,
                  {
                    opacity: comingOpacity,
                    transform: [
                      { scale: comingScale },
                      { translateY: comingTranslateY },
                    ],
                  },
                ]}
              >
                <Text style={styles.comingSmall}>RUVO</Text>

                <Text style={styles.comingText}>
                  COMING SOON
                </Text>

                <View style={styles.greenLine} />
              </Animated.View>
            </View>

            {/* TV bottom */}
            <View style={styles.tvBottomBar}>
              <Text style={styles.bottomBroadcast}>
                SOMETHING NEW IS COMING
              </Text>

              <View style={styles.signalBars}>
                <View style={[styles.signal, { height: 5 }]} />
                <View style={[styles.signal, { height: 8 }]} />
                <View style={[styles.signal, { height: 11 }]} />
                <View style={[styles.signal, { height: 14 }]} />
              </View>
            </View>
          </View>

          {/* TV stand */}
          <View style={styles.tvStand}>
            <View style={styles.standNeck} />
            <View style={styles.standBase} />
          </View>
        </Animated.View>

        {/* Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            { opacity: subtitleOpacity },
          ]}
        >
          <Text style={styles.mainMessage}>
            This feature is coming soon.
          </Text>

          <Text style={styles.subMessage}>
            RuVo is building something better for your neighborhood.
          </Text>
        </Animated.View>

        {/* Coming Soon features */}
        <Animated.View
          style={[
            styles.featuresRow,
            { opacity: bottomOpacity },
          ]}
        >
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🔧</Text>
            <Text style={styles.featureTitle}>Local Services</Text>
            <Text style={styles.featureStatus}>COMING SOON</Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>💼</Text>
            <Text style={styles.featureTitle}>Local Jobs</Text>
            <Text style={styles.featureStatus}>COMING SOON</Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureTitle}>UPI</Text>
            <Text style={styles.featureStatus}>COMING SOON</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Built for your neighborhood.
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
    marginBottom: 10,
  },

  ruvoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 7,
  },

  topLabelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.primary,
  },

  tvWrapper: {
    alignItems: 'center',
    width: '100%',
  },

  tvFrame: {
    width: TV_WIDTH,
    height: TV_HEIGHT,
    maxWidth: 390,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 7,

    shadowColor: COLORS.primary,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 8,
  },

  tvTopBar: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },

  broadcastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 5,
  },

  broadcastText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },

  previewText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 0.8,
  },

  tvScreen: {
    flex: 1,
    backgroundColor: COLORS.veryLightGreen || '#F3FAF4',
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGreen,
  },

  screenLineOne: {
    position: 'absolute',
    width: '80%',
    height: 1,
    backgroundColor: COLORS.lightGreen,
    top: '24%',
  },

  screenLineTwo: {
    position: 'absolute',
    width: '65%',
    height: 1,
    backgroundColor: COLORS.lightGreen,
    bottom: '24%',
  },

  screenRuvo: {
    position: 'absolute',
    top: '18%',
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  },

  handContainer: {
    position: 'absolute',
    width: 55,
    height: 65,
    left: '50%',
    top: '45%',
    marginLeft: -27,
    marginTop: -30,
  },

  palm: {
    position: 'absolute',
    width: 35,
    height: 34,
    bottom: 2,
    left: 10,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '-8deg' }],
  },

  indexFinger: {
    position: 'absolute',
    width: 12,
    height: 39,
    top: 0,
    left: 27,
    borderRadius: 8,
    backgroundColor: COLORS.green,
    transform: [{ rotate: '5deg' }],
  },

  thumb: {
    position: 'absolute',
    width: 13,
    height: 25,
    bottom: 10,
    left: 3,
    borderRadius: 8,
    backgroundColor: COLORS.green,
    transform: [{ rotate: '-45deg' }],
  },

  gestureTrail: {
    position: 'absolute',
    width: 75,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    left: '34%',
    top: '55%',
    transform: [{ rotate: '-15deg' }],
  },

  ripple: {
    position: 'absolute',
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  comingContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  comingSmall: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.green,
    letterSpacing: 3,
    marginBottom: 4,
  },

  comingText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.065, 27),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },

  greenLine: {
    width: 55,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 8,
  },

  tvBottomBar: {
    height: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },

  bottomBroadcast: {
    fontSize: 7,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 0.4,
  },

  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },

  signal: {
    width: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },

  tvStand: {
    alignItems: 'center',
  },

  standNeck: {
    width: 35,
    height: 12,
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },

  standBase: {
    width: 85,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  messageContainer: {
    alignItems: 'center',
    paddingHorizontal: 25,
    marginTop: 18,
  },

  mainMessage: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },

  subMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 300,
  },

  featuresRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 390,
    marginTop: 14,
    gap: 7,
  },

  featureCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGreen,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
  },

  featureIcon: {
    fontSize: 18,
    marginBottom: 3,
  },

  featureTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },

  featureStatus: {
    fontSize: 6.5,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 3,
    letterSpacing: 0.3,
  },

  footer: {
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 11,
    color: COLORS.secondary,
  },
});