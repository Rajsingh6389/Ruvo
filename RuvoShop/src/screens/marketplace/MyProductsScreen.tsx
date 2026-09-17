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

export const MyProductsScreen = ({ navigation, route }: any) => {
  const { token, user, userId } = useAuth();

  const [shopId, setShopId] = useState<string | undefined>(route.params?.shopId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      await updateAvailability(
        product.id,
        value,
        token
      );
    } catch (err: any) {
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

          </View>
        </View>
      </Animated.View>
    );
  };

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

