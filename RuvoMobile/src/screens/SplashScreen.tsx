// import React, { useEffect } from 'react';
// import { View, Text, StyleSheet, StatusBar } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import { useTheme } from '../context/ThemeContext';
// import { RootStackParamList } from '../types/navigation';
// import { ROUTES } from '../constants/routes';

// export const SplashScreen = () => {
//   const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
//   const { colors } = useTheme();

//   useEffect(() => {
//     // Navigate to Login automatically after 2 seconds
//     const timer = setTimeout(() => {
//       navigation.replace(ROUTES.LOGIN);
//     }, 2000);
//     return () => clearTimeout(timer);
//   }, [navigation]);

//   return (
//     <View style={[styles.container, { backgroundColor: colors.primary }]}>
//       <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
//       <Text style={styles.text}>RUVO</Text>
//       <Text style={styles.subText}>One App for Every Village</Text>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { 
//     flex: 1, 
//     justifyContent: 'center', 
//     alignItems: 'center' 
//   },
//   text: { 
//     fontSize: 56, 
//     fontWeight: '900',
//     color: '#FFFFFF',
//     letterSpacing: 2,
//   },
//   subText: { 
//     fontSize: 18, 
//     marginTop: 12,
//     color: '#FFFFFF',
//     opacity: 0.9,
//     fontWeight: '500'
//   }
// });


import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { ROUTES } from '../constants/routes';

export const SplashScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  // Purely visual entrance animation — does not affect the navigation timer below.
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

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

      <Animated.View
        style={[
          styles.content,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <View style={styles.iconBadge}>
          <Ionicons name="storefront-outline" size={34} color="#FFFFFF" />
        </View>

        <Text style={styles.text}>RUVO</Text>
        <Text style={styles.subText}>One App for Every Village</Text>
      </Animated.View>

      <View style={styles.loaderWrap}>
        <ActivityIndicator size="small" color="#FFFFFF" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
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
    fontWeight: '500',
  },
  loaderWrap: {
    position: 'absolute',
    bottom: 64,
    opacity: 0.85,
  },
});
