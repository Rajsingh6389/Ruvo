import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { ROUTES } from '../constants/routes';

// ─── Auth Screens ──────────────────────────────────────────
import { SplashScreen }    from '../screens/SplashScreen';
import { LoginScreen }     from '../screens/LoginScreen';
import { RegisterScreen }  from '../screens/RegisterScreen';

// ─── Tab Screens ───────────────────────────────────────────
import { HomeScreen }        from '../screens/home/HomeScreen';
import { NearbyShopsScreen } from '../screens/marketplace/NearbyShopsScreen';
import { ProfileScreen }     from '../screens/profile/ProfileScreen';

// ─── Stack Screens ─────────────────────────────────────────
import { GroceriesScreen }     from '../screens/grocery/GroceriesScreen';
import { ShopDetailsScreen }   from '../screens/marketplace/ShopDetailsScreen';
import { ProductDetailsScreen } from '../screens/marketplace/ProductDetailsScreen';
import { RegisterShopScreen }  from '../screens/marketplace/RegisterShopScreen';
import { MyShopsScreen }       from '../screens/marketplace/MyShopsScreen';
import { AddProductScreen }    from '../screens/marketplace/AddProductScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';

// ─── Coming Soon placeholder ────────────────────────────────
const ComingSoonScreen = () => (
  <View style={css.center}>
    <Text style={css.emoji}>🚧</Text>
    <Text style={css.title}>Coming Soon</Text>
    <Text style={css.sub}>This feature is under active development.</Text>
  </View>
);
const css = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  emoji:  { fontSize: 48, marginBottom: 12 },
  title:  { fontSize: 22, fontWeight: '700', color: '#212121' },
  sub:    { fontSize: 14, color: '#757575', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { focused: IoniconName; outline: IoniconName }> = {
  [ROUTES.HOME]:    { focused: 'home',         outline: 'home-outline' },
  [ROUTES.MARKET]:  { focused: 'storefront',   outline: 'storefront-outline' },
  [ROUTES.PROFILE]: { focused: 'person-circle', outline: 'person-circle-outline' },
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E0E0E0',
        borderTopWidth: 1,
        height: 62,
        paddingBottom: 8,
        paddingTop: 6,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      tabBarActiveTintColor: '#2E7D32',
      tabBarInactiveTintColor: '#9E9E9E',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      tabBarIcon: ({ focused, color, size }) => {
        const icons = TAB_ICONS[route.name];
        const iconName = focused ? icons.focused : icons.outline;
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name={ROUTES.HOME}    component={HomeScreen}        options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen name={ROUTES.MARKET}  component={NearbyShopsScreen} options={{ tabBarLabel: 'Shops' }} />
    <Tab.Screen name={ROUTES.PROFILE} component={ProfileScreen}     options={{ tabBarLabel: 'Account' }} />
  </Tab.Navigator>
);

interface AppNavigatorProps {
  theme: Theme;
}

export const AppNavigator = ({ theme }: AppNavigatorProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name={ROUTES.SPLASH} component={SplashScreen} />
            <Stack.Screen name={ROUTES.LOGIN}  component={LoginScreen} />
            <Stack.Screen name={ROUTES.SIGNUP} component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name={ROUTES.MAIN_TABS}      component={MainTabs} />
            <Stack.Screen name={ROUTES.GROCERIES}      component={GroceriesScreen} />
            <Stack.Screen name={ROUTES.JOBS}           component={ComingSoonScreen} />
            <Stack.Screen name={ROUTES.NEARBY_SHOPS}   component={NearbyShopsScreen} />
            <Stack.Screen name={ROUTES.SHOP_DETAILS}   component={ShopDetailsScreen} />
            <Stack.Screen name={ROUTES.PRODUCT_DETAILS} component={ProductDetailsScreen} />
            <Stack.Screen name={ROUTES.REGISTER_SHOP}  component={RegisterShopScreen} />
            <Stack.Screen name={ROUTES.MY_SHOPS}       component={MyShopsScreen} />
            <Stack.Screen name={ROUTES.ADD_PRODUCT}    component={AddProductScreen} />
            <Stack.Screen name={ROUTES.EDIT_PROFILE}   component={ComingSoonScreen} />
            <Stack.Screen name={ROUTES.ADMIN_DASHBOARD} component={AdminDashboardScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};



