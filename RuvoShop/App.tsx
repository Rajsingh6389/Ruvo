import React from 'react';
import './global.css';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { ShopNavigator } from './src/ShopNavigator';
import { installNetworkMonitor } from './src/hooks/useNetworkStatus';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AnimatedAlertProvider } from './src/components/AnimatedAlertProvider';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

// Wrap fetch before any provider gets the chance to fire its first request.
installNetworkMonitor();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <AnimatedAlertProvider>
        <AuthProvider requiredRole="SHOP_OWNER">
          <ThemeProvider>
            <ToastProvider>
              <SafeAreaProvider>
                <StatusBar barStyle="dark-content" />
                <ShopNavigator />
              </SafeAreaProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </AnimatedAlertProvider>
    </ErrorBoundary>
  );
}
