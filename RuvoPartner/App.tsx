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

// Wrap fetch before any provider gets the chance to fire its first request.
installNetworkMonitor();

export default function App() {
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
