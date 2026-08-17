import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button } from './Button';

interface Props {
  visible?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

export const ComingSoonModal = ({
  visible = true,
  onClose,
  inline = false,
}: Props) => {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const content = (
    <View
      style={
        inline
          ? [styles.inlineContainer, { backgroundColor: colors.background }]
          : styles.overlay
      }
    >
      <View
        style={[
          styles.dialog,
          {
            backgroundColor: isDark ? '#1B1E2D' : '#FFFFFF',
          },
        ]}
      >
        {/* Glow Circle */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🚀</Text>
        </View>

        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          Coming Soon
        </Text>

        <Text
          style={[
            styles.message,
            {
              color: isDark ? '#B8B8D2' : '#666',
            },
          ]}
        >
          We're building something amazing!
          {'\n\n'}
          This feature is currently under development and will be available in
          an upcoming update.
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>✨ Stay Tuned ✨</Text>
        </View>

        {onClose && (
          <Button
            title={inline ? 'Go Back' : 'Got it'}
            onPress={onClose}
            style={styles.button}
          />
        )}
      </View>
    </View>
  );

  if (inline) {
    return content;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8,10,20,0.75)',
    padding: 25,
  },

  dialog: {
    width: '100%',
    borderRadius: 30,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',

    shadowColor: '#6C63FF',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.35,
    shadowRadius: 30,

    elevation: 25,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#6C63FF',

    shadowColor: '#6C63FF',
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 18,

    marginBottom: 22,
  },

  icon: {
    fontSize: 44,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 5,
    marginBottom: 25,
  },

  badge: {
    backgroundColor: '#EEF0FF',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 30,
    marginBottom: 28,
  },

  badgeText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '700',
  },

  button: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 6,
  },
});

