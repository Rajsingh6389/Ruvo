import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LightTheme, DarkTheme } from './src/theme/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { DeliveryLocationProvider } from './src/context/DeliveryLocationContext';
import { ToastProvider } from './src/context/ToastContext';

function AppContent() {
  const { theme } = useTheme();
  return (
    <AuthProvider>
        <ToastProvider>
          <DeliveryLocationProvider>
            <CartProvider>
              <SafeAreaProvider>
                <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
                <AppNavigator theme={theme === 'dark' ? DarkTheme : LightTheme} />
              </SafeAreaProvider>
            </CartProvider>
          </DeliveryLocationProvider>
        </ToastProvider>
    </AuthProvider>
  );
}

function App() { return <ThemeProvider><AppContent /></ThemeProvider>; }

export default App;
