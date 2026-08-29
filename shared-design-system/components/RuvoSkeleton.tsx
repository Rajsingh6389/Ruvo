/**
 * RuvoSkeleton — Universal Skeleton Loader
 * 
 * Premium animated skeleton loading states
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  RuvoQuickColors,
  RuvoSemanticRadius,
  RuvoAnimations,
} from '../tokens';

export interface RuvoSkeletonProps {
  /** Skeleton width */
  width?: number | string;
  /** Skeleton height */
  height?: number;
  /** Border radius */
  radius?: number;
  /** Circle shape */
  circle?: boolean;
  /** Custom style */
  style?: ViewStyle;
}

export const RuvoSkeleton: React.FC<RuvoSkeletonProps> = ({
  width = '100%',
  height = 16,
  radius,
  circle = false,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: RuvoAnimations.skeletonShimmer.duration,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: RuvoAnimations.skeletonShimmer.duration,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmerAnim]);

  const getBorderRadius = () => {
    if (circle) return (height as number) / 2;
    if (radius !== undefined) return radius;
    return RuvoSemanticRadius.skeleton;
  };

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: circle ? height : width,
          height,
          borderRadius: getBorderRadius(),
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: shimmerOpacity,
            borderRadius: getBorderRadius(),
          },
        ]}
      />
    </View>
  );
};

/**
 * Pre-built skeleton components
 */

/** Skeleton for text line */
export const RuvoSkeletonText: React.FC<{
  width?: number | string;
  lines?: number;
  lineHeight?: number;
  style?: ViewStyle;
}> = ({ width = '100%', lines = 1, lineHeight = 16, style }) => {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <RuvoSkeleton
          key={index}
          width={index === lines - 1 ? '70%' : width}
          height={lineHeight}
          radius={4}
          style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
};

/** Skeleton for avatar */
export const RuvoSkeletonAvatar: React.FC<{
  size?: number;
  style?: ViewStyle;
}> = ({ size = 40, style }) => {
  return <RuvoSkeleton width={size} height={size} circle style={style} />;
};

/** Skeleton for card */
export const RuvoSkeletonCard: React.FC<{
  height?: number;
  style?: ViewStyle;
}> = ({ height = 200, style }) => {
  return (
    <View style={[styles.card, { height }, style]}>
      <RuvoSkeleton
        width="100%"
        height={120}
        radius={RuvoSemanticRadius.card}
      />
      <View style={styles.cardContent}>
        <RuvoSkeletonText lines={2} />
        <View style={styles.cardFooter}>
          <RuvoSkeleton width={80} height={32} />
        </View>
      </View>
    </View>
  );
};

/** Skeleton for list item */
export const RuvoSkeletonListItem: React.FC<{
  showAvatar?: boolean;
  lines?: number;
  style?: ViewStyle;
}> = ({ showAvatar = true, lines = 2, style }) => {
  return (
    <View style={[styles.listItem, style]}>
      {showAvatar && <RuvoSkeletonAvatar size={48} />}
      <View style={styles.listItemContent}>
        <RuvoSkeletonText lines={lines} width="100%" />
      </View>
    </View>
  );
};

/** Skeleton for button */
export const RuvoSkeletonButton: React.FC<{
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}> = ({ width = 120, height = 48, style }) => {
  return (
    <RuvoSkeleton
      width={width}
      height={height}
      radius={RuvoSemanticRadius.button}
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: RuvoQuickColors.bgSecondary,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RuvoQuickColors.borderLight,
  },
  card: {
    padding: 16,
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderRadius: RuvoSemanticRadius.card,
  },
  cardContent: {
    marginTop: 12,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  listItemContent: {
    flex: 1,
  },
});
