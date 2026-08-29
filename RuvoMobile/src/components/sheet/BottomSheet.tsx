import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { DURATION } from '../animation/Transitions';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Fraction of screen height the sheet may occupy. */
  maxHeightRatio?: number;
  /** Pinned footer (e.g. a confirm button) that stays put while the body scrolls. */
  footer?: React.ReactNode;
  /** Set false for a destructive/confirming sheet that must not be dismissed casually. */
  dismissOnBackdropPress?: boolean;
  /** Set false when the body has its own scroll container (e.g. a FlatList). */
  scrollable?: boolean;
};

/** Drag further than this and the sheet closes instead of snapping back. */
const DISMISS_DISTANCE = 90;
/** A fast downward flick dismisses even if it did not travel far. */
const DISMISS_VELOCITY = 0.5;

/**
 * Mobile bottom sheet (§14) on `Animated` + `PanResponder` -- no Reanimated or
 * gesture-handler dependency.
 *
 * Covers the §14 checklist: entrance animation, backdrop, explicit close, a
 * scrollable body, safe-area padding, and keyboard avoidance. Drag-to-dismiss is
 * included since a sheet that can only be closed by a small ✕ fails §16.
 */
export const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.9,
  footer,
  dismissOnBackdropPress = true,
  scrollable = true,
}: Props) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  // The Modal must outlive `visible` so the exit animation can play; unmounting
  // immediately would make the sheet vanish instantly.
  const [mounted, setMounted] = useState(visible);

  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const animateTo = useCallback(
    (target: 'open' | 'closed', onDone?: () => void) => {
      const toValue = target === 'open' ? 0 : windowHeight;
      const duration = reduceMotion ? 0 : target === 'open' ? DURATION.slow : DURATION.base;

      Animated.parallel([
        Animated.timing(translateY, {
          toValue,
          duration,
          easing: target === 'open' ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: target === 'open' ? 1 : 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone?.();
      });
    },
    [translateY, backdropOpacity, windowHeight, reduceMotion],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Start off-screen, then animate in on the next frame so the Modal has
      // laid out first -- animating during mount can drop the first frames.
      translateY.setValue(windowHeight);
      requestAnimationFrame(() => animateTo('open'));
    } else if (mounted) {
      animateTo('closed', () => setMounted(false));
    }
    // `mounted` is deliberately excluded: including it would re-run the exit
    // animation as it flips false.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, animateTo, translateY, windowHeight]);

  // PanResponder is created once, so it must not close over a stale `onClose`.
  // Declared before the responder that reads it.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useRef(
    PanResponder.create({
      // Claim the gesture only once it is clearly a downward drag, so taps and
      // horizontal swipes inside the body still reach their own handlers.
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_evt, gesture) => {
        // Upward drags do not stretch the sheet: clamp to the resting position.
        translateY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_evt, gesture) => {
        const shouldDismiss = gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY;
        if (shouldDismiss) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    }),
  ).current;

  if (!mounted) return null;

  const maxHeight = windowHeight * maxHeightRatio;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Backdrop blocks interaction with whatever is behind the sheet. */}
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: backdropOpacity }]}>
          <Pressable
            style={styles.backdropPress}
            onPress={dismissOnBackdropPress ? onClose : undefined}
            accessibilityLabel={dismissOnBackdropPress ? 'Close' : undefined}
            accessibilityRole={dismissOnBackdropPress ? 'button' : undefined}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                maxHeight,
                // Lift content clear of the home indicator / nav bar.
                paddingBottom: Math.max(insets.bottom, 12),
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Grab handle doubles as the drag surface. */}
            <View {...panResponder.panHandlers} style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {title ? (
              <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <Text style={[typography.headingS, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={12}
                  style={styles.close}
                >
                  <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Rendered as two explicit branches rather than a dynamic component:
                a `ScrollView | View` union makes the prop types unusable. */}
            {scrollable ? (
              <ScrollView
                style={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.bodyContent}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.body, styles.bodyContent]}>{children}</View>
            )}

            {footer ? <View style={[styles.footer, { borderTopColor: colors.divider }]}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPress: {
    flex: 1,
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    // Generous vertical padding: this is the drag target, so it needs size.
    paddingBottom: 8,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 18,
  },
  bodyContent: {
    paddingTop: 14,
    paddingBottom: 6,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
});
