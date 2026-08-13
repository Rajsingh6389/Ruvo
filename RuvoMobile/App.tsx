import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LightTheme } from './src/theme/theme';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CartProvider>
          <SafeAreaProvider>
            <StatusBar barStyle="dark-content" />
            <AppNavigator theme={LightTheme} />
          </SafeAreaProvider>
        </CartProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
