import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './global.css';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LightTheme, DarkTheme } from './src/theme/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { DeliveryLocationProvider } from './src/context/DeliveryLocationContext';
import { ToastProvider } from './src/context/ToastContext';
import { AlertProvider } from './src/context/AlertProvider';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

function MainApp() {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? colors.background : '#FFFFFF'}
      />
      <AppNavigator theme={isDark ? DarkTheme : LightTheme} />
    </>
  );
}

import * as ExpoSplashScreen from 'expo-splash-screen';

function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  const [timeoutPassed, setTimeoutPassed] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setTimeoutPassed(true);
      ExpoSplashScreen.hideAsync().catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      ExpoSplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && !timeoutPassed) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AlertProvider>
            <ToastProvider>
              <DeliveryLocationProvider>
                <CartProvider>
                  <MainApp />
                </CartProvider>
              </DeliveryLocationProvider>
            </ToastProvider>
          </AlertProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
