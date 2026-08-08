import React, { useRef, useState } from 'react';
import {
  Animated,
  DimensionValue,
  ImageProps,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Skeleton } from './Skeleton';

interface SmartImageProps
  extends Omit<ImageProps, 'style' | 'width' | 'height'> {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export const SmartImage = ({
  width,
  height,
  borderRadius,
  style,
  imageStyle,
  ...props
}: SmartImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;

  const handleLoad = () => {
    setIsLoading(false);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const containerStyle = {
    width: width ?? '100%',
    height: height ?? 200,
    borderRadius: borderRadius ?? 0,
    overflow: 'hidden' as const,
  };

  return (
    <View style={[containerStyle, style]}>
      {isLoading && (
        <View style={StyleSheet.absoluteFill}>
          <Skeleton width="100%" height="100%" />
        </View>
      )}
      <Animated.Image
        {...props}
        onLoad={handleLoad}
        style={[StyleSheet.absoluteFill, { opacity }, imageStyle]}
      />
    </View>
  );
};

