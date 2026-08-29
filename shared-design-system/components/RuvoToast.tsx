/**
 * RuvoToast — Universal Toast Notifications
 * 
 * Premium toast notifications with animations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
} from '../tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type RuvoToastVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';
export type RuvoToastPosition = 'top' | 'bottom';

export interface RuvoToastProps {
  /** Toast message */
  message: string;
  /** Toast variant */
  variant?: RuvoToastVariant;
  /** Toast position */
  position?: RuvoToastPosition;
  /** Duration in ms (0 for infinite) */
  duration?: number;
  /** Show close button */
  showClose?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Action button label */
  actionLabel?: string;
  /** Action handler */
  onAction?: () => void;
}

export const RuvoToast: React.FC<RuvoToastProps> = ({
  message,
  variant = 'neutral',
  position = 'top',
  duration = 3000,
  showClose = true,
  onClose,
  actionLabel,
  onAction,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Enter animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    if (duration > 0) {
      const timeout = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timeout);
    }
  }, [duration, translateY, opacity]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  // Variant configurations
  const variantConfig = {
    success: {
      icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
      backgroundColor: RuvoQuickColors.success,
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
    },
    error: {
      icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
      backgroundColor: RuvoQuickColors.error,
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
    },
    warning: {
      icon: 'warning' as keyof typeof Ionicons.glyphMap,
      backgroundColor: '#F59E0B',
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
    },
    info: {
      icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
      backgroundColor: RuvoQuickColors.info,
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
    },
    neutral: {
      icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
      backgroundColor: RuvoQuickColors.textPrimary,
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
    },
  };

  const config = variantConfig[variant];

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top'
          ? { top: insets.top + 16 }
          : { bottom: insets.bottom + 16 },
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: config.backgroundColor,
        },
        RuvoSemanticShadows.toast,
      ]}
    >
      {/* Icon */}
      <Ionicons
        name={config.icon}
        size={22}
        color={config.iconColor}
        style={styles.icon}
      />

      {/* Message */}
      <Text
        style={[styles.message, { color: config.textColor }]}
        numberOfLines={2}
      >
        {message}
      </Text>

      {/* Action Button */}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.actionButton}
        >
          <Text style={[styles.actionText, { color: config.textColor }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}

      {/* Close Button */}
      {showClose && (
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={18} color={config.iconColor} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

/**
 * RuvoToastManager — Toast queue manager (for multiple toasts)
 * Usage: Implement in your app's root component
 */
interface ToastItem extends RuvoToastProps {
  id: string;
}

interface RuvoToastManagerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const RuvoToastManager: React.FC<RuvoToastManagerProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <View style={styles.manager} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <View
          key={toast.id}
          style={[
            styles.toastWrapper,
            { zIndex: 9999 - index },
          ]}
          pointerEvents="box-none"
        >
          <RuvoToast
            {...toast}
            onClose={() => onDismiss(toast.id)}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: RuvoSemanticSpacing.screenPaddingX,
    right: RuvoSemanticSpacing.screenPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RuvoSemanticRadius.toast,
    maxWidth: SCREEN_WIDTH - 32,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    ...RuvoTypography.body,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionButton: {
    marginLeft: 12,
    paddingHorizontal: 8,
  },
  actionText: {
    ...RuvoTypography.labelSmall,
    fontWeight: '700',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  manager: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  toastWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
