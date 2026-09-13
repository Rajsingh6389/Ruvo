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

function MainApp() {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? colors.background : '#FFFFFF'}
      />
      <AppNavigator theme={isDark ? DarkTheme : LightTheme} />
    </SafeAreaProvider>
  );
}

function App() {
  return (
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
  );
}

export default App;
