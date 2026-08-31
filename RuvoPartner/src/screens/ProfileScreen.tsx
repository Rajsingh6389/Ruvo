/**
 * ProfileScreen - RuvoPartner (Redesigned with Premium UI/UX)
 * 
 * Features:
 * - User profile card with avatar initials
 * - Verification status badge
 * - Personal details (mobile, role)
 * - Vehicle information
 * - Security & sessions link
 * - Sign out with confirmation
 * - Smooth animations
 * - Responsive layout
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const ProfileScreen = () => {
  const { user, logout, verificationStatus } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your delivery partner account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
      ],
    );
  };

  const isApproved = verificationStatus === 'APPROVED';
  const userName = user?.name || 'Delivery Partner';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md">
        <Text className="text-xl font-extrabold text-ruvo-ink">Account</Text>
        <Text className="text-xs text-warm-600 font-medium mt-xs">
          Manage your partner details and security
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-lg pt-lg pb-2xl"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInUp.duration(500)}>
          <Card className="flex-row items-center gap-md mb-xl">
            <View className="w-14 h-14 bg-ruvo-accent rounded-full items-center justify-center">
              <Text className="text-2xl font-extrabold text-white">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-ruvo-ink" numberOfLines={1}>
                {userName}
              </Text>
              <Text className="text-xs text-warm-600 font-medium mt-xs">
                RuVo Delivery Partner
              </Text>
              <View className="mt-sm">
                <Badge
                  variant={isApproved ? 'success' : 'warning'}
                  size="sm"
                >
                  <View className="flex-row items-center gap-xs">
                    <Ionicons
                      name={isApproved ? 'checkmark-circle' : 'time'}
                      size={12}
                      color={isApproved ? '#16A34A' : '#D97706'}
                    />
                    <Text className="font-extrabold">
                      {verificationStatus?.replaceAll?.('_', ' ') ?? 'Pending'}
                    </Text>
                  </View>
                </Badge>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Personal Details Section */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-sm ml-xs">
            Personal Details
          </Text>
          <Card className="mb-xl">
            <View className="flex-row justify-between items-center pb-md border-b border-warm-200">
              <Text className="text-sm text-warm-600 font-medium">Mobile Number</Text>
              <Text className="text-sm text-ruvo-ink font-bold">{user?.mobileNumber || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center pt-md">
              <Text className="text-sm text-warm-600 font-medium">Role</Text>
              <Text className="text-sm text-ruvo-ink font-bold">Partner Driver</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Vehicle Section */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-sm ml-xs">
            Assigned Vehicle
          </Text>
          <Card className="mb-xl">
            {user?.vehicle ? (
              <>
                <View className="flex-row justify-between items-center pb-md border-b border-warm-200">
                  <Text className="text-sm text-warm-600 font-medium">Vehicle Type</Text>
                  <Text className="text-sm text-ruvo-ink font-bold">{user.vehicle.vehicleType}</Text>
                </View>
                <View className="flex-row justify-between items-center pt-md">
                  <Text className="text-sm text-warm-600 font-medium">Registration</Text>
                  <Text className="text-sm text-ruvo-ink font-bold">{user.vehicle.vehicleNumber}</Text>
                </View>
              </>
            ) : (
              <Text className="text-sm text-warm-600 py-md">
                Vehicle details have not been submitted.
              </Text>
            )}
          </Card>
        </Animated.View>

        {/* Security Section */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)}>
          <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-sm ml-xs">
            Security & Access
          </Text>
          <Card className="mb-xl">
            <TouchableOpacity
              onPress={() => navigation.navigate('ActiveDevices')}
              activeOpacity={0.7}
              className="flex-row items-center gap-md"
            >
              <View className="w-9 h-9 bg-green-100 rounded-lg items-center justify-center">
                <Ionicons name="shield-checkmark-outline" size={20} color="#16A34A" />
              </View>
              <Text className="flex-1 text-sm text-ruvo-ink font-bold">
                Active Devices & Sessions
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#D1C7BA" />
            </TouchableOpacity>
          </Card>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            className="bg-red-50 border-2 border-red-200 rounded-xl py-lg flex-row items-center justify-center gap-sm"
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text className="text-base font-extrabold text-red-600">Sign Out Account</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};
