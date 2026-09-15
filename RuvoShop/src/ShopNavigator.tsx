import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { DarkTheme, LightTheme } from './theme/theme';
import { RuvoLaunchScreen } from './components/launch/RuvoLaunchScreen';
import { Text } from 'react-native';
import { API_BASE_URL } from './config/api';

// Auth
import { LoginScreen } from './screens/LoginScreen';

// Drawer screens
import ShopkeeperDashboardScreen from './screens/marketplace/ShopkeeperDashboardScreen';
import { MyShopsScreen } from './screens/marketplace/MyShopsScreen';
import { EditBankAccountScreen } from './screens/marketplace/EditBankAccountScreen';
import ShopRidersScreen from './screens/marketplace/ShopRidersScreen';

// Stack screens
import ShopOrdersScreen from './screens/marketplace/ShopOrdersScreen';
import { MyProductsScreen } from './screens/marketplace/MyProductsScreen';
import { AddProductScreen } from './screens/marketplace/AddProductScreen';
import { EditProductScreen } from './screens/marketplace/EditProductScreen';
import DeliveryPartnerAssignmentScreen from './screens/marketplace/DeliveryPartnerAssignmentScreen';
import { EditShopScreen } from './screens/marketplace/EditShopScreen';
import NotificationsScreen from './screens/marketplace/NotificationsScreen';

export type DrawerParamList = {
  ShopkeeperDashboard: undefined;
  ShopOrders: undefined;
  MyProducts: undefined;
  AddProduct: undefined;
  MyShops: undefined;
  EditBankAccount: undefined;
  MyRiders: undefined;
};

