import React from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  const tabHeight = 66 + Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#EDE7DA',
          borderWidth: 1,
          height: tabHeight,
          marginHorizontal: 12,
          marginBottom: Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom - 2, 8),
          paddingTop: 8,
          borderRadius: 26,
          position: 'absolute',
          overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.14,
          shadowRadius: 18,
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 2,
        },
        tabBarActiveTintColor: '#EAB308',
        tabBarInactiveTintColor: isDark ? '#475569' : '#9E9E9E',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 1 },
        tabBarBadgeStyle: {
          backgroundColor: '#FACC15',
          color: '#231C10',
          fontSize: 10,
          fontWeight: '900',
          minWidth: 18,
          height: 18,
          borderRadius: 9,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconMap: Record<string, { on: IoniconName; off: IoniconName }> = {
            Home:       { on: 'home',          off: 'home-outline' },
            NearbyShops:{ on: 'storefront',    off: 'storefront-outline' },
            Cart:       { on: 'cart',          off: 'cart-outline' },
            LocalJobs:  { on: 'briefcase',     off: 'briefcase-outline' },
            Profile:    { on: 'person-circle', off: 'person-circle-outline' },
          };
          const icons = iconMap[route.name];
          return (
            <View
              style={{
                width: 34,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? 'rgba(250, 204, 21, 0.18)' : 'transparent',
              }}
            >
              <Ionicons name={icons ? (focused ? icons.on : icons.off) : 'help-outline'} size={size} color={color} />
            </View>
          );
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
