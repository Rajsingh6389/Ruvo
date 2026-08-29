/**
 * RuvoModal — Universal Modal Component
 * 
 * Premium modal dialogs with animations
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
  RuvoSpringConfig,
} from '../tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type RuvoModalSize = 'small' | 'medium' | 'large' | 'full';

export interface RuvoModalProps {
  /** Modal visibility */
  visible: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size */
  size?: RuvoModalSize;
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on backdrop press */
  closeOnBackdrop?: boolean;
  /** Custom modal style */
  modalStyle?: ViewStyle;
  /** Custom content style */
  contentStyle?: ViewStyle;
}

export const RuvoModal: React.FC<RuvoModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdrop = true,
  modalStyle,
  contentStyle,
}) => {
  const insets = useSafeAreaInsets();
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          ...RuvoSpringConfig.smooth,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropAnim, slideAnim]);

  // Size configurations
  const sizeConfig = {
    small: { maxHeight: SCREEN_HEIGHT * 0.4 },
    medium: { maxHeight: SCREEN_HEIGHT * 0.6 },
    large: { maxHeight: SCREEN_HEIGHT * 0.8 },
    full: { maxHeight: SCREEN_HEIGHT - insets.top - insets.bottom - 32 },
  };

  const config = sizeConfig[size];

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modalContainer,
            config,
            {
              transform: [{ translateY: slideAnim }],
              marginBottom: insets.bottom || 16,
            },
            modalStyle,
          ]}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.closeButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={RuvoQuickColors.textPrimary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * RuvoConfirmModal — Confirmation dialog
 */
export interface RuvoConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'default' | 'danger';
}

export const RuvoConfirmModal: React.FC<RuvoConfirmModalProps> = ({
  visible,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <RuvoModal
      visible={visible}
      onClose={onClose}
      title={title}
      size="small"
      closeOnBackdrop={false}
    >
      <View style={styles.confirmContent}>
        <Text style={styles.confirmMessage}>{message}</Text>
        <View style={styles.confirmActions}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.confirmButton, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            style={[
              styles.confirmButton,
              variant === 'danger' ? styles.dangerButton : styles.primaryButton,
            ]}
          >
            <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RuvoModal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderTopLeftRadius: RuvoSemanticRadius.modal,
    borderTopRightRadius: RuvoSemanticRadius.modal,
    marginHorizontal: 0,
    ...RuvoSemanticShadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: RuvoSemanticSpacing.screenPaddingX,
    paddingVertical: RuvoSemanticSpacing.screenPaddingY,
    borderBottomWidth: 1,
    borderBottomColor: RuvoQuickColors.borderLight,
  },
  title: {
    ...RuvoTypography.h4,
    color: RuvoQuickColors.textPrimary,
    flex: 1,
  },
  closeButton: {
    marginLeft: 16,
  },
  content: {
    paddingHorizontal: RuvoSemanticSpacing.screenPaddingX,
    paddingVertical: RuvoSemanticSpacing.screenPaddingY,
  },
  confirmContent: {
    paddingVertical: 8,
  },
  confirmMessage: {
    ...RuvoTypography.body,
    color: RuvoQuickColors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: RuvoSemanticRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: RuvoQuickColors.bgSecondary,
  },
  primaryButton: {
    backgroundColor: RuvoQuickColors.primary,
  },
  dangerButton: {
    backgroundColor: RuvoQuickColors.error,
  },
  cancelButtonText: {
    ...RuvoTypography.buttonMedium,
    color: RuvoQuickColors.textPrimary,
  },
  confirmButtonText: {
    ...RuvoTypography.buttonMedium,
    color: RuvoQuickColors.textPrimary,
  },
});