export type ShopStackParamList = {
  Login: undefined;
  MainDrawer: undefined;
  EditShop: { shop: any };
  ShopOrders: { shopId: string; shopName: string };
  MyProducts: { shopId: string };
  AddProduct: { shopId: string };
  EditProduct: { productId: string; shopId: string };
  DeliveryPartnerAssignment: { orderId: string };
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<ShopStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

function MainDrawerNavigator() {
  const { colors } = useTheme();
  const { user, userId, token, logout } = useAuth();
  const [shopName, setShopName] = useState<string>(user?.name || 'RuVo Shop');
  const [shopCategory, setShopCategory] = useState<string>('Business Portal');
  const [shopLogo, setShopLogo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShop() {
      if (!token || !userId) return;
      const ownerId = userId;
      try {
        const res = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const shop = data[0];
          setShopName(shop.name || shopName);
          setShopCategory(shop.category || shopCategory);
          if (shop.logoUrl || shop.bannerUrl || shop.image) {
            let img = shop.logoUrl || shop.bannerUrl || shop.image;
            if (!img.startsWith('http')) {
              img = `${API_BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
            }
            setShopLogo(img);
          }
        }
      } catch (e) {
        // fail silently
      }
    }
    fetchShop();
  }, [token, user]);
  
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false, // Let specific screens like ShopkeeperDashboardScreen handle their own custom headers
        drawerStyle: { backgroundColor: colors.surface },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerActiveBackgroundColor: colors.surfaceSunken,
        drawerLabelStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
      }}
      drawerContent={(props) => (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
          <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 10 }}>
            {shopLogo ? (
              <Image source={{ uri: shopLogo }} style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 10 }} />
            ) : (
              <Ionicons name="storefront" size={40} color={colors.primary} />
            )}
            <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 21, color: colors.textPrimary, marginTop: 10 }} numberOfLines={1}>
              {shopName}
            </Text>
            <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 13, color: colors.textSecondary }} numberOfLines={1}>
              {shopCategory}
            </Text>
          </View>
          <DrawerItemList {...props} />
          
          <View style={{ flex: 1 }} />
          
          <TouchableOpacity 
            onPress={logout}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: colors.border }}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.error || '#DC2626'} />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: colors.error || '#DC2626', marginLeft: 15 }}>
              Logout
            </Text>
          </TouchableOpacity>
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen 
        name="ShopkeeperDashboard" 
        component={ShopkeeperDashboardScreen}
        options={{ 
          title: 'Dashboard',
          drawerIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />
        }} 
      />
      <Drawer.Screen 
        name="ShopOrders" 
        component={ShopOrdersScreen}
        options={{ 
          title: 'Orders',
          headerShown: false,
          drawerIcon: ({ color }) => <Ionicons name="receipt" size={22} color={color} />
        }} 
      />
      <Drawer.Screen 
        name="MyProducts" 
        component={MyProductsScreen}
        options={{ 
          title: 'My Products',
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: colors.textPrimary },
          headerTintColor: colors.textPrimary,
          drawerIcon: ({ color }) => <Ionicons name="pricetags" size={22} color={color} />
        }} 
      />
      <Drawer.Screen 
        name="AddProduct" 
        component={AddProductScreen}
        options={{ 
          title: 'Add Product',
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: colors.textPrimary },
          headerTintColor: colors.textPrimary,
          drawerIcon: ({ color }) => <Ionicons name="add-circle" size={22} color={color} />
        }} 
      />
      <Drawer.Screen 
        name="MyShops" 
        component={MyShopsScreen}
        options={{ 
          title: 'My Shops',
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: colors.textPrimary },
          headerTintColor: colors.textPrimary,
          drawerIcon: ({ color }) => <Ionicons name="business" size={22} color={color} />
        }} 
      />
      <Drawer.Screen 
        name="EditBankAccount" 
        component={EditBankAccountScreen}
        options={{ 
          title: 'Bank Accounts',
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontFamily: 'Poppins_700Bold', color: colors.textPrimary },
          headerTintColor: colors.textPrimary,
          drawerIcon: ({ color }) => <Ionicons name="card" size={22} color={color} />
        }} 
      />
      <Drawer.Screen 
        name="MyRiders" 
        component={ShopRidersScreen}
        options={{ 
          title: 'My Riders',
          headerShown: false,
          drawerIcon: ({ color }) => <Ionicons name="people" size={22} color={color} />
        }} 
      />
    </Drawer.Navigator>
  );
}

export const ShopNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const [launchComplete, setLaunchComplete] = useState(false);

  return (
<<<<<<< HEAD
    <View style={{ flex: 1, backgroundColor: '#FAF7F0', position: 'relative' }}>
      {/* Do not render auth-dependent navigator until initial token check completes */}
      {!isLoading && (
        <NavigationContainer theme={theme === 'dark' ? DarkTheme : LightTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>

            {/* ── Not authenticated ────────────────────────────────────── */}
            {!isAuthenticated ? (
              <Stack.Screen name="Login" component={LoginScreen as any} />

            /* ── Any onboarding state → register all steps ───────────────
                 All steps MUST be registered at all times. When Step 1 sets
                 status to AADHAAR_PENDING, navigator re-renders; if Step 2 is
                 not registered it throws "screen not found". Keeping all steps
                 registered resolves this.                                      */
            ) : onboardingStatus === 'PENDING_APPROVAL' ? (
              /* ── Already submitted, awaiting admin approval ────────────
                   Render Step4_Success first so the user lands directly on
                   the approval-waiting screen.  All other steps are also
                   registered so mid-flow navigation (e.g. "edit & resubmit")
                   still works.                                               */
              <>
                <Stack.Screen name="Step4_Success" component={Step4_Success} />
                <Stack.Screen name="Step1_ShopDetails" component={Step1_ShopDetails} />
                <Stack.Screen name="Step2_Aadhaar" component={Step2_Aadhaar} />
                <Stack.Screen name="Step3_BankAccount" component={Step3_BankAccount} />
                <Stack.Screen name="Step4_OnboardingFee" component={Step4_OnboardingFee} />
                <Stack.Screen name="Step5_ShopSelect" component={Step5_ShopSelect} />
              </>

            ) : onboardingStatus !== 'APPROVED' ? (
              /* ── Any other onboarding state → register all steps ─────────
                   All steps MUST be registered at all times. When Step 1 sets
                   status to AADHAAR_PENDING, navigator re-renders; if Step 2 is
                   not registered it throws "screen not found". Keeping all steps
                   registered resolves this.                                      */
              <>
                <Stack.Screen name="Step1_ShopDetails" component={Step1_ShopDetails} />
                <Stack.Screen name="Step2_Aadhaar" component={Step2_Aadhaar} />
                <Stack.Screen name="Step3_BankAccount" component={Step3_BankAccount} />
                <Stack.Screen name="Step4_OnboardingFee" component={Step4_OnboardingFee} />
                <Stack.Screen name="Step5_ShopSelect" component={Step5_ShopSelect} />
                <Stack.Screen name="Step4_Success" component={Step4_Success} />
              </>

            /* ── Onboarding complete → main app ──────────────────────── */
            ) : (
              <>
                <Stack.Screen name="ShopkeeperDashboard" component={ShopkeeperDashboardScreen} />
                <Stack.Screen name="MyShops" component={MyShopsScreen} />
                <Stack.Screen name="EditShop" component={EditShopScreen} />
                <Stack.Screen name="ShopOrders" component={ShopOrdersScreen} />
                <Stack.Screen name="MyProducts" component={MyProductsScreen} />
                <Stack.Screen name="AddProduct" component={AddProductScreen} />
                <Stack.Screen name="EditProduct" component={EditProductScreen} />
                <Stack.Screen name="DeliveryPartnerAssignment" component={DeliveryPartnerAssignmentScreen} />
                <Stack.Screen name="EditBankAccount" component={EditBankAccountScreen} />
              </>
            )}

          </Stack.Navigator>
        </NavigationContainer>
      )}
=======
    <View style={{ flex: 1, backgroundColor: '#FAF7F0' }}>
      <NavigationContainer theme={theme === 'dark' ? DarkTheme : LightTheme}>
        {isLoading ? (
          <View style={{ flex: 1, backgroundColor: '#FAF7F0' }} />
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
              <Stack.Screen name="Login" component={LoginScreen as any} />
            ) : (
              // Bypassing onboarding: going directly to Dashboard Drawer 
              <>
                <Stack.Screen name="MainDrawer" component={MainDrawerNavigator} />
                <Stack.Screen name="EditShop" component={EditShopScreen} />
                <Stack.Screen name="EditProduct" component={EditProductScreen} />
                <Stack.Screen name="DeliveryPartnerAssignment" component={DeliveryPartnerAssignmentScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
              </>
            )}
          </Stack.Navigator>
        )}
      </NavigationContainer>
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7

      {!launchComplete && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: '#FAF7F0' }}>
          <RuvoLaunchScreen
            isReady={!isLoading}
            roleSubtitle="LOCAL • CONNECTED • MOVING"
            onFinish={() => setLaunchComplete(true)}
          />
        </View>
      )}
    </View>
  );
};
