import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { ROUTES } from '../constants/routes';

export const SplashScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  useEffect(() => {
    // Navigate to Login automatically after 2 seconds
    const timer = setTimeout(() => {
      navigation.replace(ROUTES.LOGIN);
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <Text style={styles.text}>RUVO</Text>
      <Text style={styles.subText}>One App for Every Village</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  text: { 
    fontSize: 56, 
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subText: { 
    fontSize: 18, 
    marginTop: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500'
  }
});

