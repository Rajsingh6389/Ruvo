import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 20,
  tint = 'light',
}) => {
  const { colors, radius } = useTheme();
  const { sw } = useResponsive();

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[
        styles.container,
        {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          borderRadius: radius.card,
          borderWidth: 1,
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
