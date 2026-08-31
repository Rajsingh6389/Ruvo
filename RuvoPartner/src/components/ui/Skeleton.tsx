import React, { useEffect } from 'react';
import { DimensionValue, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  className?: string;
}

export const Skeleton = ({
  width = '100%',
  height,
  borderRadius = 8,
  className = '',
}: SkeletonProps) => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={`bg-warm-300 ${className}`}
      style={[
        { width, height, borderRadius },
        animatedStyle,
      ]}
    />
  );
};

// Product Card Skeleton
export const ProductCardSkeleton = () => {
  return (
    <View className="bg-ruvo-surface rounded-lg border border-warm-300 overflow-hidden">
      <Skeleton height={180} borderRadius={0} />
      <View className="p-md gap-sm">
        <Skeleton height={16} width="80%" />
        <Skeleton height={14} width="60%" />
        <View className="flex-row items-center justify-between mt-sm">
          <Skeleton height={20} width={80} />
          <Skeleton height={32} width={32} borderRadius={8} />
        </View>
      </View>
    </View>
  );
};

// Order Card Skeleton
export const OrderCardSkeleton = () => {
  return (
    <View className="bg-ruvo-surface rounded-lg p-lg border border-warm-300 gap-md">
      <View className="flex-row items-center justify-between">
        <Skeleton height={20} width={120} />
        <Skeleton height={24} width={70} borderRadius={12} />
      </View>
      <View className="gap-xs">
        <Skeleton height={16} width="90%" />
        <Skeleton height={14} width="70%" />
      </View>
      <View className="flex-row items-center justify-between">
        <Skeleton height={18} width={100} />
        <Skeleton height={36} width={100} borderRadius={8} />
      </View>
    </View>
  );
};

// List Skeleton
export const ListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <View className="gap-md">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} className="bg-ruvo-surface rounded-lg p-lg border border-warm-300 gap-sm">
          <Skeleton height={18} width="60%" />
          <Skeleton height={14} width="80%" />
          <Skeleton height={14} width="40%" />
        </View>
      ))}
    </View>
  );
};

// Screen Skeleton (Dashboard)
export const DashboardSkeleton = () => {
  return (
    <View className="flex-1 bg-ruvo-bg p-lg gap-lg">
      {/* Header Skeleton */}
      <View className="flex-row items-center justify-between">
        <Skeleton height={32} width={150} />
        <Skeleton height={40} width={40} borderRadius={20} />
      </View>

      {/* Stats Cards */}
      <View className="flex-row gap-md">
        {[1, 2].map((i) => (
          <View key={i} className="flex-1 bg-ruvo-surface rounded-lg p-lg border border-warm-300 gap-sm">
            <Skeleton height={14} width="60%" />
            <Skeleton height={28} width={100} />
            <Skeleton height={12} width="80%" />
          </View>
        ))}
      </View>

      {/* Chart Skeleton */}
      <View className="bg-ruvo-surface rounded-lg p-lg border border-warm-300 gap-md">
        <Skeleton height={20} width={120} />
        <Skeleton height={200} />
      </View>

      {/* List Skeleton */}
      <View className="gap-md">
        <Skeleton height={20} width={150} />
        <ListSkeleton count={3} />
      </View>
    </View>
  );
};
