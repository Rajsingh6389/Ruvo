import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RuvoButton } from './RuvoButton';
import { useTheme } from '../../context/ThemeContext';

interface ErrorStateProps {
  title?: string;
  message?: string;
  subtitle?: string;
  onRetry: () => void;
  onDismiss?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  subtitle,
  onRetry,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const displayMessage = message || subtitle || 'We encountered an error while loading. Please try again.';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
      {/* Icon */}
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#DC262615', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name="alert-circle" size={40} color="#DC2626" />
      </View>

      {/* Title */}
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>

      {/* Message */}
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
        {displayMessage}
      </Text>

      {/* Actions */}
      <View style={{ width: '100%', gap: 12 }}>
        <RuvoButton
          label="Try Again"
          onPress={onRetry}
          variant="primary"
          size="md"
          fullWidth
        />

        {onDismiss && (
          <RuvoButton
            label="Dismiss"
            onPress={onDismiss}
            variant="secondary"
            size="md"
            fullWidth
          />
        )}
      </View>
    </View>
  );
};
