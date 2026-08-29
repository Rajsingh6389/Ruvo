import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
  safeArea?: boolean;
}

export const Layout = ({ children, noPadding = false, safeArea = true }: LayoutProps) => {
  const { colors } = useTheme();

  const Container = safeArea ? SafeAreaView : View;

  return (
    <Container style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, !noPadding && styles.padding]}>
        {children}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: 16,
  },
});

