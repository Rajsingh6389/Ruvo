import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { DarkTheme, LightTheme } from './theme/theme';
import { LoginScreen } from './screens/LoginScreen';
import { MyShopsScreen } from './screens/marketplace/MyShopsScreen';
import { RegisterShopScreen } from './screens/marketplace/RegisterShopScreen';
import ShopkeeperDashboardScreen from './screens/marketplace/ShopkeeperDashboardScreen';
import ShopOrdersScreen from './screens/marketplace/ShopOrdersScreen';
import { MyProductsScreen } from './screens/marketplace/MyProductsScreen';
import { AddProductScreen } from './screens/marketplace/AddProductScreen';
import { EditProductScreen } from './screens/marketplace/EditProductScreen';
import DeliveryPartnerAssignmentScreen from './screens/marketplace/DeliveryPartnerAssignmentScreen';

const Stack = createNativeStackNavigator();
export const ShopNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { navColors, theme } = useTheme();
  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /><Text>Loading Ruvo Shop…</Text></View>;
  return <NavigationContainer theme={theme === 'dark' ? DarkTheme : LightTheme}><Stack.Navigator screenOptions={{ headerShown: false }}>
    {!isAuthenticated ? <Stack.Screen name="Login" component={LoginScreen as any} /> : <>
      <Stack.Screen name="MyShops" component={MyShopsScreen} />
      <Stack.Screen name="RegisterShop" component={RegisterShopScreen} />
      <Stack.Screen name="ShopkeeperDashboard" component={ShopkeeperDashboardScreen} />
      <Stack.Screen name="ShopOrders" component={ShopOrdersScreen} />
      <Stack.Screen name="MyProducts" component={MyProductsScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="EditProduct" component={EditProductScreen} />
      <Stack.Screen name="DeliveryPartnerAssignment" component={DeliveryPartnerAssignmentScreen} />
    </>}
  </Stack.Navigator></NavigationContainer>;
};
