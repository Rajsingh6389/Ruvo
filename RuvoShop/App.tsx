import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { ShopNavigator } from './src/ShopNavigator';
import { installNetworkMonitor } from './src/hooks/useNetworkStatus';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Wrap fetch before any provider gets the chance to fire its first request.
installNetworkMonitor();

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
