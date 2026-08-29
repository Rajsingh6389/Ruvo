/**
 * RuvoBottomSheet — Universal Bottom Sheet Component
 * 
 * Premium draggable bottom sheets
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  ViewStyle,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
} from '../tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface RuvoBottomSheetProps {
  /** Sheet visibility */
  visible: boolean;
  /** Close handler */
  onClose: () => void;
  /** Sheet title */
  title?: string;
  /** Sheet content */
  children: React.ReactNode;
  /** Snap points (height percentages) */
  snapPoints?: number[];
  /** Initial snap point index */
  initialSnapIndex?: number;
  /** Show drag handle */
  showHandle?: boolean;
  /** Close on backdrop press */
  closeOnBackdrop?: boolean;
  /** Disable drag to close */
  disableDrag?: boolean;
  /** Custom sheet style */
  sheetStyle?: ViewStyle;
  /** Custom content style */
  contentStyle?: ViewStyle;
}

export const RuvoBottomSheet: React.FC<RuvoBottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
  initialSnapIndex = 0,
  showHandle = true,
  closeOnBackdrop = true,
  disableDrag = false,
  sheetStyle,
  contentStyle,
}) => {
  const insets = useSafeAreaInsets();
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const currentSnapIndex = useRef(initialSnapIndex);

  // Convert snap points to pixel values
  const snapPointsInPixels = snapPoints.map(point => SCREEN_HEIGHT * (1 - point));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: snapPointsInPixels[currentSnapIndex.current],
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropAnim, translateY, snapPointsInPixels]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disableDrag,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !disableDrag && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = snapPointsInPixels[currentSnapIndex.current] + gestureState.dy;
        if (newValue >= 0) {
          translateY.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = snapPointsInPixels[currentSnapIndex.current] + gestureState.dy;
        const velocity = gestureState.vy;

        // Close if dragged down significantly
        if (velocity > 1 || currentY > SCREEN_HEIGHT * 0.6) {
          onClose();
          return;
        }

        // Find nearest snap point
        let nearestSnapIndex = 0;
        let minDistance = Math.abs(currentY - snapPointsInPixels[0]);

        snapPointsInPixels.forEach((snapPoint, index) => {
          const distance = Math.abs(currentY - snapPoint);
          if (distance < minDistance) {
            minDistance = distance;
            nearestSnapIndex = index;
          }
        });

        currentSnapIndex.current = nearestSnapIndex;

        Animated.spring(translateY, {
          toValue: snapPointsInPixels[nearestSnapIndex],
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }).start();
      },
    }),
  ).current;

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
      <View style={styles.container}>
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

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              paddingBottom: insets.bottom || 16,
            },
            RuvoSemanticShadows.modal,
            sheetStyle,
          ]}
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          {/* Header */}
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: RuvoQuickColors.surfaceWhite,
    borderTopLeftRadius: RuvoSemanticRadius.modal,
    borderTopRightRadius: RuvoSemanticRadius.modal,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RuvoQuickColors.border,
  },
  header: {
    paddingHorizontal: RuvoSemanticSpacing.screenPaddingX,
    paddingVertical: RuvoSemanticSpacing.screenPaddingY,
    borderBottomWidth: 1,
    borderBottomColor: RuvoQuickColors.borderLight,
  },
  title: {
    ...RuvoTypography.h4,
    color: RuvoQuickColors.textPrimary,
  },
  content: {
    paddingHorizontal: RuvoSemanticSpacing.screenPaddingX,
    paddingTop: RuvoSemanticSpacing.screenPaddingY,
  },
});
