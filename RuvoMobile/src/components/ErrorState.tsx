import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export const ErrorState = ({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) => {
  const { colors, typography, spacing } = useTheme()
  return (
    <View style={[styles.container, { padding: spacing.xl }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
        <Text style={{ fontSize: 40 }}>⚠️</Text>
      </View>
      <Text style={[typography.headingS, { color: colors.textPrimary, marginTop: spacing.md }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md }]}>
        {message}
      </Text>
      <Button variant="outline" title="Try Again" onPress={onRetry} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

