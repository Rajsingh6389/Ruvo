import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  deleteProduct,
  getProductsByShop,
  updateAvailability,
  Product,
} from '../../services/productService';
import { ROUTES } from '../../constants/routes';

const GREEN = '#2E7D32';
const LIGHT_GREEN = '#E8F5E9';
const BG = '#F7F8FA';
const TEXT = '#1A1A1A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';
const RED = '#D32F2F';

export const MyProductsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { token } = useAuth();

  const shopId = route.params?.shopId;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    [shopId, token],
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(false);
  };

  const toggleAvailability = async (
    product: Product,
    value: boolean,
  ) => {
    if (!product.id || !token) return;

    setProducts(current =>
      current.map(item =>
        item.id === product.id
          ? { ...item, isAvailable: value }
          : item,
      ),
    );

    try {
      await updateAvailability(product.id, value, token);
    } catch (err: any) {
      setProducts(current =>
        current.map(item =>
          item.id === product.id
            ? { ...item, isAvailable: !value }
            : item,
        ),
      );

      Alert.alert(
        'Update failed',
        err?.message || 'Could not update product availability.',
      );
    }
  };

  const confirmDelete = (product: Product) => {
    if (!product.id || !token) return;

    Alert.alert(
      'Delete product?',
      `"${product.name}" will be permanently removed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id!, token);

              setProducts(current =>
                current.filter(item => item.id !== product.id),
              );
            } catch (err: any) {
              Alert.alert(
                'Delete failed',
                err?.message || 'Could not delete product.',
              );
            }
          },
        },
      ],
    );
  };

  const renderProduct = ({
    item,
  }: {
    item: Product;
  }) => {
    const available =
      item.isAvailable !== false && item.stockQuantity > 0;

    const discount =
      item.discount ??
      (item.actualPrice > item.sellingPrice
        ? Math.round(
            ((item.actualPrice - item.sellingPrice) /
              item.actualPrice) *
              100,
          )
        : 0);

    return (
      <View style={styles.productCard}>
        {/* IMAGE */}

        <View style={styles.imageWrap}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <Ionicons
                name="image-outline"
                size={34}
                color="#B8C0B9"
              />
            </View>
          )}

          {discount > 0 ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {discount}% OFF
              </Text>
            </View>
          ) : null}
        </View>

        {/* PRODUCT INFO */}

        <View style={styles.productBody}>
          <View style={styles.topRow}>
            <View style={styles.nameArea}>
              <Text
                style={styles.productName}
                numberOfLines={2}
              >
                {item.name}
              </Text>

              {item.brandName ? (
                <Text
                  style={styles.brand}
                  numberOfLines={1}
                >
                  {item.brandName}
                </Text>
              ) : null}
            </View>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: available
                    ? LIGHT_GREEN
                    : '#FDECEC',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: available
                      ? GREEN
                      : RED,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: available
                      ? GREEN
                      : RED,
                  },
                ]}
              >
                {available ? 'Active' : 'Unavailable'}
              </Text>
            </View>
          </View>

          {/* PRICE */}

          <View style={styles.priceRow}>
            <Text style={styles.sellingPrice}>
              ₹{item.sellingPrice}
            </Text>

            {item.actualPrice > item.sellingPrice ? (
              <Text style={styles.actualPrice}>
                ₹{item.actualPrice}
              </Text>
            ) : null}

            {item.unit ? (
              <Text style={styles.unit}>
                / {item.unit}
              </Text>
            ) : null}
          </View>

          {/* STOCK */}

          <View style={styles.stockRow}>
            <View style={styles.stockInfo}>
              <Ionicons
                name="cube-outline"
                size={14}
                color={MUTED}
              />

              <Text style={styles.stockText}>
                {item.stockQuantity} in stock
              </Text>
            </View>

            <View style={styles.availabilityControl}>
              <Text style={styles.availabilityLabel}>
                Available
              </Text>

              <Switch
                value={available}
                onValueChange={value =>
                  toggleAvailability(item, value)
                }
                trackColor={{
                  false: '#D9DEDA',
                  true: '#9CCC9F',
                }}
                thumbColor={
                  available ? GREEN : '#FFFFFF'
                }
              />
            </View>
          </View>

          {/* ACTIONS */}

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.editButton}
              onPress={() =>
                navigation.navigate(
                  ROUTES.EDIT_PRODUCT,
                  {
                    productId: item.id,
                    shopId,
                  },
                )
              }
            >
              <Ionicons
                name="create-outline"
                size={17}
                color={GREEN}
              />

              <Text style={styles.editText}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.deleteButton}
              onPress={() => confirmDelete(item)}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={RED}
              />

              <Text style={styles.deleteText}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.loadingIcon}>
          <Ionicons
            name="cube-outline"
            size={25}
            color={GREEN}
          />
        </View>

        <ActivityIndicator
          size="small"
          color={GREEN}
          style={{ marginTop: 12 }}
        />

        <Text style={styles.loadingText}>
          Loading your products...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={TEXT}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleArea}>
            <Text style={styles.title}>
              My Products
            </Text>

            <Text style={styles.subtitle}>
              Manage products in your shop
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.addButton}
            onPress={() =>
              navigation.navigate(
                ROUTES.ADD_PRODUCT,
                { shopId },
              )
            }
          >
            <Ionicons
              name="add"
              size={21}
              color={WHITE}
            />
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {products.length}
            </Text>
            <Text style={styles.summaryLabel}>
              Products
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {
                products.filter(
                  p =>
                    p.isAvailable !== false &&
                    p.stockQuantity > 0,
                ).length
              }
            </Text>
            <Text style={styles.summaryLabel}>
              Active
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryNumber,
                {
                  color:
                    products.filter(
                      p => p.stockQuantity <= 0,
                    ).length > 0
                      ? RED
                      : GREEN,
                },
              ]}
            >
              {
                products.filter(
                  p => p.stockQuantity <= 0,
                ).length
              }
            </Text>

            <Text style={styles.summaryLabel}>
              Out of stock
            </Text>
          </View>
        </View>
      </View>

      {/* ERROR */}

      {error ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.errorCard}
          onPress={() => loadProducts()}
        >
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={RED}
          />

          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>
              Couldn't load products
            </Text>

            <Text
              style={styles.errorText}
              numberOfLines={2}
            >
              {error}
            </Text>
          </View>

          <Ionicons
            name="refresh"
            size={19}
            color={RED}
          />
        </TouchableOpacity>
      ) : null}

      {/* LIST */}

      <FlatList
        data={products}
        keyExtractor={(item, index) =>
          item.id?.toString() ?? `product-${index}`
        }
        renderItem={renderProduct}
        contentContainerStyle={[
          styles.list,
          products.length === 0 &&
            styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="cube-outline"
                size={42}
                color={GREEN}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No products yet
            </Text>

            <Text style={styles.emptyText}>
              Add your first product and start
              showcasing your shop on RuVo.
            </Text>

            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.emptyAddButton}
              onPress={() =>
                navigation.navigate(
                  ROUTES.ADD_PRODUCT,
                  { shopId },
                )
              }
            >
              <Ionicons
                name="add"
                size={19}
                color={WHITE}
              />

              <Text style={styles.emptyAddText}>
                Add Product
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 8,
    fontWeight: '600',
  },

  /* HEADER */

  header: {
    backgroundColor: WHITE,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitleArea: {
    flex: 1,
    marginLeft: 11,
  },

  title: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  subtitle: {
    color: MUTED,
    fontSize: 10.5,
    marginTop: 2,
  },

  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCard: {
    minHeight: 67,
    backgroundColor: '#F4FAF4',
    borderRadius: 15,
    marginTop: 13,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '900',
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 9.5,
    marginTop: 2,
    fontWeight: '700',
  },

  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#D7E5D8',
  },

  /* ERROR */

  errorCard: {
    marginHorizontal: 15,
    marginTop: 10,
    padding: 11,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F2D1D1',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorCopy: {
    flex: 1,
    marginHorizontal: 9,
  },

  errorTitle: {
    color: RED,
    fontSize: 11,
    fontWeight: '900',
  },

  errorText: {
    color: '#8D6868',
    fontSize: 9.5,
    marginTop: 2,
  },

  /* LIST */

  list: {
    padding: 12,
    paddingBottom: 35,
  },

  emptyList: {
    flexGrow: 1,
  },

  /* PRODUCT */

  productCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    marginBottom: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    minHeight: 185,
    shadowColor: '#000',
    shadowOpacity: 0.045,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  imageWrap: {
    width: 116,
    height: 165,
    borderRadius: 14,
    backgroundColor: '#FAFBFA',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F2F0',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  discountBadge: {
    position: 'absolute',
    left: 7,
    top: 7,
    backgroundColor: GREEN,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },

  discountText: {
    color: WHITE,
    fontSize: 8.5,
    fontWeight: '900',
  },

  productBody: {
    flex: 1,
    marginLeft: 11,
    paddingVertical: 1,
    minWidth: 0,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  nameArea: {
    flex: 1,
    paddingRight: 5,
  },

  productName: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },

  brand: {
    color: MUTED,
    fontSize: 9.5,
    marginTop: 2,
  },

  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 8,
    fontWeight: '900',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 9,
    flexWrap: 'wrap',
  },

  sellingPrice: {
    color: GREEN,
    fontSize: 19,
    fontWeight: '900',
  },

  actualPrice: {
    color: '#929792',
    fontSize: 10.5,
    marginLeft: 6,
    textDecorationLine: 'line-through',
  },

  unit: {
    color: MUTED,
    fontSize: 9,
    marginLeft: 4,
  },

  stockRow: {
    minHeight: 34,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  stockText: {
    color: MUTED,
    fontSize: 9.5,
    fontWeight: '700',
  },

  availabilityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  availabilityLabel: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: '700',
    marginRight: 1,
  },

  actions: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 9,
  },

  editButton: {
    flex: 1,
    minHeight: 33,
    borderRadius: 9,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },

  editText: {
    color: GREEN,
    fontSize: 9.5,
    fontWeight: '900',
  },

  deleteButton: {
    flex: 1,
    minHeight: 33,
    borderRadius: 9,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F0D6D6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },

  deleteText: {
    color: RED,
    fontSize: 9.5,
    fontWeight: '900',
  },

  /* EMPTY */

  emptyContainer: {
    flex: 1,
    minHeight: 390,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 27,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 15,
  },

  emptyText: {
    color: MUTED,
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },

  emptyAddButton: {
    minHeight: 45,
    paddingHorizontal: 19,
    borderRadius: 13,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 17,
  },

  emptyAddText: {
    color: WHITE,
    fontSize: 11.5,
    fontWeight: '900',
  },
});

export default MyProductsScreen;