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
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from './Skeleton';
import { useTheme } from '../context/ThemeContext';

interface SmartImageProps
  extends Omit<ImageProps, 'style' | 'width' | 'height'> {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  /** Glyph shown when the image cannot be loaded. */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
}

/** True when the source is a remote URI that is missing or blank. */
const hasNoUsableUri = (source: ImageProps['source']): boolean => {
  if (!source) return true;
  if (typeof source === 'number') return false; // require()'d local asset
  if (Array.isArray(source)) return source.length === 0;
  return !source.uri || !String(source.uri).trim();
};

export const SmartImage = ({
  width,
  height,
  borderRadius,
  style,
  imageStyle,
  fallbackIcon = 'image-outline',
  source,
  onLoad,
  onError,
  ...props
}: SmartImageProps) => {
  const { colors } = useTheme();
  const missingSource = hasNoUsableUri(source);
  const [isLoading, setIsLoading] = useState(!missingSource);
  const [hasFailed, setHasFailed] = useState(missingSource);
  const opacity = useRef(new Animated.Value(0)).current;

  const handleLoad: ImageProps['onLoad'] = event => {
    setIsLoading(false);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    onLoad?.(event);
  };

  // Without this the skeleton shimmers forever on a dead URL, which reads as a
  // hung screen rather than a missing picture.
  const handleError: ImageProps['onError'] = event => {
    setIsLoading(false);
    setHasFailed(true);
    onError?.(event);
  };

  const containerStyle = {
    width: width ?? '100%',
    height: height ?? 200,
    borderRadius: borderRadius ?? 0,
    overflow: 'hidden' as const,
  };

  return (
    <View style={[containerStyle, style]}>
      {isLoading && !hasFailed && (
        <View style={StyleSheet.absoluteFill}>
          <Skeleton width="100%" height="100%" />
        </View>
      )}

      {hasFailed ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.fallback,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name={fallbackIcon} size={28} color={colors.textHint} />
        </View>
      ) : (
        <Animated.Image
          {...props}
          source={source}
          onLoad={handleLoad}
          onError={handleError}
          style={[StyleSheet.absoluteFill, { opacity }, imageStyle]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
