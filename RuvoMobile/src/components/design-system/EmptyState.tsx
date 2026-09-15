import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RuvoButton } from './RuvoButton';
import { useTheme } from '../../context/ThemeContext';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search',
  title,
  subtitle,
  action,
}) => {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
      {/* Icon */}
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name={icon as any} size={40} color={colors.primary} />
      </View>

      {/* Title */}
      <Text style={{ fontSize: 18, fontFamily: 'Poppins_700Bold', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
          {subtitle}
        </Text>
      )}

      {/* Action Button */}
      {action && (
        <RuvoButton
          label={action.label}
          onPress={action.onPress}
          variant="primary"
          size="md"
        />
      )}
    </View>
  );
};
