import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'rect' | 'circle';
}

export const Skeleton = ({
  width,
  height,
  borderRadius,
  variant = 'rect',
  style,
}: SkeletonProps) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [animatedValue]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.border,
          opacity: animatedValue,
          width: width ?? '100%',
          height: height ?? 20,
          borderRadius:
            variant === 'circle'
              ? (typeof width === 'number'
                  ? width
                  : typeof height === 'number'
                  ? height
                  : 50) / 2
              : borderRadius ?? 8,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});

