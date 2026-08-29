import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { DarkTheme, LightTheme } from './theme/theme';

// Auth
import { LoginScreen } from './screens/LoginScreen';

// Onboarding (4-step flow for new shop owners)
import { Step1_ShopDetails }     from './screens/onboarding/Step1_ShopDetails';
import { Step2_Aadhaar }         from './screens/onboarding/Step2_Aadhaar';
import { Step3_BankAccount }     from './screens/onboarding/Step3_BankAccount';
import { Step4_Success }         from './screens/onboarding/Step4_Success';

// Main app screens (shown only after onboardingStatus === 'APPROVED')
import { MyShopsScreen }                      from './screens/marketplace/MyShopsScreen';

import ShopkeeperDashboardScreen              from './screens/marketplace/ShopkeeperDashboardScreen';
import ShopOrdersScreen                       from './screens/marketplace/ShopOrdersScreen';
import { MyProductsScreen }                   from './screens/marketplace/MyProductsScreen';
import { AddProductScreen }                   from './screens/marketplace/AddProductScreen';
import { EditProductScreen }                  from './screens/marketplace/EditProductScreen';
import DeliveryPartnerAssignmentScreen        from './screens/marketplace/DeliveryPartnerAssignmentScreen';
import { EditBankAccountScreen }              from './screens/marketplace/EditBankAccountScreen';

// ── Route type map ────────────────────────────────────────────────────────────
export type ShopStackParamList = {
  // Auth
  Login: undefined;
  // Onboarding
  Step1_ShopDetails: undefined;
  Step2_Aadhaar: undefined;
  Step3_BankAccount: undefined;
  Step4_Success: { shopName?: string };
  // Main app
  MyShops: undefined;
  RegisterShop: undefined;
  ShopkeeperDashboard: undefined;
  ShopOrders: { shopId: string; shopName: string };
  MyProducts: { shopId: string };
  AddProduct: { shopId: string };
  EditProduct: { productId: string; shopId: string };
  DeliveryPartnerAssignment: { orderId: string };
  EditBankAccount: undefined;
};

const Stack = createNativeStackNavigator<ShopStackParamList>();

export const ShopNavigator = () => {
  const { isAuthenticated, isLoading, onboardingStatus } = useAuth();
  const { colors, theme } = useTheme();

  if (isLoading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loaderText, { color: colors.textSecondary }]}>
          Loading RuVo Shop…
        </Text>
      </View>
    );
  }

  return (
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
        ) : onboardingStatus !== 'APPROVED' ? (
          <>
            <Stack.Screen name="Step1_ShopDetails" component={Step1_ShopDetails} />
            <Stack.Screen name="Step2_Aadhaar" component={Step2_Aadhaar} />
            <Stack.Screen name="Step3_BankAccount" component={Step3_BankAccount} />
            <Stack.Screen name="Step4_Success" component={Step4_Success} />
          </>

        /* ── Onboarding complete → main app ──────────────────────── */
        ) : (
          <>
            <Stack.Screen name="MyShops" component={MyShopsScreen} />

            <Stack.Screen name="ShopkeeperDashboard" component={ShopkeeperDashboardScreen} />
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
  );
};

const s = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
  },
});
