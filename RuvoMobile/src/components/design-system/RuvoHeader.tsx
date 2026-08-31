import React from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface RuvoHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  subtitle?: string;
}

export const RuvoHeader: React.FC<RuvoHeaderProps> = ({
  title,
  showBackButton = false,
  rightAction,
  subtitle,
}) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="bg-ruvo-surface">
      <View className="ruvo-header">
        {showBackButton ? (
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-12 h-12 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#231C10" />
          </Pressable>
        ) : (
          <View className="w-12" />
        )}

        <View className="flex-1 ml-md">
          <Text className="ruvo-header-title">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs text-warm-600 text-center mt-xs">
              {subtitle}
            </Text>
          )}
        </View>

        {rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            className="w-12 h-12 items-center justify-center"
          >
            <Ionicons name={rightAction.icon as any} size={24} color="#F5B700" />
          </Pressable>
        ) : (
          <View className="w-12" />
        )}
      </View>
    </SafeAreaView>
  );
};
