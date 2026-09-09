/**
 * ProfileScreen - RuvoPartner (Redesigned with Premium UI/UX & Shop Detail Card)
 */

import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { API_BASE_URL } from '../config/api';

interface SelectedShopDetail {
  id: number;
  name: string;
  category: string;
  address: string;
  fullAddress?: string;
  phone?: string;
  rating?: number;
  logo?: string;
  bannerUrl?: string;
  logoUrl?: string;
  imageUrl?: string;
  gallery?: string[];
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
}


export const ProfileScreen = () => {
  const { user, token, logout, verificationStatus } = useAuth();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [selectedShops, setSelectedShops] = useState<SelectedShopDetail[]>([]);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const loadSelectedShops = async () => {
    try {
      const raw = await AsyncStorage.getItem('selectedShopIds');
      const ids: number[] = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(ids) || ids.length === 0) {
        setSelectedShops([]);
        return;
      }

      // 1. Try reading cached full shop objects first
      const cachedStr = await AsyncStorage.getItem('cachedNearbyShops');
      let cachedShops: SelectedShopDetail[] = [];
      if (cachedStr) {
        try { cachedShops = JSON.parse(cachedStr); } catch {}
      }

      let matched: SelectedShopDetail[] = [];
      if (Array.isArray(cachedShops) && cachedShops.length > 0) {
        matched = cachedShops.filter(s => ids.includes(s.id));
      }

      // 2. Fetch missing shops dynamically via API
      let finalMatched = [...matched];
      const missingIds = ids.filter(id => !matched.some(m => m.id === id));
      
      if (missingIds.length > 0) {
        await Promise.all(missingIds.map(async (id) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/shops/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const shopData = await res.json();
              finalMatched.push(shopData);
            }
          } catch (e) {
            console.log('Failed to fetch missing shop detail:', id);
          }
        }));
      }

      setSelectedShops(finalMatched);
    } catch {
      setSelectedShops([]);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadSelectedShops();
    }
  }, [isFocused]);

  const confirmLogout = async () => {
    setLogoutModalOpen(false);
    await logout();
  };

  const openNavigation = (lat?: number, lng?: number, address?: string) => {
    let url = '';
    if (lat != null && lng != null) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const openCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {});
    }
  };

  const isApproved = verificationStatus === 'APPROVED';
  const userName = user?.name || 'Delivery Partner';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-ruvo-border px-lg py-md">
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
          <Card className="flex-row items-center gap-md mb-xl bg-ruvo-surface border border-ruvo-border shadow-sm">
            <View className="w-14 h-14 bg-ruvo-primary rounded-2xl items-center justify-center border border-amber-200">
              <Text className="text-xl font-extrabold text-ruvo-ink">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-ruvo-ink" numberOfLines={1}>
                {userName}
              </Text>
              <Text className="text-xs text-warm-600 font-medium mt-xs">
                RuVo Delivery Partner
              </Text>
              <View className="mt-sm">
                <Badge variant={isApproved ? 'success' : 'warning'} size="sm">
                  <View className="flex-row items-center gap-xs">
                    <Ionicons
                      name={isApproved ? 'checkmark-circle' : 'time'}
                      size={12}
                      color={isApproved ? '#18A957' : '#E99A16'}
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
          <Card className="mb-xl bg-ruvo-surface border border-ruvo-border shadow-sm">
            <View className="flex-row justify-between items-center pb-md border-b border-ruvo-border">
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
          <Card className="mb-xl bg-ruvo-surface border border-ruvo-border shadow-sm">
            {user?.vehicle ? (
              <>
                <View className="flex-row justify-between items-center pb-md border-b border-ruvo-border">
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

        {/* ── MY SELECTED SHOPS SECTION ─────────────────────────────────────────── */}
        {isApproved && (
          <Animated.View entering={FadeInUp.delay(300).duration(500)}>
            <View className="flex-row justify-between items-center mb-sm ml-xs">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider">
                My Selected Shops ({selectedShops.length})
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ManageShops')}
                className="flex-row items-center gap-xs"
              >
                <Ionicons name="create-outline" size={14} color="#171A1F" />
                <Text className="text-xs font-extrabold text-ruvo-ink">Update Selection</Text>
              </TouchableOpacity>
            </View>

            {selectedShops.length === 0 ? (
              <Card className="mb-xl bg-ruvo-surface border border-ruvo-border shadow-sm">
                <TouchableOpacity
                  onPress={() => navigation.navigate('ManageShops')}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-md"
                >
                  <View className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl items-center justify-center">
                    <Ionicons name="storefront-outline" size={20} color="#F4B400" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-ruvo-ink font-bold">No Shops Selected Yet</Text>
                    <Text className="text-xs text-warm-600 mt-xs">
                      Tap to choose nearby shops to receive delivery orders.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#77736B" />
                </TouchableOpacity>
              </Card>
            ) : (
              <View className="mb-xl gap-md">
                {selectedShops.map(shop => {
                  const logoUrl = shop.logo || shop.logoUrl || shop.imageUrl;
                  return (
                    <Card key={shop.id} className="p-md bg-ruvo-surface border border-ruvo-border shadow-sm">
                      <View className="flex-row gap-md">
                        {/* Shop Logo */}
                        {logoUrl ? (
                          <Image
                            source={{ uri: logoUrl }}
                            className="w-14 h-14 rounded-xl bg-warm-200"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 items-center justify-center">
                            <Ionicons name="storefront-outline" size={24} color="#F4B400" />
                          </View>
                        )}

                        {/* Shop Details */}
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-base font-extrabold text-ruvo-ink" numberOfLines={1}>
                              {shop.name}
                            </Text>
                            {shop.rating && (
                              <View className="flex-row items-center bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Ionicons name="star" size={12} color="#F4B400" />
                                <Text className="text-xs font-black text-amber-800 ml-1">{shop.rating}</Text>
                              </View>
                            )}
                          </View>

                          <Text className="text-xs text-warm-600 font-medium mt-0.5">
                            {shop.category || 'General Store'}
                          </Text>

                          <Text className="text-xs text-warm-700 mt-1 leading-snug" numberOfLines={2}>
                            📍 {shop.fullAddress || shop.address}
                          </Text>
                        </View>
                      </View>

                      {/* Store Photo Gallery Row */}
                      {shop.gallery && shop.gallery.length > 0 && (
                        <View className="mt-md pt-md border-t border-ruvo-border">
                          <Text className="text-[10px] font-black text-warm-600 uppercase tracking-wider mb-xs">
                            Shop Gallery
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            {shop.gallery.map((img, idx) => (
                              <Image
                                key={idx}
                                source={{ uri: img }}
                                className="w-16 h-12 rounded-lg bg-warm-200 border border-ruvo-border"
                                resizeMode="cover"
                              />
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View className="flex-row gap-sm mt-md pt-sm border-t border-ruvo-border">
                        {shop.phone && (
                          <TouchableOpacity
                            onPress={() => openCall(shop.phone)}
                            className="flex-1 bg-ruvo-bg border border-ruvo-border rounded-xl py-2 px-3 flex-row items-center justify-center gap-xs"
                          >
                            <Ionicons name="call-outline" size={15} color="#171A1F" />
                            <Text className="text-xs font-bold text-ruvo-ink">Contact Shop</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => openNavigation(shop.latitude, shop.longitude, shop.fullAddress || shop.address)}
                          className="flex-1 bg-ruvo-primary rounded-xl py-2 px-3 flex-row items-center justify-center gap-xs"
                        >
                          <Ionicons name="navigate" size={15} color="#171A1F" />
                          <Text className="text-xs font-extrabold text-ruvo-ink">Navigate / Trace</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}

        {/* Security Section */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-sm ml-xs">
            Security & Access
          </Text>
          <Card className="mb-xl bg-ruvo-surface border border-ruvo-border shadow-sm">
            <TouchableOpacity
              onPress={() => navigation.navigate('ActiveDevices')}
              activeOpacity={0.7}
              className="flex-row items-center gap-md"
            >
              <View className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl items-center justify-center">
                <Ionicons name="shield-checkmark-outline" size={18} color="#18A957" />
              </View>
              <Text className="flex-1 text-sm text-ruvo-ink font-bold">
                Active Devices & Sessions
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#77736B" />
            </TouchableOpacity>
          </Card>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <TouchableOpacity
            onPress={() => setLogoutModalOpen(true)}
            activeOpacity={0.85}
            className="bg-red-50 border border-red-200 rounded-xl py-lg flex-row items-center justify-center gap-sm"
          >
            <Ionicons name="log-out-outline" size={18} color="#D94A4A" />
            <Text className="text-base font-extrabold text-red-600">Sign Out Account</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <ConfirmationModal
        visible={logoutModalOpen}
        title="Sign Out Account"
        message="Are you sure you want to sign out of your RuVo Delivery Partner account?"
        confirmText="Sign Out"
        cancelText="Keep Signed In"
        type="danger"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalOpen(false)}
      />
    </SafeAreaView>
  );
};
