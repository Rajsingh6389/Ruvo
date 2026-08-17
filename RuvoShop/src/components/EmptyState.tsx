import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState = ({ title, description, actionTitle, onAction, icon }: EmptyStateProps) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
        {icon ? icon : <Text style={{ fontSize: 40 }}>📭</Text>}
      </View>
      <Text style={[typography.headingM, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }]}>
        {description}
      </Text>
      {actionTitle && onAction && (
        <Button title={actionTitle} onPress={onAction} style={styles.button} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  button: {
    minWidth: 160,
  },
});

