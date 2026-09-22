import React from 'react';
// @ts-ignore
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
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  const [timeoutPassed, setTimeoutPassed] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutPassed(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError && !timeoutPassed) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AnimatedAlertProvider>
          <AuthProvider requiredRole="SHOP_OWNER">
            <ThemeProvider>
              <ToastProvider>
                <StatusBar barStyle="dark-content" />
                <ShopNavigator />
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>
        </AnimatedAlertProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
