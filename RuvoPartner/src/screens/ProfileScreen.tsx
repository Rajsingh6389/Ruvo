/**
 * ProfileScreen - RuvoPartner (Premium Dark Bento UI)
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
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

const formatImgUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

export const ProfileScreen = () => {
  const { user, token, logout, verificationStatus } = useAuth();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [selectedShops, setSelectedShops] = useState<SelectedShopDetail[]>([]);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const loadSelectedShops = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/shop-preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const arr = json?.data || [];
        setSelectedShops(arr);
        if (json?.shopIds) {
          AsyncStorage.setItem('selectedShopIds', JSON.stringify(json.shopIds)).catch(() => {});
        }
      } else {
        setSelectedShops([]);
      }
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
    <SafeAreaView className="flex-1 bg-ruvo-ink" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Decorative Glow Elements */}
      <View className="absolute top-0 right-[-100px] w-64 h-64 bg-[#FF7A00]/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Header */}
      <View className="bg-ruvo-ink/90 border-b border-gray-800 px-6 py-4 z-10">
        <Text className="text-xl font-black text-white tracking-tight">Account</Text>
        <Text className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
          Manage your partner details
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInUp.duration(500)}>
          <View className="flex-row items-center gap-4 mb-8 bg-[#1C2026] border border-gray-800 rounded-[28px] p-5 shadow-lg shadow-black/40">
            <View className="w-16 h-16 bg-[#FF7A00] rounded-[22px] items-center justify-center border border-[#FF7A00]/50 shadow-[0_0_12px_#FF7A00]">
              <Text className="text-2xl font-black text-white tracking-tight">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-white tracking-tight" numberOfLines={1}>
                {userName}
              </Text>
              <Text className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                RuVo Delivery Partner
              </Text>
              <View className="mt-3 self-start">
                <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${isApproved ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#FF7A00]/10 border-[#FF7A00]/30'}`}>
                  <Ionicons
                    name={isApproved ? 'checkmark-circle' : 'time'}
                    size={14}
                    color={isApproved ? '#10B981' : '#FF7A00'}
                  />
                  <Text className={`text-[10px] font-black uppercase tracking-widest ${isApproved ? 'text-emerald-400' : 'text-[#FF7A00]'}`}>
                    {verificationStatus?.replaceAll('_', ' ') ?? 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Personal Details Section */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">
            Personal Details
          </Text>
          <View className="mb-6 bg-[#1C2026] border border-gray-800 rounded-[28px] p-2 shadow-lg shadow-black/40">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-800/50">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center border border-white/10">
                  <Ionicons name="call" size={14} color="#9CA3AF" />
                </View>
                <Text className="text-sm text-gray-400 font-bold">Mobile Number</Text>
              </View>
              <Text className="text-base text-white font-black tracking-wider">{user?.mobileNumber || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center p-4">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center border border-white/10">
                  <Ionicons name="briefcase" size={14} color="#9CA3AF" />
                </View>
                <Text className="text-sm text-gray-400 font-bold">Role</Text>
              </View>
              <Text className="text-base text-white font-black">Partner Driver</Text>
            </View>
          </View>
        </Animated.View>

        {/* Vehicle Section */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">
            Assigned Vehicle
          </Text>
          <View className="mb-8 bg-[#1C2026] border border-gray-800 rounded-[28px] p-2 shadow-lg shadow-black/40">
            {user?.vehicle ? (
              <>
                <View className="flex-row justify-between items-center p-4 border-b border-gray-800/50">
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center border border-white/10">
                      <Ionicons name="bicycle" size={16} color="#9CA3AF" />
                    </View>
                    <Text className="text-sm text-gray-400 font-bold">Vehicle Type</Text>
                  </View>
                  <Text className="text-base text-white font-black">{user.vehicle.vehicleType}</Text>
                </View>
                <View className="flex-row justify-between items-center p-4">
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center border border-white/10">
                      <Ionicons name="document-text" size={14} color="#9CA3AF" />
                    </View>
                    <Text className="text-sm text-gray-400 font-bold">Registration</Text>
                  </View>
                  <Text className="text-base text-white font-black tracking-widest uppercase">{user.vehicle.vehicleNumber}</Text>
                </View>
              </>
            ) : (
              <View className="p-5 flex-row items-center gap-3">
                <Ionicons name="warning" size={20} color="#FF7A00" />
                <Text className="text-sm text-gray-400 font-bold flex-1">
                  Vehicle details have not been submitted.
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── MY SELECTED SHOPS SECTION ─────────────────────────────────────────── */}
        {isApproved && (
          <Animated.View entering={FadeInUp.delay(300).duration(500)}>
            <View className="flex-row justify-between items-center mb-4 ml-1">
              <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                My Shops ({selectedShops.length})
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ManageShops')}
                className="flex-row items-center gap-1.5"
                activeOpacity={0.7}
              >
                <Ionicons name="create" size={14} color="#FF7A00" />
                <Text className="text-[11px] font-black uppercase text-[#FF7A00] tracking-widest">Update</Text>
              </TouchableOpacity>
            </View>

            {selectedShops.length === 0 ? (
              <View className="mb-8 bg-[#1C2026] border border-gray-800 rounded-[28px] shadow-lg shadow-black/40">
                <TouchableOpacity
                  onPress={() => navigation.navigate('ManageShops')}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-4 p-5"
                >
                  <View className="w-12 h-12 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-2xl items-center justify-center">
                    <Ionicons name="storefront" size={20} color="#FF7A00" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-white font-black">No Shops Selected</Text>
                    <Text className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest leading-4">
                      Tap to choose nearby shops for runs.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mb-8 gap-4">
                {selectedShops.map((shop, i) => {
                  const rawLogoUrl = shop.logo || shop.logoUrl || shop.imageUrl || shop.bannerUrl;
                  const logoUrl = formatImgUrl(rawLogoUrl);
                  return (
                    <Animated.View key={shop.id} entering={FadeInUp.delay(350 + i * 50).duration(400)}>
                      <View className="p-5 flex-col bg-[#1C2026] border border-gray-800 rounded-[28px] shadow-lg shadow-black/40">
                        <View className="flex-row gap-4">
                          {/* Shop Logo */}
                          {logoUrl ? (
                            <Image
                              source={{ uri: logoUrl }}
                              className="w-16 h-16 rounded-[20px] bg-gray-800 border border-gray-700"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-16 h-16 rounded-[20px] bg-[#FF7A00]/10 border border-[#FF7A00]/20 items-center justify-center">
                              <Ionicons name="storefront" size={26} color="#FF7A00" />
                            </View>
                          )}

                          {/* Shop Details */}
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between mb-0.5">
                              <Text className="text-lg font-black text-white" numberOfLines={1}>
                                {shop.name}
                              </Text>
                            </View>

                            <Text className="text-[10px] font-black text-[#FF7A00] uppercase tracking-widest mb-1.5">
                              {shop.category || 'General Store'}
                            </Text>

                            <View className="flex-row items-start gap-1">
                              <Ionicons name="location" size={12} color="#9CA3AF" style={{ marginTop: 2 }} />
                              <Text className="flex-1 text-[11px] font-bold text-gray-400 leading-4" numberOfLines={2}>
                                {shop.fullAddress || shop.address}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row gap-3 mt-4 pt-4 border-t border-gray-800">
                          {shop.phone && (
                            <TouchableOpacity
                              onPress={() => openCall(shop.phone)}
                              activeOpacity={0.7}
                              className="flex-1 h-12 bg-[#171A1F] border border-gray-700 rounded-2xl flex-row items-center justify-center gap-2"
                            >
                              <Ionicons name="call" size={16} color="#FFF" />
                              <Text className="text-xs font-black text-white tracking-widest uppercase">Call</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            onPress={() => openNavigation(shop.latitude, shop.longitude, shop.fullAddress || shop.address)}
                            activeOpacity={0.7}
                            className={`flex-[1.5] h-12 bg-[#FF7A00] rounded-2xl flex-row items-center justify-center gap-2`}
                            style={{ shadowColor: '#FF7A00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
                          >
                            <Ionicons name="navigate" size={16} color="#FFF" />
                            <Text className="text-xs font-black text-white tracking-widest uppercase">Navigate</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}

        {/* Financial Details Section */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <View className="flex-row justify-between items-center mb-3 ml-1">
            <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
              Financial Details
            </Text>
          </View>
          <View className="mb-6 bg-[#1C2026] border border-gray-800 rounded-[28px] p-2 shadow-lg shadow-black/40">
            <TouchableOpacity
              onPress={() => navigation.navigate('EditBankAccount')}
              activeOpacity={0.7}
              className="flex-row items-center p-3 gap-4"
            >
              <View className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-2xl items-center justify-center">
                <Ionicons name="wallet" size={18} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-white font-black">
                  Bank & Settlement
                </Text>
                <Text className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest leading-4">
                  Manage weekly payout bank Account
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Security Section */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)}>
          <Text className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">
            Security & Access
          </Text>
          <View className="mb-6 bg-[#1C2026] border border-gray-800 rounded-[28px] p-2 shadow-lg shadow-black/40">
            <TouchableOpacity
              onPress={() => navigation.navigate('ActiveDevices')}
              activeOpacity={0.7}
              className="flex-row items-center p-3 gap-4"
            >
              <View className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-2xl items-center justify-center">
                <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
              </View>
              <Text className="flex-1 text-base text-white font-black">
                Active Devices & Sessions
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)}>
          <TouchableOpacity
            onPress={() => setLogoutModalOpen(true)}
            activeOpacity={0.85}
            className="mb-8"
          >
            <View className="bg-red-500/10 border border-red-500/30 rounded-2xl py-4 flex-row items-center justify-center gap-2">
              <Ionicons name="log-out" size={20} color="#EF4444" />
              <Text className="text-base font-black text-red-500 tracking-widest uppercase">Sign Out Account</Text>
            </View>
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
