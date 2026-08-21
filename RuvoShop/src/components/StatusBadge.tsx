import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type StatusType = 
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'active'
  | 'inactive'
  | 'delivered'
  | 'primary';

interface StatusBadgeProps {
  status: string | StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showDot = true,
  style,
}) => {
  const { colors } = useTheme();

  const getStatusColor = (): { bg: string; text: string; dot: string } => {
    const s = String(status).toLowerCase();
    
    if (s.includes('delivered') || s.includes('completed') || s.includes('approved') || s === 'success' || s === 'active' || s === 'in_stock') {
      return { bg: '#E8F5E9', text: '#2E7D32', dot: '#4CAF50' };
    }
    if (s.includes('pending') || s.includes('processing') || s.includes('preparing') || s === 'warning' || s === 'low_stock') {
      return { bg: '#FFF8E1', text: '#B78103', dot: '#FFB300' };
    }
    if (s.includes('cancel') || s.includes('reject') || s === 'error' || s === 'out_of_stock' || s === 'inactive') {
      return { bg: '#FFEBEE', text: '#C62828', dot: '#EF5350' };
    }
    if (s.includes('shipped') || s.includes('out_for_delivery') || s.includes('accepted') || s === 'info' || s === 'ready') {
      return { bg: '#E3F2FD', text: '#1565C0', dot: '#2196F3' };
    }
    return { bg: '#E8F5E9', text: colors.primary, dot: colors.primaryLight || '#4CAF50' };
  };

  const palette = getStatusColor();
  const displayLabel = label || String(status).replace(/_/g, ' ').toUpperCase();

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          paddingHorizontal: isSmall ? 8 : isLarge ? 14 : 10,
          paddingVertical: isSmall ? 3 : isLarge ? 6 : 4,
          borderRadius: 20,
        },
        style,
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: palette.dot,
              width: isSmall ? 5 : 7,
              height: isSmall ? 5 : 7,
              marginRight: isSmall ? 4 : 6,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: palette.text,
            fontSize: isSmall ? 10 : isLarge ? 13 : 11,
            fontWeight: '700',
          },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    borderRadius: 50,
  },
  text: {
    letterSpacing: 0.4,
  },
});
