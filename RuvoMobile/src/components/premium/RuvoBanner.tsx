import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image, Animated, useWindowDimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';
import { getStandardBanners } from '../../assets/cloudinary/banners';
import { DURATIONS, EASINGS } from '../../theme/motion';
import { resolveImageUrl } from '../../utils/imageUrl';

interface RuvoBannerProps {
  onPress?: (banner: any) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  data?: any[];
}

export const RuvoBanner: React.FC<RuvoBannerProps> = ({
  onPress,
  autoPlay = true,
  autoPlayInterval = 4000,
  data,
}) => {
  const { colors, typography, radius, shadows } = useTheme();
  const { sf, sw, sh } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const defaultBanners = getStandardBanners();
  const banners = data || defaultBanners;
  const bannerGap = 12;
  const horizontalPadding = sw(16);
  const bannerWidth = Math.min(screenWidth - horizontalPadding * 2, 430);
  const bannerHeight = Math.max(138, Math.min(sh(180), 190));

  const scrollX = React.useRef(new Animated.Value(0)).current;
  const dotScale = React.useRef(new Animated.Value(1)).current;

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (bannerWidth + bannerGap));
    if (index !== activeIndex) {
      setActiveIndex(index);
      Animated.sequence([
        Animated.timing(dotScale, {
          toValue: 1.2,
          duration: DURATIONS.fast,
          useNativeDriver: true,
        }),
        Animated.timing(dotScale, {
          toValue: 1,
          duration: DURATIONS.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const scrollToIndex = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * (bannerWidth + bannerGap),
      animated: true,
    });
  };

  React.useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      scrollToIndex(nextIndex);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [activeIndex, autoPlay, autoPlayInterval, banners.length]);

  const animatedDotStyle = {
    transform: [{ scale: dotScale }],
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false } // mapping to opacity and scale, but false prevents potential width clashes in some RN versions
        )}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, gap: bannerGap }]}
        decelerationRate="fast"
        snapToInterval={bannerWidth + bannerGap}
      >
        {banners.map((banner, index) => {
          const inputRange = [
            (index - 1) * (bannerWidth + bannerGap),
            index * (bannerWidth + bannerGap),
            (index + 1) * (bannerWidth + bannerGap)
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [1.2, 1, 1.2],
            extrapolate: 'clamp',
          });
          const textOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.9}
            onPress={() => onPress?.(banner)}
            style={[
              styles.banner,
              {
                width: bannerWidth,
                height: bannerHeight,
                borderRadius: radius.hero,
                overflow: 'hidden',
              },
              shadows.lg,
            ]}
          >
            <Animated.Image
              source={{ uri: resolveImageUrl(banner.image) || banner.image }}
              style={[styles.bannerImage, { transform: [{ scale }] }]}
              resizeMode="cover"
            />
            {(banner.title || banner.subtitle) && (
              <Animated.View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: textOpacity }]}>
                <View style={styles.content}>
                  {!!banner.title && (
                    <Text style={[typography.headingXL, styles.title, { 
                      color: '#FFFFFF', 
                      fontSize: sf(28),
                      textShadowColor: 'rgba(0,0,0,0.85)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 6
                    }]}>
                      {banner.title}
                    </Text>
                  )}
                  {!!banner.subtitle && (
                    <Text style={[typography.body, styles.subtitle, { 
                      color: 'rgba(255,255,255,0.98)', 
                      fontSize: sf(15),
                      fontWeight: '600',
                      textShadowColor: 'rgba(0,0,0,0.75)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4
                    }]}>
                      {banner.subtitle}
                    </Text>
                  )}
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>
          );
        })}
      </Animated.ScrollView>

      <View style={styles.dotsContainer}>
        {banners.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: isActive ? colors.primary : colors.border,
                  width: isActive ? sw(24) : sw(8),
                },
                isActive && animatedDotStyle,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  scrollContent: {
    gap: 12,
  },
  banner: {
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    gap: 8,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
