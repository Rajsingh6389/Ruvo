import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useResponsive } from '../utils/responsive';

export type HeroSlide = {
  id: string;
  /** Small pill above the headline — "0% commission", "BUY 4 GET 1 FREE". */
  tag?: string;
  badgeType?: 'gold' | 'accent' | 'default';
  title: string;
  subTitle?: string;
  body?: string;
  ctaLabel?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /**
   * Two or more stops painted behind the slide. Gradient art rather than remote
   * stock photography: it renders instantly, survives being offline, and cannot
   * show a broken-image box in the most prominent slot on the screen.
   */
  gradient: readonly [string, string, ...string[]];
  onPress?: () => void;
};

interface HeroCarouselProps {
  slides: HeroSlide[];
  /** Width of one slide. The caller owns page width so paging stays exact. */
  width: number;
  height: number;
  autoPlayMs?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Auto-advancing hero banner.
 *
 * Extracted from HomeScreen, with the three things that version got wrong fixed:
 *
 * - **Interaction now pauses it.** Previously the timer only restarted on
 *   `onMomentumScrollEnd`, so a slide could yank itself out from under a finger
 *   mid-drag. `onScrollBeginDrag` stops the timer outright.
 * - **Reduce Motion disables auto-play** instead of animating on a timer (§23) —
 *   an unattended looping animation is exactly what that setting exists to stop.
 * - **It stops when unmounted or when there is only one slide**, so no interval
 *   survives navigation away from Home.
 */
export const HeroCarousel = ({
  slides,
  width,
  height,
  autoPlayMs = 4200,
  style,
}: HeroCarouselProps) => {
  const { colors, typography, radius, shadows } = useTheme();
  const { sf, isCompact } = useResponsive();
  const reduceMotion = useReducedMotion();

  const [activeIndex, setActiveIndex] = useState(0);
  // `Animated.ScrollView` forwards its ref to the underlying ScrollView.
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks the page without waiting for a re-render, so the timer advances from
  // the slide the user actually left it on.
  const indexRef = useRef(0);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    if (reduceMotion || slides.length <= 1 || width <= 0) return;

    timer.current = setInterval(() => {
      const next = (indexRef.current + 1) % slides.length;
      indexRef.current = next;
      setActiveIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, autoPlayMs);
  }, [autoPlayMs, reduceMotion, slides.length, stop, width]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    indexRef.current = clamped;
    setActiveIndex(clamped);
    start();
  };

  if (slides.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: radius.xl,
          borderWidth: 1.5,
          borderColor: colors.goldBorder || colors.accent,
        },
        shadows.lg,
        style,
      ]}
    >
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={stop}
        onMomentumScrollEnd={handleMomentumEnd}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
      >
        {slides.map((slide, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          // A small counter-drift on the copy gives depth without the queasiness
          // of a full parallax; skipped entirely under Reduce Motion.
          const translateX = reduceMotion
            ? 0
            : scrollX.interpolate({
                inputRange,
                outputRange: [width * 0.12, 0, -width * 0.12],
                extrapolate: 'clamp',
              });

          const isGoldBadge = slide.badgeType === 'gold';

          return (
            <View key={slide.id} style={{ width, height }}>
              <LinearGradient
                colors={slide.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {slide.icon ? (
                <Ionicons
                  name={slide.icon}
                  size={height * 0.85}
                  color="rgba(255,255,255,0.13)"
                  style={styles.watermark}
                />
              ) : null}

              <Animated.View
                style={[
                  styles.content,
                  { padding: isCompact ? 16 : 20, transform: [{ translateX }] },
                ]}
              >
                {slide.tag ? (
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: isGoldBadge ? colors.gold : colors.accent,
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.overline,
                        {
                          color: isGoldBadge ? '#173F35' : colors.onAccent,
                          fontWeight: '800',
                          letterSpacing: 0.5,
                        },
                      ]}
                    >
                      {slide.tag}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.copy}>
                  <Text
                    numberOfLines={1}
                    style={[styles.title, { fontSize: sf(isCompact ? 19 : 22) }]}
                  >
                    {slide.title}
                  </Text>

                  {slide.subTitle ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.subTitle,
                        { color: colors.accent, fontSize: sf(isCompact ? 19 : 22) },
                      ]}
                    >
                      {slide.subTitle}
                    </Text>
                  ) : null}

                  {slide.body ? (
                    <Text
                      numberOfLines={2}
                      style={[styles.body, { fontSize: sf(12.5) }]}
                    >
                      {slide.body}
                    </Text>
                  ) : null}

                  {slide.ctaLabel ? (
                    <View
                      style={[
                        styles.cta,
                        { backgroundColor: colors.surface, borderRadius: radius.sm },
                      ]}
                    >
                      <Text
                        style={[typography.caption, styles.ctaText, { color: colors.primary }]}
                        numberOfLines={1}
                      >
                        {slide.ctaLabel}
                      </Text>
                      <Ionicons name="arrow-forward" size={13} color={colors.primary} />
                    </View>
                  ) : null}
                </View>
              </Animated.View>

              {/* The whole slide is the tap target, laid over the art so the CTA
                  pill does not have to be hit precisely. */}
              {slide.onPress ? (
                <View
                  accessibilityRole="button"
                  accessibilityLabel={[slide.title, slide.subTitle, slide.ctaLabel]
                    .filter(Boolean)
                    .join(', ')}
                  onTouchEnd={slide.onPress}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
            </View>
          );
        })}
      </Animated.ScrollView>

      {slides.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {slides.map((slide, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            // width cannot be animated with useNativeDriver:true — use scaleX instead.
            // The dot has a fixed base width of 18; inactive dots scale down to 6/18 ≈ 0.33.
            const scaleX = scrollX.interpolate({
              inputRange,
              outputRange: [6 / 18, 1, 6 / 18],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.5, 1, 0.5],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={`dot-${slide.id}`}
                style={[
                  styles.dot,
                  {
                    opacity,
                    transform: [{ scaleX }],
                    backgroundColor:
                      activeIndex === index ? colors.accent : 'rgba(255,255,255,0.7)',
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: -12,
    bottom: -18,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 'auto',
  },
  copy: {
    maxWidth: '86%',
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  subTitle: {
    fontWeight: '800',
  },
  body: {
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 14,
    height: 36,
    marginTop: 12,
  },
  ctaText: {
    fontWeight: '800',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 18,
    height: 6,
    borderRadius: 3,
  },
});
