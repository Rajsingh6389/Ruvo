import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { ROUTES } from '../constants/routes';

// ─── Auth Screens ──────────────────────────────────────────
import { SplashScreen }   from '../screens/SplashScreen';
import { LoginScreen }    from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

// ─── Tab Screens ───────────────────────────────────────────
import { HomeScreen }        from '../screens/home/HomeScreen';
import { NearbyShopsScreen } from '../screens/marketplace/NearbyShopsScreen';
import CartScreen            from '../screens/marketplace/CartScreen';
import { ProfileScreen }     from '../screens/profile/ProfileScreen';
import ComingSoonScreen      from '../screens/ComingSoonScreen';

// ─── Stack Screens ─────────────────────────────────────────
import { GroceriesScreen }    from '../screens/grocery/GroceriesScreen';
import { ShopDetailsScreen }  from '../screens/marketplace/ShopDetailsScreen';
import ProductDetailsScreen   from '../screens/marketplace/ProductDetailsScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { UseRuvoShopScreen }  from '../screens/UseRuvoShopScreen';
import CheckoutScreen         from '../screens/marketplace/CheckoutScreen';
import OrderSuccessScreen     from '../screens/marketplace/OrderSuccessScreen';
import OrderHistoryScreen     from '../screens/profile/OrderHistoryScreen';
import EditProfileScreen      from '../screens/profile/EditProfileScreen';
import CustomerTrackingScreen from '../screens/marketplace/CustomerTrackingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Bottom Tab Navigator ────────────────────────────────────
const MainTabs = () => {
  const { cartItems } = useCart();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderTopColor: isDark ? '#334155' : '#E2E8F0',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: '#EAB308',
        tabBarInactiveTintColor: isDark ? '#475569' : '#9E9E9E',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => {
          const iconMap: Record<string, { on: IoniconName; off: IoniconName }> = {
            Home:       { on: 'home',          off: 'home-outline' },
            NearbyShops:{ on: 'storefront',    off: 'storefront-outline' },
            Cart:       { on: 'cart',          off: 'cart-outline' },
            LocalJobs:  { on: 'briefcase',     off: 'briefcase-outline' },
            Profile:    { on: 'person-circle', off: 'person-circle-outline' },
          };
          const icons = iconMap[route.name];
          return <Ionicons name={icons ? (focused ? icons.on : icons.off) : 'help-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name={ROUTES.HOME}        component={HomeScreen}        options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name={ROUTES.NEARBY_SHOPS} component={NearbyShopsScreen} options={{ tabBarLabel: 'Shops' }} />
      <Tab.Screen
        name={ROUTES.CART}
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarBadge: cartItems.length > 0 ? cartItems.length : undefined,
        }}
      />
      <Tab.Screen
        name={ROUTES.LOCAL_JOBS}
        component={ComingSoonScreen}
        options={{ tabBarLabel: 'Local Jobs' }}
      />
      <Tab.Screen name={ROUTES.PROFILE}     component={ProfileScreen}     options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
};

// ── App Navigator ───────────────────────────────────────────
interface AppNavigatorProps { theme: Theme; }

export const AppNavigator = ({ theme }: AppNavigatorProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#EAB308" />
        <Text style={{ marginTop: 14, fontSize: 16, fontWeight: '600', color: '#222' }}>Loading RuVo...</Text>
        <Text style={{ marginTop: 5, fontSize: 12, color: '#777' }}>Please wait</Text>
      </View>
    );
  }

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
            {/* MainTabs is the root */}
            <Stack.Screen name={ROUTES.MAIN_TABS}       component={MainTabs} />
            {/* Full-screen stack screens (push over tabs) */}
            <Stack.Screen name={ROUTES.GROCERIES}       component={GroceriesScreen} />
            <Stack.Screen name={ROUTES.SHOP_DETAILS}    component={ShopDetailsScreen} />
            <Stack.Screen name={ROUTES.PRODUCT_DETAILS} component={ProductDetailsScreen} />
            <Stack.Screen name={ROUTES.REGISTER_SHOP}   component={UseRuvoShopScreen} />
            <Stack.Screen name={ROUTES.EDIT_PROFILE}    component={EditProfileScreen} />
            <Stack.Screen name={ROUTES.CHECKOUT}        component={CheckoutScreen} />
            <Stack.Screen name={ROUTES.ORDER_SUCCESS}   component={OrderSuccessScreen} />
            <Stack.Screen name={ROUTES.CUSTOMER_TRACKING} component={CustomerTrackingScreen} />
            <Stack.Screen name={ROUTES.ORDER_HISTORY}   component={OrderHistoryScreen} />
            <Stack.Screen name={ROUTES.ADMIN_DASHBOARD} component={AdminDashboardScreen} />
            <Stack.Screen name={ROUTES.JOBS}            component={ComingSoonScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
