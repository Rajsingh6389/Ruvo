import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, AlertButton } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

export const AnimatedAlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<{ title: string; message?: string; buttons?: AlertButton[] } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const original = Alert.alert;
    Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
      // Overriding standard alert
      setData({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] });
      setVisible(true);
    };
    return () => {
      Alert.alert = original;
    };
  }, []);

  const close = () => setVisible(false);

  const handlePress = (btn: AlertButton) => {
    close();
    setTimeout(() => {
      setData(null);
      if (btn.onPress) btn.onPress();
    }, 250); // allow exiting animation to gracefully complete
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      {visible && data && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <Animated.View 
            entering={FadeIn.duration(200)} 
            exiting={FadeOut.duration(200)} 
            className="flex-1 bg-black/60 items-center justify-center px-8"
          >
            <Animated.View 
              entering={ZoomIn.duration(200)} 
              exiting={ZoomOut.duration(200)} 
              className="w-full max-w-sm bg-white rounded-3xl overflow-hidden p-6"
            >
              <Text className="text-xl font-extrabold text-ruvo-ink mb-1 text-center">{data.title}</Text>
              {data.message && (
                <Text className="text-base text-gray-600 mb-6 text-center leading-5">{data.message}</Text>
              )}
              
              <View className={`flex-row ${data.buttons && data.buttons.length > 2 ? 'flex-col' : 'gap-4'}`}>
                {data.buttons?.map((btn, i) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handlePress(btn)}
                      className={`flex-1 py-4 rounded-xl items-center justify-center ${
                        isDestructive ? 'bg-red-50' : isCancel ? 'bg-gray-100' : 'bg-ruvo-accent'
                      }`}
                      style={data.buttons && data.buttons.length > 2 ? { marginBottom: 8 } : {}}
                    >
                      <Text className={`font-extrabold text-base ${
                        isDestructive ? 'text-red-600' : isCancel ? 'text-gray-700' : 'text-white'
                      }`}>{btn.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      )}
    </View>
  );
};
