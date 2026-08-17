import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { ShopNavigator } from './src/ShopNavigator';

export default function App() {
  return <AuthProvider requiredRole="SHOP_OWNER"><ThemeProvider><ToastProvider><SafeAreaProvider>
    <StatusBar barStyle="dark-content" />
    <ShopNavigator />
  </SafeAreaProvider></ToastProvider></ThemeProvider></AuthProvider>;
}
