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
import { RuvoLaunchScreen } from '../components/launch/RuvoLaunchScreen';

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

// ─── Search, Reviews & Help Screens ────────────────────────
import { SearchScreen }       from '../screens/search/SearchScreen';
import { HelpScreen }         from '../screens/help/HelpScreen';
import { RateOrderScreen }    from '../screens/reviews/RateOrderScreen';

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
          backgroundColor: isDark ? '#171A1F' : '#FFFFFF',
          borderColor: isDark ? '#332E29' : '#E7E0D5',
          borderWidth: 1,
          height: tabHeight,
          marginHorizontal: 12,
          marginBottom: Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom - 2, 8),
          paddingTop: 8,
          borderRadius: 24,
          position: 'absolute',
          overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
          elevation: 8,
          shadowColor: '#171A1F',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
        },
        tabBarActiveTintColor: '#F4B400',
        tabBarInactiveTintColor: isDark ? '#77736B' : '#77736B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 1 },
        tabBarBadgeStyle: {
          backgroundColor: '#F4B400',
          color: '#171A1F',
          fontSize: 10,
          fontWeight: '800',
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
                width: 36,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? 'rgba(244, 180, 0, 0.16)' : 'transparent',
              }}
            >
              <Ionicons name={icons ? (focused ? icons.on : icons.off) : 'help-outline'} size={22} color={color} />
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
  const [launchComplete, setLaunchComplete] = React.useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF7F0' }}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
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
              <Stack.Screen name={ROUTES.SEARCH}          component={SearchScreen} />
              <Stack.Screen name={ROUTES.HELP}            component={HelpScreen} />
              <Stack.Screen name={ROUTES.RATE_ORDER}      component={RateOrderScreen} />
              <Stack.Screen name={ROUTES.JOBS}            component={ComingSoonScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {!launchComplete && (
        <RuvoLaunchScreen
          isReady={!isLoading}
          roleSubtitle="LOCAL • CONNECTED • MOVING"
          onFinish={() => setLaunchComplete(true)}
        />
      )}
    </View>
  );
};
