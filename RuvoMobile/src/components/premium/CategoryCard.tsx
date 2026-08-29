import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';
import { PressableScale } from '../PressableScale';
import { CATEGORIES, getCategoryImage } from '../../assets/cloudinary/categories';

const CIRCLE_SIZE = 68;

interface CategoryCardProps {
  id: string;
  label: string;
  /** Override image URI */
  image?: string;
  /** Emoji fallback if no image found */
  emoji?: string;
  onPress?: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  id,
  label,
  image,
  emoji,
  onPress,
}) => {
  const { colors, typography } = useTheme();
  const { sf } = useResponsive();

  // Priority: explicit prop → CATEGORIES lookup by id → getCategoryImage by label
  const categoryData = CATEGORIES.find((c) => c.id === id);
  const imageUrl =
    image ||
    categoryData?.image ||
    getCategoryImage(label) ||
    null;

  return (
    <PressableScale onPress={onPress} style={styles.container} scaleTo={0.93}>
      {/* Circle */}
      <View
        style={[
          styles.circle,
          { backgroundColor: colors.surfaceSunken },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.circleImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: sf(28), lineHeight: CIRCLE_SIZE }}>
            {emoji ?? '🛍️'}
          </Text>
        )}
      </View>

      {/* Label */}
      <Text
        style={[
          typography.caption,
          styles.label,
          { color: colors.textPrimary, fontSize: sf(11) },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    width: CIRCLE_SIZE + 8,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2, // ← true circle
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
