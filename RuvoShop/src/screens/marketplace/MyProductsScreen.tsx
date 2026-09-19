import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { deleteProduct, getProductsByShop, updateAvailability, Product } from '../../services/productService';
import { ROUTES } from '../../constants/routes';
import { API_BASE_URL } from '../../config/api';

const formatImgUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

export const MyProductsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user, userId } = useAuth();

  const [shopId, setShopId] = useState<string | undefined>(route.params?.shopId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async (showLoader = true) => {
    let activeShopId = shopId || route.params?.shopId;
    if (!activeShopId && token && (userId || user)) {
      try {
        const ownerId = userId || user?.email || '';
        const res = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          activeShopId = data[0].id.toString();
          setShopId(activeShopId);
        }
      } catch (e) {}
    }

    if (!activeShopId || !token) {
      setError('Shop or authentication information is missing.');
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    setError(null);

    try {
      const data = await getProductsByShop(activeShopId, token);
      setProducts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId, token, user, userId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(false);
  };

  const toggleAvailability = async (product: Product, value: boolean) => {
    if (!product.id || !token) return;
    setProducts(current => current.map(item => item.id === product.id ? { ...item, isAvailable: value } : item));
    try {
      await updateAvailability(product.id, value, token);
    } catch (err: any) {
      setProducts(current => current.map(item => item.id === product.id ? { ...item, isAvailable: !value } : item));
      Alert.alert('Update failed', err?.message || 'Could not update product availability.');
    }
  };

  const confirmDelete = (product: Product) => {
    if (!product.id || !token) return;
    Alert.alert('Delete product?', `"${product.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(product.id!, token);
            setProducts(current => current.filter(item => item.id !== product.id));
          } catch (err: any) {
            Alert.alert('Delete failed', err?.message || 'Could not delete product.');
          }
        },
      },
    ]);
  };

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const available = item.isAvailable !== false && item.stockQuantity > 0;
    const discount = item.discount ?? (item.actualPrice > item.sellingPrice ? Math.round(((item.actualPrice - item.sellingPrice) / item.actualPrice) * 100) : 0);
    const imageUrl = formatImgUrl(item.imageUrl);

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
        <View className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100 flex-row overflow-hidden relative">
          
          {/* IMAGE */}
          <View className="relative w-28 h-28 bg-gray-50 rounded-2xl border border-gray-100 items-center justify-center overflow-hidden">
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Ionicons name="image-outline" size={34} color="#9CA3AF" />
            )}
            
            {discount > 0 && (
              <View className="absolute bottom-2 left-2 bg-[#FF7A00] px-2 py-1 rounded-md shadow-sm">
                <Text className="text-[10px] font-black text-white uppercase tracking-widest">{discount}% OFF</Text>
              </View>
            )}
          </View>

          {/* PRODUCT INFO */}
          <View className="flex-1 ml-4 justify-between">
            <View>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-[15px] font-black text-gray-900 tracking-tight leading-tight" numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.brandName && (
                    <Text className="text-[11px] font-semibold text-[#FF7A00] mt-0.5" numberOfLines={1}>{item.brandName}</Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center mt-2.5">
                <Text className="text-[17px] font-black text-[#10B981]">₹{item.sellingPrice}</Text>
                {item.actualPrice > item.sellingPrice && (
                  <Text className="text-xs font-semibold text-gray-400 line-through ml-2">₹{item.actualPrice}</Text>
                )}
                {item.unit && (
                  <Text className="text-xs font-bold text-gray-500 ml-1">/ {item.unit}</Text>
                )}
              </View>

              <View className="flex-row items-center gap-1.5 mt-2">
                <Ionicons name="cube-outline" size={14} color="#6B7280" />
                <Text className="text-xs font-bold text-gray-600">{item.stockQuantity} in stock</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <View className="flex-row items-center gap-1.5">
                <View className={`w-2 h-2 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'}`} />
                <Text className={`text-[10px] uppercase tracking-widest font-black ${available ? 'text-green-600' : 'text-red-500'}`}>
                  {available ? 'Active' : 'Unavail'}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity onPress={() => navigation.navigate(ROUTES.EDIT_PRODUCT, { product: item, productId: item.id, shopId })} className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 items-center justify-center active:opacity-70">
                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} className="w-8 h-8 rounded-full bg-red-50 border border-red-100 items-center justify-center active:bg-red-100">
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
                <Switch
                  value={available}
                  onValueChange={value => toggleAvailability(item, value)}
                  style={{ transform: [{ scale: 0.8 }, { translateX: 6 }] }}
                  trackColor={{ false: '#E5E7EB', true: '#FF7A00' }}
                  thumbColor={available ? '#FFF' : '#FFF'}
                />
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* HEADER */}
      <View className="bg-white px-6 py-4 shadow-sm border-b border-gray-100 z-10 flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-gray-50 rounded-full border border-gray-100 items-center justify-center active:bg-gray-100">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-black text-gray-900 tracking-tight">My Products</Text>
            <Text className="text-[11px] text-[#FF7A00] font-black uppercase tracking-widest mt-0.5">Manage Your Catalog</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT, { shopId })} className="w-10 h-10 bg-[#FF7A00] rounded-full shadow-md items-center justify-center active:opacity-80">
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ERROR */}
      {error && (
        <TouchableOpacity activeOpacity={0.8} onPress={() => loadProducts()} className="mx-5 mt-4 bg-red-50 rounded-2xl p-4 border border-red-200 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <View>
              <Text className="text-sm font-black text-red-700">Couldn't load products</Text>
              <Text className="text-xs text-red-500 font-medium">{error}</Text>
            </View>
          </View>
          <Ionicons name="refresh" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}

      {/* LIST */}
      <View className="flex-1">
        {loading && !refreshing ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FF7A00" />
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mt-3">Loading Catalog...</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={item => item.id?.toString() || Math.random().toString()}
            renderItem={renderProduct}
            contentContainerStyle={{ padding: 20, paddingBottom: 100, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7A00']} />}
            ListHeaderComponent={
              products.length > 0 ? (
                <Animated.View entering={FadeInUp.duration(400)} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex-row items-center justify-between mb-5">
                  <View className="items-center flex-1">
                    <Text className="text-lg font-black text-gray-900">{products.length}</Text>
                    <Text className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Total</Text>
                  </View>
                  <View className="h-8 w-[1px] bg-gray-200" />
                  <View className="items-center flex-1">
                    <Text className="text-lg font-black text-green-600">
                      {products.filter(p => p.isAvailable !== false && p.stockQuantity > 0).length}
                    </Text>
                    <Text className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Active</Text>
                  </View>
                  <View className="h-8 w-[1px] bg-gray-200" />
                  <View className="items-center flex-1">
                    <Text className="text-lg font-black text-red-500">
                      {products.filter(p => p.stockQuantity <= 0).length}
                    </Text>
                    <Text className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Out of Stock</Text>
                  </View>
                </Animated.View>
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center mt-20">
                <View className="w-24 h-24 bg-orange-50 rounded-full items-center justify-center mb-6 border border-orange-100">
                  <Ionicons name="cube-outline" size={48} color="#FF7A00" />
                </View>
                <Text className="text-xl font-black text-gray-900">Your Shelf is Empty</Text>
                <Text className="text-sm font-semibold text-gray-500 text-center max-w-[250px] mt-2 mb-8">
                  Get eyes on your shop by adding your very first product.
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT, { shopId })} className="bg-[#FF7A00] px-6 py-3.5 rounded-full flex-row items-center gap-2 shadow-lg active:scale-95" style={{ shadowColor: '#FF7A00' }}>
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text className="text-sm font-black text-white uppercase tracking-widest">Add Product</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};