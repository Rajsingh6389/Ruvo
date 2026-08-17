import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AvailableDeliveriesScreen } from '../screens/AvailableDeliveriesScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ActiveDeliveryScreen } from '../screens/ActiveDeliveryScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

// New Screens
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { VehicleDetailsScreen } from '../screens/VehicleDetailsScreen';
import { VerificationStatusScreen } from '../screens/VerificationStatusScreen';
import { ActiveDevicesScreen } from '../screens/ActiveDevicesScreen';

export type RootStackParamList = {
  Login: undefined;
  OtpVerification: { mobileNumber: string };
  Register: undefined;
  VehicleDetails: undefined;
  VerificationStatus: undefined;
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
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Deliveries') {
            iconName = focused ? 'bicycle' : 'bicycle-outline';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Deliveries" component={AvailableDeliveriesScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, isLoading, verificationStatus } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, fontSize: 16, color: theme.colors.textSecondary }}>Loading RuVo Partner...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          </>
        ) : verificationStatus === 'APPROVED' ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} />
            <Stack.Screen name="ActiveDevices" component={ActiveDevicesScreen} />
          </>
        ) : (
          <>
            {verificationStatus === 'NEW' && (
              <>
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
              </>
            )}
            <Stack.Screen name="VerificationStatus" component={VerificationStatusScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
