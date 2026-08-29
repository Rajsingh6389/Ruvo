/**
 * RuvoImageCard — Universal Image Card Component
 * 
 * Premium image cards for products, shops, banners
 */

import React from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
} from '../tokens';

export type RuvoImageCardAspectRatio = '1:1' | '4:3' | '16:9' | '3:2';

export interface RuvoImageCardProps {
  /** Image source URI */
  imageUri: string;
  /** Image aspect ratio */
  aspectRatio?: RuvoImageCardAspectRatio;
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Price text */
  price?: string;
  /** Original price (for discount display) */
  originalPrice?: string;
  /** Badge text */
  badge?: string;
  /** Badge variant */
  badgeVariant?: 'primary' | 'success' | 'error' | 'warning';
  /** Show favorite button */
  showFavorite?: boolean;
  /** Favorite state */
  isFavorite?: boolean;
  /** Favorite toggle handler */
  onFavoritePress?: () => void;
  /** Card press handler */
  onPress?: () => void;
  /** Show shadow */
  showShadow?: boolean;
  /** Container style */
  style?: ViewStyle;
}

export const RuvoImageCard: React.FC<RuvoImageCardProps> = ({
  imageUri,
  aspectRatio = '1:1',
  title,
  subtitle,
  price,
  originalPrice,
  badge,
  badgeVariant = 'primary',
  showFavorite = false,
  isFavorite = false,
  onFavoritePress,
  onPress,
  showShadow = true,
  style,
}) => {
  // Aspect ratio values
  const aspectRatioValues = {
    '1:1': 1,
    '4:3': 4 / 3,
    '16:9': 16 / 9,
    '3:2': 3 / 2,
  };

  // Badge colors
  const badgeColors = {
    primary: { bg: RuvoQuickColors.primary, text: RuvoQuickColors.textPrimary },
    success: { bg: RuvoQuickColors.success, text: '#FFFFFF' },
    error: { bg: RuvoQuickColors.error, text: '#FFFFFF' },
    warning: { bg: '#F59E0B', text: '#FFFFFF' },
  };

  const badgeStyle = badgeColors[badgeVariant];

  const content = (
    <View
      style={[
        styles.card,
        showShadow && RuvoSemanticShadows.card,
        style,
      ]}
    >
      {/* Image Container */}
      <View
        style={[
          styles.imageContainer,
          { aspectRatio: aspectRatioValues[aspectRatio] },
        ]}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Overlay Gradient */}
        {(badge || showFavorite) && (
          <View style={styles.overlay} />
        )}

        {/* Badge */}
        {badge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeStyle.bg },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: badgeStyle.text },
              ]}
            >
              {badge}
            </Text>
          </View>
        )}

        {/* Favorite Button */}
        {showFavorite && (
          <TouchableOpacity
            onPress={onFavoritePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.favoriteButton}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? RuvoQuickColors.error : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {(title || subtitle || price) && (
        <View style={styles.content}>
          {/* Title */}
          {title && (
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          )}

          {/* Subtitle */}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          {/* Price */}
          {price && (
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{price}</Text>
              {originalPrice && (
                <Text style={styles.originalPrice}>{originalPrice}</Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

/**
 * RuvoHorizontalCard — Horizontal image card variant
 */
export interface RuvoHorizontalCardProps {
  imageUri: string;
  title: string;
  subtitle?: string;
  price?: string;
  originalPrice?: string;
  badge?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const RuvoHorizontalCard: React.FC<RuvoHorizontalCardProps> = ({
  imageUri,
  title,
  subtitle,
  price,
  originalPrice,
  badge,
  onPress,
  style,
}) => {
  const content = (
    <View style={[styles.horizontalCard, style]}>
      {/* Image */}
      <View style={styles.horizontalImage}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />
        {badge && (
          <View style={styles.horizontalBadge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.horizontalContent}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {price && (
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{price}</Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>{originalPrice}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderRadius: RuvoSemanticRadius.card,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: RuvoQuickColors.bgSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    ...RuvoTypography.overline,
    fontSize: 11,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 12,
  },
  title: {
    ...RuvoTypography.bodyMedium,
    color: RuvoQuickColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    ...RuvoTypography.captionSmall,
    color: RuvoQuickColors.textSecondary,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    ...RuvoTypography.h5,
    color: RuvoQuickColors.primary,
  },
  originalPrice: {
    ...RuvoTypography.captionSmall,
    color: RuvoQuickColors.textTertiary,
    textDecorationLine: 'line-through',
  },
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderRadius: RuvoSemanticRadius.card,
    overflow: 'hidden',
    ...RuvoSemanticShadows.card,
  },
  horizontalImage: {
    width: 100,
    height: 100,
    backgroundColor: RuvoQuickColors.bgSecondary,
    position: 'relative',
  },
  horizontalBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: RuvoQuickColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  horizontalContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
});
