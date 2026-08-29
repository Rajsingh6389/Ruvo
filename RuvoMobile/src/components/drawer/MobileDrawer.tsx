import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
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
  /** Which edge it slides from. Filters conventionally use 'right', menus 'left'. */
  side?: 'left' | 'right';
  /** Fraction of screen width. Capped so it never exceeds a comfortable reading width. */
  widthRatio?: number;
  footer?: React.ReactNode;
};

const DISMISS_DISTANCE = 70;
const DISMISS_VELOCITY = 0.4;
/** Beyond this a drawer stops feeling like a panel, so it is capped on tablets. */
const MAX_WIDTH = 420;

/**
 * Slide-in side drawer (§13) for filters, sort, menus and category pickers.
 *
 * Backdrop blocks interaction behind it, tapping the backdrop closes, and a
 * horizontal drag toward the origin edge dismisses. Built on `Animated` +
 * `PanResponder` -- no gesture-handler dependency.
 */
export const MobileDrawer = ({
  visible,
  onClose,
  title,
  children,
  side = 'right',
  widthRatio = 0.86,
  footer,
}: Props) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const width = Math.min(windowWidth * widthRatio, MAX_WIDTH);
  /** Off-screen offset: negative for a left drawer, positive for a right one. */
  const hidden = side === 'right' ? width : -width;

  const [mounted, setMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(hidden)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const animateTo = useCallback(
    (target: 'open' | 'closed', onDone?: () => void) => {
      const duration = reduceMotion ? 0 : target === 'open' ? DURATION.slow : DURATION.base;

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: target === 'open' ? 0 : hidden,
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
    [translateX, backdropOpacity, hidden, reduceMotion],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateX.setValue(hidden);
      requestAnimationFrame(() => animateTo('open'));
    } else if (mounted) {
      animateTo('closed', () => setMounted(false));
    }
    // `mounted` excluded on purpose -- see BottomSheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, animateTo, translateX, hidden]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        // Only a horizontal drag toward the drawer's own edge counts, so vertical
        // scrolling inside the body keeps working.
        const horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 8;
        return horizontal && (side === 'right' ? gesture.dx > 0 : gesture.dx < 0);
      },
      onPanResponderMove: (_evt, gesture) => {
        const next = side === 'right' ? Math.max(0, gesture.dx) : Math.min(0, gesture.dx);
        translateX.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const travelled = Math.abs(gesture.dx);
        const velocity = Math.abs(gesture.vx);
        if (travelled > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
          onCloseRef.current();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    }),
  ).current;

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: backdropOpacity }]}
        >
          <Pressable style={styles.backdropPress} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.panel,
            side === 'right' ? styles.panelRight : styles.panelLeft,
            {
              width,
              backgroundColor: colors.surface,
              paddingTop: insets.top + 8,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[typography.headingS, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
              {title ?? ''}
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

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? <View style={[styles.footer, { borderTopColor: colors.divider }]}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPress: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  panelRight: {
    right: 0,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  panelLeft: {
    left: 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
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
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
});
