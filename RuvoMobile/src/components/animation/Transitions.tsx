import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle, Easing } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/** §7: transitions sit in the 150–300ms band. Anything slower feels sluggish. */
export const DURATION = {
  fast: 150,
  base: 220,
  slow: 300,
} as const;

type BaseProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Delay before starting, for staggered list entrances. */
  delay?: number;
  duration?: number;
};

/**
 * Runs an entrance animation once on mount.
 *
 * Under Reduce Motion the element is placed directly in its final state -- it
 * still appears, it just does not travel (§23). Everything animates `opacity`
 * and `transform` only, so it stays on the compositor and off the JS thread (§24).
 */
const useEntrance = (delay: number, duration: number, reduceMotion: boolean) => {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [progress, delay, duration, reduceMotion]);

  return progress;
};

export const FadeIn = ({ children, style, delay = 0, duration = DURATION.base }: BaseProps) => {
  const reduceMotion = useReducedMotion();
  const progress = useEntrance(delay, duration, reduceMotion);

  return <Animated.View style={[style, { opacity: progress }]}>{children}</Animated.View>;
};

export const SlideUp = ({
  children,
  style,
  delay = 0,
  duration = DURATION.base,
  /** Travel distance in px. Kept small -- a long slide reads as lag. */
  distance = 16,
}: BaseProps & { distance?: number }) => {
  const reduceMotion = useReducedMotion();
  const progress = useEntrance(delay, duration, reduceMotion);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

export const ScaleIn = ({
  children,
  style,
  delay = 0,
  duration = DURATION.base,
  from = 0.96,
}: BaseProps & { from?: number }) => {
  const reduceMotion = useReducedMotion();
  const progress = useEntrance(delay, duration, reduceMotion);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 1] });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ scale }] }]}>{children}</Animated.View>
  );
};

/**
 * Screen-level entrance. Wrap a screen body so route changes have the §7 feel
 * without touching the navigator.
 */
export const PageTransition = ({
  children,
  style,
  duration = DURATION.base,
  variant = 'slide',
}: BaseProps & { variant?: 'fade' | 'slide' | 'scale' }) => {
  if (variant === 'fade') {
    return (
      <FadeIn style={[{ flex: 1 }, style]} duration={duration}>
        {children}
      </FadeIn>
    );
  }
  if (variant === 'scale') {
    return (
      <ScaleIn style={[{ flex: 1 }, style]} duration={duration}>
        {children}
      </ScaleIn>
    );
  }
  return (
    <SlideUp style={[{ flex: 1 }, style]} duration={duration}>
      {children}
    </SlideUp>
  );
};

/**
 * Staggered entrance for a short list of children (§7 "staggered content
 * entrance").
 *
 * For long or virtualised lists use `FadeIn`/`SlideUp` on the row inside
 * `renderItem` instead -- mapping children here would defeat FlatList recycling.
 * The total stagger is capped so a longer list does not delay its last row
 * noticeably.
 */
export const Stagger = ({
  children,
  step = 40,
  maxDelay = 240,
  duration = DURATION.base,
}: {
  children: React.ReactNode;
  step?: number;
  maxDelay?: number;
  duration?: number;
}) => (
  <>
    {React.Children.map(React.Children.toArray(children), (child, index) => (
      <SlideUp delay={Math.min(index * step, maxDelay)} duration={duration}>
        {child}
      </SlideUp>
    ))}
  </>
);
