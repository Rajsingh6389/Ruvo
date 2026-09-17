import React, { useState, useCallback } from 'react';
import { View, Text, Switch, FlatList, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { getShopOffers, toggleOffer, deleteOffer, createOffer, Offer } from '../../services/offerService';
import { Button, IconButton } from '../../components/ui/Button';

export const ManageOffersScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const shopId = route.params?.shopId;
  const { token } = useAuth();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Offer Modal
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [newValue, setNewValue] = useState('');
  const [newMinOrder, setNewMinOrder] = useState('');
  const [newMaxDiscount, setNewMaxDiscount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOffers = useCallback(async () => {
    if (!token || !shopId) return;
    try {
      const data = await getShopOffers(shopId, token);
      setOffers(data);
    } catch (e: any) {
      // alert ignored to prevent spam
    }
    setLoading(false);
    setRefreshing(false);
  }, [shopId, token]);

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [fetchOffers])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleToggle = async (id: number, currentStatus: boolean) => {
    if (!token) return;
    try {
      // optimistic update
      setOffers(prev => prev.map(o => o.id === id ? { ...o, active: !currentStatus } : o));
      await toggleOffer(id, !currentStatus, token);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      fetchOffers(); // revert
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Offer', 'Are you sure you want to delete this coupon?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!token) return;
        try {
          await deleteOffer(id, token);
          setOffers(prev => prev.filter(o => o.id !== id));
        } catch(e: any) {
          Alert.alert('Error', e.message);
        }
      }}
    ]);
  };

  const handleCreate = async () => {
    if (!token || !shopId) return;
    if (!newCode.trim() || !newValue.trim()) {
      Alert.alert('Error', 'Code and Discount VALUE are required.');
      return;
    }
    
    setSaving(true);
    try {
      const offerData = {
        shopId,
        code: newCode,
        description: newDesc,
        discountType: newType,
        discountValue: parseFloat(newValue),
        minOrderValue: newMinOrder ? parseFloat(newMinOrder) : undefined,
        maxDiscount: newMaxDiscount ? parseFloat(newMaxDiscount) : undefined
      };
      
      const newOffer = await createOffer(offerData, token);
      setOffers(prev => [newOffer, ...prev]);
      setShowModal(false);
      
      // Reset form
      setNewCode(''); setNewDesc(''); setNewValue(''); setNewMinOrder(''); setNewMaxDiscount('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <View className="px-lg py-sm bg-white shadow-xs border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <IconButton icon="arrow-back" onPress={() => navigation.goBack()} />
          <Text className="text-xl font-black text-gray-900">Manage Offers</Text>
        </View>
        <Button variant="primary" size="sm" onPress={() => setShowModal(true)}>+ New Offer</Button>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F5B700" />
        </View>
      ) : (
        <FlatList
          data={offers}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5B700" />}
          contentContainerStyle={{ padding: 16 }}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={
            <View className="items-center py-20">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="pricetags-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-gray-500 font-bold text-center">No offers created yet.{'\n'}Attract customers with a coupon.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 50)} className="bg-white rounded-2xl p-lg border border-gray-100 shadow-sm mb-4">
              <View className="flex-row items-center justify-between">
                <View className="bg-amber-100 px-3 py-1 rounded-md">
                  <Text className="text-amber-800 font-black tracking-wider text-base">{item.code}</Text>
                </View>
                <Switch
                  value={item.active}
                  onValueChange={() => handleToggle(item.id, item.active)}
                  trackColor={{ false: '#d1d5db', true: '#F5B700' }}
                  thumbColor="#ffffff"
                />
              </View>
              
              <Text className="text-gray-900 font-bold mt-2">
                {item.discountType === 'PERCENTAGE' ? `${item.discountValue}% OFF` : `₹${item.discountValue} OFF`}
                {item.minOrderValue ? ` on orders above ₹${item.minOrderValue}` : ''}
              </Text>
              
              {item.description && <Text className="text-sm text-gray-500 mt-1">{item.description}</Text>}
              
              <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <Text className="text-xs text-gray-400 font-bold uppercase">
                  {item.active ? 'Status: Active' : 'Status: Paused'}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center">
                  <Ionicons name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        />
      )}

      {/* CREATE OFFER MODAL */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setShowModal(false)} />
          <Animated.View entering={FadeInDown} className="bg-white rounded-t-3xl p-xl max-h-[85%]">
            <Text className="text-2xl font-black text-gray-900 mb-6">Create New Coupon</Text>
            
            <Text className="text-sm font-bold text-gray-700 mb-2">Coupon Code</Text>
            <TextInput
              value={newCode} onChangeText={t => setNewCode(t.toUpperCase().replace(/\s/g, ''))}
              placeholder="e.g. FESTIVAL20"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pb-3 pt-4 mb-4 text-gray-900 font-bold font-poppins"
            />
            
            <View className="flex-row mb-4 gap-2">
              <TouchableOpacity
                className={`flex-1 items-center justify-center py-2 rounded-lg border ${newType === 'PERCENTAGE' ? 'bg-amber-100 border-amber-400' : 'bg-gray-50 border-gray-200'}`}
                onPress={() => setNewType('PERCENTAGE')}
              >
                <Text className={`font-bold ${newType === 'PERCENTAGE' ? 'text-amber-800' : 'text-gray-500'}`}>Percentage (%)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 items-center justify-center py-2 rounded-lg border ${newType === 'FLAT' ? 'bg-amber-100 border-amber-400' : 'bg-gray-50 border-gray-200'}`}
                onPress={() => setNewType('FLAT')}
              >
                <Text className={`font-bold ${newType === 'FLAT' ? 'text-amber-800' : 'text-gray-500'}`}>Flat Amount (₹)</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-bold text-gray-700 mb-2">
              {newType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Flat Discount Amount (₹)'}
            </Text>
            <TextInput
              value={newValue} onChangeText={setNewValue}
              placeholder="e.g. 20" keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pb-3 pt-4 mb-4 text-gray-900 font-bold font-poppins"
            />
            
            <Text className="text-sm font-bold text-gray-700 mb-2">Minimum Order Value (₹) - Optional</Text>
            <TextInput
              value={newMinOrder} onChangeText={setNewMinOrder}
              placeholder="e.g. 300" keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pb-3 pt-4 mb-4 text-gray-900 font-bold font-poppins"
            />
            
            {newType === 'PERCENTAGE' && (
              <>
                <Text className="text-sm font-bold text-gray-700 mb-2">Maximum Discount Amount (₹) - Optional</Text>
                <TextInput
                  value={newMaxDiscount} onChangeText={setNewMaxDiscount}
                  placeholder="e.g. 100" keyboardType="numeric"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pb-3 pt-4 mb-4 text-gray-900 font-bold font-poppins"
                />
              </>
            )}

            <Button variant="primary" onPress={handleCreate} loading={saving} className="mt-2">
              Save Coupon
            </Button>
            <Button variant="outline" onPress={() => setShowModal(false)} className="mt-2" disabled={saving}>
              Cancel
            </Button>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};
