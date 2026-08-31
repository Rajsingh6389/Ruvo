import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RuvoButton } from './RuvoButton';

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
  const displayMessage = message || subtitle || 'We encountered an error while loading. Please try again.';
  return (
    <View className="flex-1 items-center justify-center px-lg py-3xl">
      {/* Icon */}
      <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-xl">
        <Ionicons name="alert-circle" size={40} color="#DC2626" />
      </View>

      {/* Title */}
      <Text className="text-xl font-bold text-ruvo-ink text-center mb-sm">
        {title}
      </Text>

      {/* Message */}
      <Text className="text-base text-warm-600 text-center mb-2xl">
        {message}
      </Text>

      {/* Actions */}
      <View className="gap-md w-full">
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
