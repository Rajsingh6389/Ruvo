import React from 'react';
import { View, StyleSheet, ViewProps, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, style, elevation = 'sm', onPress, ...props }: CardProps) => {
  const { colors, spacing, shadows } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: spacing.lg,
      ...shadows[elevation],
      borderWidth: elevation === 'none' ? 1 : 0,
      borderColor: colors.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    overflow: 'hidden',
  },
});
