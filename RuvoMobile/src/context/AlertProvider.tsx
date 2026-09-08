import React, { useEffect, useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, Alert as RNAlert, Modal } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type ButtonConfig = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

interface AlertConfig {
  title: string;
  message?: string;
  buttons?: ButtonConfig[];
}

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  useEffect(() => {
    // Intercept standard React Native Alert.alert globally
    const originalAlert = RNAlert.alert;
    RNAlert.alert = (title: string, message?: string, buttons?: any) => {
      const defaultButtons = [{ text: 'OK', onPress: () => {} }];
      setConfig({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : defaultButtons,
      });
      setVisible(true);
    };

    // Cleanup technically not strictly required since it's an app-level singleton, but good practice
    return () => {
      RNAlert.alert = originalAlert;
    };
  }, []);

  const closeAlert = () => setVisible(false);

  const handlePress = (button: ButtonConfig) => {
    closeAlert();
    if (button.onPress) {
      setTimeout(() => button.onPress!(), 200); // slight delay allowing animation to exit
    }
  };

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={closeAlert}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          className="flex-1 bg-ruvo-ink/60 justify-center items-center px-6"
        >
          <Animated.View
            entering={ZoomIn.duration(400).springify()}
            exiting={ZoomOut.duration(200)}
            className="w-full bg-white rounded-3xl p-6 shadow-2xl items-center"
            style={{ elevation: 15, shadowColor: '#F5B700', shadowOpacity: 0.15, shadowRadius: 20 }}
          >
            {/* Icon */}
            <View className="w-16 h-16 bg-ruvo-yellow-soft rounded-full items-center justify-center mb-4 border-4 border-orange-50">
              <Ionicons name="notifications" size={28} color="#D99B00" />
            </View>

            {/* Texts */}
            <Text className="text-xl font-extrabold text-ruvo-ink text-center mb-2">
              {config?.title}
            </Text>
            {config?.message ? (
              <Text className="text-sm font-medium text-gray-500 text-center mb-6 leading-5 px-2">
                {config.message}
              </Text>
            ) : null}

            {/* Buttons */}
            <View className="w-full gap-3 mt-2">
              {config?.buttons?.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel';
                const isPrimary = !isDestructive && !isCancel;

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => handlePress(btn)}
                    className={`w-full py-4 rounded-xl items-center flex-row justify-center gap-2 ${
                      isDestructive ? 'bg-red-50 border border-red-200' :
                      isCancel ? 'bg-gray-100' :
                      'bg-ruvo-yellow shadow-md'
                    }`}
                  >
                    {isDestructive ? (
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    ) : null}
                    <Text className={`text-base font-bold tracking-wide ${
                      isDestructive ? 'text-red-600' :
                      isCancel ? 'text-gray-600' :
                      'text-ruvo-ink'
                    }`}>
                      {btn.text || 'Confirm'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
};
