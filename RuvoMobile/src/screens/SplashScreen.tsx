import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ROUTES } from '../constants/routes';
import { RuvoLaunchScreen } from '../components/launch/RuvoLaunchScreen';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <RuvoLaunchScreen
      roleSubtitle="LOCAL • CONNECTED • MOVING"
      onFinish={() => {
        navigation.replace(ROUTES.LOGIN);
      }}
    />
  );
};