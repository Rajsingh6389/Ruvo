import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  StyleProp,
  ViewStyle,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type PageLoaderProps = {
  label?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export const PageLoader = ({
  label,
  style,
  compact = false,
}: PageLoaderProps) => {
  const { colors, typography } = useTheme();

  const pulse = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.92,
            duration: 700,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.45,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity, pulse]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
      style={[compact ? styles.compact : styles.page, style]}
    >
      <Animated.View
        style={[
          compact ? styles.loaderCompact : styles.loaderPage,
          {
            backgroundColor: colors.primary + '12',
            transform: [{ scale: pulse }],
          },
        ]}
      >
        <ActivityIndicator
          size={compact ? 'small' : 'large'}
          color={colors.primary}
        />
      </Animated.View>

      {label ? (
        <Animated.Text
          style={[
            typography.caption,
            styles.label,
            {
              color: colors.textSecondary,
              opacity,
            },
          ]}
        >
          {label}
        </Animated.Text>
      ) : null}
    </View>
  );
};

type FullScreenLoaderProps = {
  visible: boolean;
  label?: string;
  hint?: string;
};

export const FullScreenLoader = ({
  visible,
  label = 'Please wait...',
  hint,
}: FullScreenLoaderProps) => {
  const { colors, typography } = useTheme();

  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.94);
      opacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.8,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [visible, opacity, pulse, scale]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: colors.overlay,
            opacity,
          },
        ]}
      >
        <Animated.View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Animated loading icon */}
          <Animated.View
            style={[
              styles.modalLoaderOuter,
              {
                backgroundColor: colors.primary + '12',
                transform: [{ scale: pulse }],
              },
            ]}
          >
            <View
              style={[
                styles.modalLoaderInner,
                {
                  backgroundColor: colors.primary + '1C',
                },
              ]}
            >
              <ActivityIndicator
                size="large"
                color={colors.primary}
              />
            </View>
          </Animated.View>

          <Text
            style={[
              typography.body,
              styles.sheetLabel,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            {label}
          </Text>

          {hint ? (
            <Text
              style={[
                typography.caption,
                styles.sheetHint,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {hint}
            </Text>
          ) : null}

          {/* Progress indicator */}
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: colors.border + '55',
              },
            ]}
          >
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: colors.primary,
                  opacity: pulse,
                },
              ]}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  compact: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },

  loaderPage: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loaderCompact: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '600',
  },

  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  sheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },

  modalLoaderOuter: {
    width: 86,
    height: 86,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalLoaderInner: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetLabel: {
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },

  sheetHint: {
    marginTop: 7,
    textAlign: 'center',
    lineHeight: 18,
  },

  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 22,
  },

  progressBar: {
    width: '42%',
    height: '100%',
    borderRadius: 4,
  },
});