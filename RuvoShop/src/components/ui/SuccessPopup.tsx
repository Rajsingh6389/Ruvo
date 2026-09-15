import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withDelay, 
  withSequence,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface SuccessPopupProps {
  visible: boolean;
  message?: string;
  onAnimationComplete?: () => void;
}

export const SuccessPopup = ({ 
  visible, 
  message = "Successfully Saved!", 
  onAnimationComplete 
}: SuccessPopupProps) => {
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // 1. Fade in backdrop
      backdropOpacity.value = withTiming(1, { duration: 300 });
      // 2. Spring up the main container
      scale.value = withSpring(1, { damping: 14, stiffness: 100 });
      // 3. Spring the checkmark inside after a tiny delay
      checkScale.value = withDelay(
        200, 
        withSpring(1, { damping: 12, stiffness: 120 }, (isFinished) => {
          if (isFinished && onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        })
      );
    } else {
      // Reset
      backdropOpacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0, { duration: 200 });
      checkScale.value = 0;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View 
      style={[StyleSheet.absoluteFill, styles.overlay, backdropStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View style={[styles.popupCard, containerStyle]}>
        {/* Animated Checkmark Circle */}
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Ionicons name="checkmark" size={54} color="#FFF" />
        </Animated.View>
        
        {/* Animated Text */}
        <Text style={styles.titleText}>Success!</Text>
        <Text style={styles.messageText}>{message}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981', // Emerald 500
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  titleText: {
    fontSize: 28,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#111827',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#6B7280',
    textAlign: 'center',
  }
});
