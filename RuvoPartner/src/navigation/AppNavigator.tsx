import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DarkTheme, LightTheme } from '../theme/theme';

// Main app screens
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AvailableDeliveriesScreen } from '../screens/AvailableDeliveriesScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ActiveDeliveryScreen } from '../screens/ActiveDeliveryScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { VerificationStatusScreen } from '../screens/VerificationStatusScreen';
import { ActiveDevicesScreen } from '../screens/ActiveDevicesScreen';

// Onboarding flow (7 steps)
import { Step1_BasicDetails }  from '../screens/onboarding/Step1_BasicDetails';
import { Step2_VehicleType }   from '../screens/onboarding/Step2_VehicleType';
import { Step3_Aadhaar }       from '../screens/onboarding/Step3_Aadhaar';
import { Step4_OnboardingFee } from '../screens/onboarding/Step4_OnboardingFee';
import { Step5_BankAccount }   from '../screens/onboarding/Step5_BankAccount';
import { Step6_ShopSelection } from '../screens/onboarding/Step6_ShopSelection';
import { Step7_Success }       from '../screens/onboarding/Step7_Success';

// ── Route types ─────────────────────────────────────────────────────────────
export type RootStackParamList = {
  // Auth
  Login: undefined;
  OtpVerification: { mobileNumber: string };
  // Onboarding (shown when verificationStatus === 'NEW')
  Step1_BasicDetails: undefined;
  Step2_VehicleType: undefined;
  Step3_Aadhaar: undefined;
  Step4_OnboardingFee: undefined;
  Step5_BankAccount: undefined;
  Step6_ShopSelection: undefined;
  Step7_Success: { selectedShopCount?: number };
  // Review / blocked states
  VerificationStatus: undefined;
  // Main app
  MainTabs: undefined;
  ActiveDelivery: { deliveryId: number };
  ActiveDevices: undefined;
};

export type TabParamList = {
  Home: undefined;
  Deliveries: undefined;
  Earnings: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

// ── Bottom tab navigator (shown only after APPROVED) ─────────────────────────
const TabNavigator = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Home:          ['home',          'home-outline'],
            Deliveries:    ['bicycle',       'bicycle-outline'],
            Earnings:      ['wallet',        'wallet-outline'],
            Notifications: ['notifications', 'notifications-outline'],
            Profile:       ['person',        'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Ionicons
              name={(focused ? active : inactive) as React.ComponentProps<typeof Ionicons>['name']}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home"          component={DashboardScreen}           />
      <Tab.Screen name="Deliveries"    component={AvailableDeliveriesScreen} />
      <Tab.Screen name="Earnings"      component={EarningsScreen}            />
      <Tab.Screen name="Notifications" component={NotificationsScreen}       />
      <Tab.Screen name="Profile"       component={ProfileScreen}             />
    </Tab.Navigator>
  );
};

// ── Root navigator ────────────────────────────────────────────────────────────
export const AppNavigator = () => {
  const { isAuthenticated, isLoading, verificationStatus } = useAuth();
  const { colors, theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, fontSize: 16, color: colors.textSecondary }}>
          Loading RuVo Partner…
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme === 'dark' ? DarkTheme : LightTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* ── Not logged in ──────────────────────────────────────── */}
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login"            component={LoginScreen}           />
            <Stack.Screen name="OtpVerification"  component={OtpVerificationScreen} />
          </>

        /* ── Approved → main app ─────────────────────────────────── */
        ) : verificationStatus === 'APPROVED' ? (
          <>
            <Stack.Screen name="MainTabs"      component={TabNavigator}          />
            <Stack.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} />
            <Stack.Screen name="ActiveDevices"  component={ActiveDevicesScreen}  />
          </>

        /* ── New partner → 7-step onboarding ───────────────────────
             Steps 1-6 collect info, Step 7 waits for admin approval.
             All steps are registered so any step can navigate without
             "screen not found" errors. Initial route is Step1 when
             verificationStatus is 'NEW'.                              */
        ) : verificationStatus === 'NEW' ? (
          <>
            <Stack.Screen name="Step1_BasicDetails"  component={Step1_BasicDetails}  />
            <Stack.Screen name="Step2_VehicleType"   component={Step2_VehicleType}   />
            <Stack.Screen name="Step3_Aadhaar"       component={Step3_Aadhaar}       />
            <Stack.Screen name="Step4_OnboardingFee" component={Step4_OnboardingFee} />
            <Stack.Screen name="Step5_BankAccount"   component={Step5_BankAccount}   />
            <Stack.Screen name="Step6_ShopSelection" component={Step6_ShopSelection} />
            <Stack.Screen name="Step7_Success"       component={Step7_Success}       />
          </>

        /* ── Pending admin approval → stay on approval screen ──────
             User completed all 7 steps and is waiting for admin.
             Approval screen polls /api/partners/me every 10s and
             automatically routes to MainTabs when approved.            */
        ) : verificationStatus === 'PENDING_APPROVAL' ? (
          <>
            <Stack.Screen name="Step7_Success" component={Step7_Success} />
          </>

        /* ── Any other status (REJECTED, SUSPENDED, etc.) ──────────── */
        ) : (
          <Stack.Screen name="VerificationStatus" component={VerificationStatusScreen} />
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
};
