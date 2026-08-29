import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';
import { getHeroBanners } from '../../assets/cloudinary/banners';
import { DURATIONS, EASINGS } from '../../theme/motion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RuvoBannerProps {
  onPress?: (banner: any) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export const RuvoBanner: React.FC<RuvoBannerProps> = ({
  onPress,
  autoPlay = true,
  autoPlayInterval = 4000,
}) => {
  const { colors, typography, radius, shadows } = useTheme();
  const { sf, sw, sh } = useResponsive();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const banners = getHeroBanners();

  const dotScale = React.useRef(new Animated.Value(1)).current;

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH * 0.9));
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
      x: index * (SCREEN_WIDTH * 0.9 + 12),
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
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: sw(18) }]}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH * 0.9 + 12}
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.9}
            onPress={() => onPress?.(banner)}
            style={[
              styles.banner,
              {
                width: SCREEN_WIDTH * 0.9,
                height: sh(180),
                borderRadius: radius.hero,
                overflow: 'hidden',
              },
              shadows.lg,
            ]}
          >
            <Image
              source={{ uri: banner.image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
              <View style={styles.content}>
                <Text style={[typography.headingXL, styles.title, { color: '#FFFFFF', fontSize: sf(24) }]}>
                  {banner.title}
                </Text>
                <Text style={[typography.body, styles.subtitle, { color: 'rgba(255,255,255,0.9)', fontSize: sf(13) }]}>
                  {banner.subtitle}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
