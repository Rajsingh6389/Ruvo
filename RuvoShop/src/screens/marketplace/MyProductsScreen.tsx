import React, { useCallback, useEffect, useState } from 'react';
import {
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
<<<<<<< HEAD

import Animated, { FadeInUp } from 'react-native-reanimated';

=======
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
import { useAuth } from '../../context/AuthContext';
import { deleteProduct, getProductsByShop, updateAvailability, Product } from '../../services/productService';
import { ROUTES } from '../../constants/routes';
import { API_BASE_URL } from '../../config/api';

<<<<<<< HEAD
export const MyProductsScreen = ({ navigation, route }: any) => {
  const { token } = useAuth();
  const shopId = route.params?.shopId;
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7

  const [shopId, setShopId] = useState<string | undefined>(route.params?.shopId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

<<<<<<< HEAD
  // ============================================================
  // LOAD PRODUCTS
  // ============================================================

  const loadProducts = useCallback(
    async (showLoader = true) => {
      if (!shopId || !token) {
        setError('Shop or authentication information is missing.');
        setLoading(false);
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      try {
        const data = await getProductsByShop(shopId, token);
        setProducts(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load products.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [shopId, token]
  );
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ============================================================
  // REFRESH
  // ============================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(false);
  };

<<<<<<< HEAD
  // ============================================================
  // AVAILABILITY
  // ============================================================

  const toggleAvailability = async (
    product: Product,
    value: boolean
  ) => {
    if (!product.id || !token) return;

    // Optimistic UI update
    setProducts(current =>
      current.map(item =>
        item.id === product.id
          ? {
              ...item,
              isAvailable: value,
            }
          : item
      )
    );

=======
  const toggleAvailability = async (product: Product, value: boolean) => {
    if (!product.id || !token) return;
    setProducts(current => current.map(item => item.id === product.id ? { ...item, isAvailable: value } : item));
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
    try {
      await updateAvailability(
        product.id,
        value,
        token
      );
    } catch (err: any) {
<<<<<<< HEAD
      // Rollback
      setProducts(current =>
        current.map(item =>
          item.id === product.id
            ? {
                ...item,
                isAvailable: !value,
              }
            : item
        )
      );

      Alert.alert(
        'Update failed',
        err?.message || 'Could not update value.'
      );
=======
      setProducts(current => current.map(item => item.id === product.id ? { ...item, isAvailable: !value } : item));
      Alert.alert('Update failed', err?.message || 'Could not update product availability.');
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

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
<<<<<<< HEAD
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              await deleteProduct(
                product.id!,
                token
              );

              setProducts(current =>
                current.filter(
                  item => item.id !== product.id
                )
              );
            } catch (err: any) {
              Alert.alert(
                'Delete failed',
                err?.message ||
                  'Could not delete product.'
              );
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // PRODUCT CARD
  // ============================================================

  const renderProduct = ({
    item,
    index,
  }: {
    item: Product;
    index: number;
  }) => {
    const available =
      item.isAvailable !== false &&
      item.stockQuantity > 0;

    const actualPrice =
      typeof item.actualPrice === 'number'
        ? item.actualPrice
        : 0;

    const sellingPrice =
      typeof item.sellingPrice === 'number'
        ? item.sellingPrice
        : 0;

    const discount =
      item.discount ??
      (actualPrice > sellingPrice &&
      actualPrice > 0
        ? Math.round(
            ((actualPrice - sellingPrice) /
              actualPrice) *
              100
          )
        : 0);

    return (
      <Animated.View
        entering={FadeInUp
          .delay(index * 70)
          .duration(300)}
        className="mb-3"
      >
        {/* ====================================================
            PRODUCT CARD
        ==================================================== */}

        <View className="bg-ruvo-surface border border-warm-200 rounded-[20px] overflow-hidden shadow-sm">

          {/* TOP CONTENT */}
          <View className="flex-row">

            {/* PRODUCT IMAGE */}
            <View className="w-[112px] h-[142px] bg-warm-100 relative overflow-hidden">

              {item.imageUrl ? (
                <Image
                  source={{
                    uri: item.imageUrl,
                  }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <View className="w-12 h-12 rounded-full bg-warm-50 items-center justify-center">
                    <Ionicons
                      name="image-outline"
                      size={25}
                      color="#A79E92"
                    />
                  </View>
                </View>
              )}

              {/* DISCOUNT BADGE */}
              {discount > 0 && (
                <View className="absolute top-2 left-2 bg-ruvo-yellow px-2.5 py-1 rounded-full shadow-sm">
                  <Text className="text-[9px] font-black text-ruvo-ink">
                    {discount}% OFF
                  </Text>
                </View>
              )}
            </View>

            {/* PRODUCT INFORMATION */}
            <View className="flex-1 p-3">

              {/* NAME + STATUS */}
              <View className="flex-row items-start">

                <View className="flex-1 pr-2">

                  <Text
                    className="text-[16px] font-black text-ruvo-ink leading-[19px]"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  {item.brandName ? (
                    <Text
                      className="text-[10px] font-semibold text-warm-500 mt-1"
                      numberOfLines={1}
                    >
                      {item.brandName}
                    </Text>
                  ) : null}

                </View>

                {/* STATUS */}
                <View
                  className={`px-2 py-1 rounded-full flex-row items-center ${
                    available
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}
                >
                  <View
                    className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      available
                        ? 'bg-green-600'
                        : 'bg-red-600'
                    }`}
                  />

                  <Text
                    className={`text-[8px] font-black ${
                      available
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}
                  >
                    {available
                      ? 'ACTIVE'
                      : 'OFFLINE'}
                  </Text>
                </View>

              </View>

              {/* PRICE */}
              <View className="flex-row items-baseline mt-2">

                <Text className="text-[21px] font-black text-ruvo-ink">
                  ₹{sellingPrice}
                </Text>

                {actualPrice > sellingPrice && (
                  <Text className="text-[12px] font-bold text-warm-400 line-through ml-2">
                    ₹{actualPrice}
                  </Text>
                )}

                {item.unit && (
                  <Text className="text-[10px] font-semibold text-warm-500 ml-1">
                    /{item.unit}
                  </Text>
                )}

              </View>

              {/* STOCK */}
              <View className="flex-row items-center justify-between mt-2.5 bg-warm-50 border border-warm-200 rounded-[10px] px-2.5 py-1.5">

                <View className="flex-row items-center flex-1">

                  <Ionicons
                    name="cube-outline"
                    size={14}
                    color="#8F8579"
                  />

                  <Text
                    className={`text-[10px] font-bold ml-1.5 ${
                      item.stockQuantity <= 0
                        ? 'text-red-600'
                        : 'text-warm-600'
                    }`}
                    numberOfLines={1}
                  >
                    {item.stockQuantity <= 0
                      ? 'Out of stock'
                      : `${item.stockQuantity} in stock`}
                  </Text>

                </View>

                <Switch
                  value={available}
                  onValueChange={value =>
                    toggleAvailability(
                      item,
                      value
                    )
                  }
                  trackColor={{
                    false: '#E5E7EB',
                    true: '#F5B700',
                  }}
                  thumbColor="#FFFFFF"
                  style={{
                    transform: [
                      {
                        scaleX: 0.72,
                      },
                      {
                        scaleY: 0.72,
                      },
                    ],
                    marginRight: -5,
                  }}
                />

              </View>

            </View>
          </View>

          {/* ==================================================
              ACTION BAR
          ================================================== */}

          <View className="flex-row border-t border-warm-100 px-3 py-2 gap-2">

            {/* EDIT */}
            <TouchableOpacity
              activeOpacity={0.75}
              className="flex-1 h-9 bg-warm-50 border border-warm-200 rounded-[10px] flex-row items-center justify-center"
              onPress={() =>
                navigation.navigate(
                  ROUTES.EDIT_PRODUCT,
                  {
                    product: item,
                    productId: item.id,
                    shopId,
                  }
                )
              }
            >
              <Ionicons
                name="create-outline"
                size={15}
                color="#5F554B"
              />

              <Text className="text-[11px] font-black text-ruvo-ink ml-1.5">
                EDIT
              </Text>
            </TouchableOpacity>

            {/* DELETE */}
            <TouchableOpacity
              activeOpacity={0.75}
              className="flex-1 h-9 bg-red-50 border border-red-100 rounded-[10px] flex-row items-center justify-center"
              onPress={() =>
                confirmDelete(item)
              }
            >
              <Ionicons
                name="trash-outline"
                size={15}
                color="#DC2626"
              />

              <Text className="text-[11px] font-black text-red-600 ml-1.5">
                DELETE
              </Text>
            </TouchableOpacity>

=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
          </View>
        </View>
      </Animated.View>
    );
  };

<<<<<<< HEAD
  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <View className="flex-1 bg-ruvo-bg">

        <View className="bg-ruvo-yellow pt-3 pb-5">
          <View className="px-4 pt-3">
            <Text className="text-[22px] font-black text-ruvo-ink">
              My Products
            </Text>
            <Text className="text-[11px] font-bold text-ruvo-ink/60 mt-0.5">
              Manage stock, prices & catalogue
            </Text>
          </View>
        </View>

        <OfflineBar />

        <View className="px-4 pt-5">
          <ProductSkeleton count={6} />
        </View>

      </View>
    );
  }

  // ============================================================
  // COUNTERS
  // ============================================================

  const activeCount = products.filter(
    p =>
      p.isAvailable !== false &&
      p.stockQuantity > 0
  ).length;

  const oosCount = products.filter(
    p => p.stockQuantity <= 0
  ).length;

  // ============================================================
  // MAIN SCREEN
  // ============================================================

  return (
    <View className="flex-1 bg-ruvo-bg">

      {/* ======================================================
          ORANGE / YELLOW HEADER
      ====================================================== */}

      <View className="bg-ruvo-yellow pt-3">

        <View className="px-4 pt-3 pb-5 flex-row items-center">

          {/* BACK */}
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.8}
            className="w-11 h-11 bg-white/90 rounded-[14px] items-center justify-center shadow-sm"
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color="#171A1F"
            />
          </TouchableOpacity>

          {/* TITLE */}
          <View className="flex-1 ml-3">

            <Text className="text-[22px] font-black text-ruvo-ink">
              My Products
            </Text>

            <Text className="text-[11px] font-bold text-ruvo-ink/60 mt-0.5">
              Manage stock, prices & catalogue
            </Text>

          </View>

          {/* ADD PRODUCT */}
          <TouchableOpacity
            activeOpacity={0.8}
            className="w-11 h-11 bg-ruvo-ink rounded-[14px] items-center justify-center shadow-sm"
            onPress={() =>
              navigation.navigate(
                ROUTES.ADD_PRODUCT,
                { shopId }
              )
            }
          >
            <Ionicons
              name="add"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

        </View>

      </View>

      {/* OFFLINE BAR */}
      <OfflineBar />

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <View className="mx-4 mt-4 mb-1 bg-white rounded-[18px] border border-warm-200 px-2 py-3 flex-row items-center shadow-sm">

        {/* TOTAL */}
        <View className="flex-1 items-center">

          <Text className="text-[20px] font-black text-ruvo-ink">
            {products.length}
          </Text>

          <Text className="text-[9px] font-black text-warm-500 uppercase tracking-wider mt-0.5">
            Total
          </Text>

        </View>

        <View className="w-px h-8 bg-warm-200" />

        {/* ACTIVE */}
        <View className="flex-1 items-center">

          <Text className="text-[20px] font-black text-green-600">
            {activeCount}
          </Text>

          <Text className="text-[9px] font-black text-warm-500 uppercase tracking-wider mt-0.5">
            Active
          </Text>

        </View>

        <View className="w-px h-8 bg-warm-200" />

        {/* OUT OF STOCK */}
        <View className="flex-1 items-center">

          <Text
            className={`text-[20px] font-black ${
              oosCount > 0
                ? 'text-red-500'
                : 'text-ruvo-ink'
            }`}
          >
            {oosCount}
          </Text>

          <Text className="text-[9px] font-black text-warm-500 uppercase tracking-wider mt-0.5">
            No Stock
          </Text>

        </View>

      </View>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            loadProducts()
          }
          className="mx-4 mt-3 p-3.5 bg-red-50 rounded-[16px] border border-red-200 flex-row items-center"
        >

          <Ionicons
            name="alert-circle"
            size={22}
            color="#DC2626"
          />

          <View className="flex-1 ml-3">

            <Text className="text-[12px] font-black text-red-700">
              Failed to load
            </Text>

            <Text className="text-[10px] font-semibold text-red-600 mt-0.5">
              {error}
            </Text>

          </View>

          <Ionicons
            name="refresh"
            size={19}
            color="#DC2626"
          />

        </TouchableOpacity>
      )}

      {/* ======================================================
          PRODUCT LIST
      ====================================================== */}

      <FlatList
        data={products}
        keyExtractor={(item, idx) =>
          item.id?.toString() ??
          `prod-${idx}`
        }
        renderItem={renderProduct}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 60,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F5B700"
            colors={['#F5B700']}
          />
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View className="flex-1 items-center justify-center px-6">

              {/* EMPTY ICON */}
              <View className="w-20 h-20 bg-warm-50 rounded-full items-center justify-center border border-warm-200 mb-4">

                <Ionicons
                  name="cube-outline"
                  size={36}
                  color="#D97706"
                />

              </View>

              <Text className="text-[20px] font-black text-ruvo-ink mb-2">
                No products yet
              </Text>

              <Text className="text-[12px] font-semibold text-warm-600 text-center leading-5 mb-5">
                Add your first product to showcase your offerings to customers.
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                className="bg-ruvo-ink px-6 py-3.5 rounded-[15px] flex-row items-center"
                onPress={() =>
                  navigation.navigate(
                    ROUTES.ADD_PRODUCT,
                    { shopId }
                  )
                }
              >

                <Ionicons
                  name="add-circle"
                  size={19}
                  color="#FFF"
                />

                <Text className="text-[13px] font-black text-white ml-2">
                  Add First Product
                </Text>

              </TouchableOpacity>

            </View>
          ) : null
        }
      />

    </View>
  );
};

export default MyProductsScreen;
=======
  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* HEADER */}
      <View className="bg-white px-6 py-4 shadow-sm border-b border-gray-100 z-10 flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => navigation.openDrawer ? navigation.openDrawer() : navigation.goBack()} className="w-10 h-10 bg-gray-50 rounded-full border border-gray-100 items-center justify-center active:bg-gray-100">
            <Ionicons name="menu-outline" size={24} color="#111827" />
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
