import React from 'react';
import { View, Text } from 'react-native';

type BadgeType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  type?: BadgeType;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  type = 'neutral',
  label,
  size = 'md',
}) => {
  const typeClasses = {
    success: 'bg-ruvo-accent-soft',
    warning: 'bg-yellow-100',
    error: 'bg-red-100',
    info: 'bg-blue-100',
    neutral: 'bg-warm-200',
  };

  const textColorClasses = {
    success: 'text-ruvo-accent',
    warning: 'text-ruvo-warning',
    error: 'text-ruvo-error',
    info: 'text-ruvo-info',
    neutral: 'text-warm-700',
  };

  const sizeClasses = {
    sm: 'px-xs py-2xs text-xs',
    md: 'px-sm py-xs text-sm',
    lg: 'px-md py-sm text-base',
  };

  return (
    <View className={`rounded-md inline-flex ${typeClasses[type]} ${sizeClasses[size]}`}>
      <Text className={`font-semibold ${textColorClasses[type]}`}>
        {label}
      </Text>
    </View>
  );
};

interface StatusBadgeProps {
  status: 'active' | 'pending' | 'completed' | 'cancelled' | 'failed';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusConfig = {
    active: { type: 'success' as BadgeType, label: 'Active' },
    pending: { type: 'warning' as BadgeType, label: 'Pending' },
    completed: { type: 'success' as BadgeType, label: 'Completed' },
    cancelled: { type: 'error' as BadgeType, label: 'Cancelled' },
    failed: { type: 'error' as BadgeType, label: 'Failed' },
  };

  const config = statusConfig[status];

  return <Badge type={config.type} label={config.label} />;
};
