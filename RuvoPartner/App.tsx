import React from 'react';
import './global.css';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { installNetworkMonitor } from './src/hooks/useNetworkStatus';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import { ToastProvider } from './src/context/ToastContext';
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
        <ThemeProvider>
          <ToastProvider>
            <AnimatedAlertProvider>
              <AuthProvider>
                <AppNavigator />
                <StatusBar style="auto" />
              </AuthProvider>
            </AnimatedAlertProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
