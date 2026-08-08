import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getShopById, Shop } from '../../services/shopService';
import { getProductsByShop, Product } from '../../services/productService';

const PRIMARY = '#2E7D32';
const PRIMARY_DARK = '#256B2A';
const PRIMARY_LIGHT = '#E8F5E9';
const BG = '#F7F8FA';
const TEXT = '#1A1A1A';
const SUBTEXT = '#6B7280';
const BORDER = '#E5E7EB';
const CARD = '#FFFFFF';
const MUTED = '#F3F4F6';
const BANNER_HEIGHT = 190;

const formatTime = (time?: string) => {
  if (!time) return null;

  const [h, m] = time.split(':');
  const hour = Number(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = ((hour + 11) % 12) + 1;

  return `${displayHour}:${m} ${period}`;
};

export const ShopDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const shopId = route.params?.shopId;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (!shopId) {
      console.log('❌ No shopId:', shopId);
      setError('No shop ID provided');
      setLoading(false);
      return;
    }

    const loadShop = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedShop = await getShopById(shopId);
        setShop(fetchedShop);
      } catch (error) {
        console.log('❌ Shop API error:', error);
        setError('Failed to load shop');
      }

      try {
        const fetchedProducts = await getProductsByShop(shopId);
        setProducts(fetchedProducts || []);
      } catch (error) {
        console.log('❌ Product API error:', error);
        // Product failure should NOT hide the shop.
        setProducts([]);
      }

      setLoading(false);
    };

    loadShop();
  }, [shopId]);

  const productCategories = useMemo(() => {
    const seen = new Set<string>();

    products.forEach(product => {
      if (product.category) {
        seen.add(product.category);
      }
    });

    return ['All', ...Array.from(seen).sort()];
  }, [products]);

  const visibleProducts = useMemo(() => {
    let list = products;

    if (activeCategory !== 'All') {
      list = list.filter(product => product.category === activeCategory);
    }

    const query = searchText.trim().toLowerCase();

    if (query) {
      list = list.filter(
        product =>
          product.name?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query),
      );
    }

    return list;
  }, [products, activeCategory, searchText]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />

        <View style={styles.loadingIcon}>
          <Ionicons name="storefront-outline" size={30} color={PRIMARY} />
        </View>

        <Text style={styles.loadingTitle}>Opening shop...</Text>
        <Text style={styles.loadingSubtitle}>
          Getting the latest products for you
        </Text>

        <ActivityIndicator
          size="small"
          color={PRIMARY}
          style={styles.loadingSpinner}
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />

        <View style={styles.errorIcon}>
          <Ionicons name="cloud-offline-outline" size={34} color="#E53935" />
        </View>

        <Text style={styles.errorTitle}>Unable to load shop</Text>
        <Text style={styles.errorSubtitle}>
          Please check your connection and try again.
        </Text>

        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />

        <View style={styles.emptyShopIcon}>
          <Ionicons name="storefront-outline" size={36} color={SUBTEXT} />
        </View>

        <Text style={styles.errorTitle}>Shop not found</Text>

        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const openTime = formatTime(shop.openingTime as unknown as string);
  const closeTime = formatTime(shop.closingTime as unknown as string);

  const renderProduct = ({ item }: { item: Product }) => {
    const isAvailable = item.isAvailable ?? true;

    const discount =
      item.discount != null && item.discount > 0
        ? `${item.discount}% OFF`
        : item.actualPrice &&
            item.sellingPrice &&
            item.actualPrice > item.sellingPrice
          ? `${Math.round(
              ((item.actualPrice - item.sellingPrice) /
                item.actualPrice) *
                10000,
            ) / 100}% OFF`
          : null;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={[
          styles.productCard,
          !isAvailable && styles.productCardUnavailable,
        ]}
        onPress={() =>
    navigation.navigate('ProductDetails', {
      product: item,
    })
  }
      >
        <View style={styles.productImageWrap}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={25} color="#BFC5CC" />
            </View>
          )}

          {discount ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discount}</Text>
            </View>
          ) : null}

          {!isAvailable ? (
            <View style={styles.imageDisabledOverlay} />
          ) : null}
        </View>

        <View style={styles.productInfo}>
          <View style={styles.productTopRow}>
            <Text
              style={styles.productName}
              numberOfLines={2}
            >
              {item.name}
            </Text>

            <Ionicons
              name="chevron-forward"
              size={16}
              color="#A0A6AD"
            />
          </View>

          {item.unit ? (
            <Text style={styles.productUnit} numberOfLines={1}>
              {item.unit}
            </Text>
          ) : null}

          {item.description ? (
            <Text
              style={styles.productDescription}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              ₹{item.sellingPrice?.toFixed(0)}
            </Text>

            {item.actualPrice &&
            item.actualPrice !== item.sellingPrice ? (
              <Text style={styles.mrpPrice}>
                ₹{item.actualPrice?.toFixed(0)}
              </Text>
            ) : null}
          </View>

          <View style={styles.productBottomRow}>
            {isAvailable ? (
              <TouchableOpacity
                style={styles.addBtn}
                activeOpacity={0.75}
                  onPress={() => {
    // existing add-to-cart function
  }}
              >
                <Ionicons name="add" size={15} color={PRIMARY} />
                <Text style={styles.addBtnText}>ADD</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.outOfStockBadge}>
                <Ionicons
                  name="close-circle-outline"
                  size={14}
                  color="#D32F2F"
                />
                <Text style={styles.outOfStockText}>
                  Out of stock
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={visibleProducts}
        keyExtractor={item =>
          item.id?.toString() ?? Math.random().toString()
        }
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyProducts}>
            <View style={styles.emptyProductsIcon}>
              <Ionicons
                name={
                  searchText || activeCategory !== 'All'
                    ? 'search-outline'
                    : 'basket-outline'
                }
                size={34}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.emptyProductsTitle}>
              {searchText || activeCategory !== 'All'
                ? 'No products found'
                : 'No products yet'}
            </Text>

            <Text style={styles.emptyProductsText}>
              {searchText || activeCategory !== 'All'
                ? 'Try another search or category.'
                : 'This shop has not added products yet.'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            {/* HERO */}

            <View style={styles.bannerWrap}>
              {shop.bannerUrl ? (
                <Image
                  source={{ uri: shop.bannerUrl }}
                  style={styles.banner}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.banner, styles.bannerFallback]}>
                  <Ionicons
                    name="storefront-outline"
                    size={60}
                    color="rgba(46,125,50,0.25)"
                  />
                </View>
              )}

              <View style={styles.bannerOverlay} />

              <View style={styles.heroTopBar}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.navBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-back"
                    size={21}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <View style={styles.heroLabel}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color="#FFFFFF"
                  />
                  <Text style={styles.heroLabelText}>
                    LOCAL SHOP
                  </Text>
                </View>
              </View>

              <View style={styles.logoWrap}>
                {shop.logoUrl ? (
                  <Image
                    source={{ uri: shop.logoUrl }}
                    style={styles.logo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.logo, styles.logoFallback]}>
                    <Ionicons
                      name="storefront-outline"
                      size={28}
                      color={PRIMARY}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* SHOP INFORMATION */}

            <View style={styles.infoCard}>
              <View style={styles.infoTitleRow}>
                <View style={styles.titleContent}>
                  <Text
                    style={styles.shopName}
                    numberOfLines={2}
                  >
                    {shop.name}
                  </Text>

                  {shop.category ? (
                    <Text style={styles.shopCategory}>
                      {shop.category}
                    </Text>
                  ) : null}
                </View>

                {shop.approved === false ? (
                  <View style={styles.pendingBadge}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.pendingText}>
                      Pending
                    </Text>
                  </View>
                ) : (
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={PRIMARY}
                    />
                    <Text style={styles.verifiedText}>
                      Verified
                    </Text>
                  </View>
                )}
              </View>

              {/* SHOP META */}

              <View style={styles.badgeRow}>
                {typeof shop.rating === 'number' ? (
                  <View style={styles.badge}>
                    <Ionicons
                      name="star"
                      size={13}
                      color="#F59E0B"
                    />
                    <Text style={styles.badgeText}>
                      {shop.rating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}

                {shop.deliveryAvailable ? (
                  <View style={styles.badge}>
                    <Ionicons
                      name="bicycle-outline"
                      size={14}
                      color={PRIMARY}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: PRIMARY },
                      ]}
                    >
                      Delivery
                    </Text>
                  </View>
                ) : null}

                {openTime && closeTime ? (
                  <View style={styles.badge}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={SUBTEXT}
                    />
                    <Text style={styles.badgeText}>
                      {openTime} - {closeTime}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* ADDRESS */}

              {shop.address ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={PRIMARY}
                    />
                  </View>

                  <Text
                    style={styles.shopAddress}
                    numberOfLines={2}
                  >
                    {shop.address}
                  </Text>
                </View>
              ) : null}

              {/* PHONE */}

              {shop.phone ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons
                      name="call-outline"
                      size={15}
                      color={PRIMARY}
                    />
                  </View>

                  <Text style={styles.shopAddress}>
                    {shop.phone}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* SHOPPING SEARCH */}

            <View style={styles.searchWrap}>
              <View style={styles.searchIconWrap}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={SUBTEXT}
                />
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Search products in this shop"
                placeholderTextColor="#9CA3AF"
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />

              {searchText ? (
                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  hitSlop={{
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10,
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* CATEGORIES */}

            {productCategories.length > 1 ? (
              <FlatList
                data={productCategories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={category => category}
                contentContainerStyle={styles.chipRow}
                renderItem={({ item: category }) => {
                  const active = category === activeCategory;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        active && styles.chipActive,
                      ]}
                      activeOpacity={0.75}
                      onPress={() =>
                        setActiveCategory(category)
                      }
                    >
                      {active ? (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={PRIMARY}
                        />
                      ) : null}

                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            ) : null}

            {/* PRODUCT HEADER */}

            <View style={styles.productsHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {activeCategory === 'All'
                    ? 'Shop Products'
                    : activeCategory}
                </Text>

                <Text style={styles.sectionSubtitle}>
                  {visibleProducts.length === 0
                    ? 'Nothing available right now'
                    : `${visibleProducts.length} ${
                        visibleProducts.length === 1
                          ? 'product'
                          : 'products'
                      } available`}
                </Text>
              </View>

              <View style={styles.productCount}>
                <Text style={styles.productCountText}>
                  {visibleProducts.length}
                </Text>
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
    paddingHorizontal: 24,
  },

  /* LOADING / ERROR */

  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },

  loadingSubtitle: {
    color: SUBTEXT,
    fontSize: 12,
    marginTop: 5,
  },

  loadingSpinner: {
    marginTop: 16,
  },

  errorIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyShopIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: MUTED,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  errorTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  errorSubtitle: {
    color: SUBTEXT,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },

  backBtn: {
    backgroundColor: PRIMARY,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  /* HERO */

  bannerWrap: {
    height: BANNER_HEIGHT,
    backgroundColor: PRIMARY_LIGHT,
    position: 'relative',
  },

  banner: {
    width: '100%',
    height: '100%',
  },

  bannerFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },

  heroTopBar: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroLabel: {
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.34)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  heroLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  logoWrap: {
    position: 'absolute',
    bottom: -31,
    left: 16,
    width: 72,
    height: 72,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    padding: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },

  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_LIGHT,
  },

  /* SHOP INFO */

  infoCard: {
    backgroundColor: CARD,
    paddingTop: 42,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  titleContent: {
    flex: 1,
  },

  shopName: {
    fontSize: 23,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: -0.4,
  },

  shopCategory: {
    fontSize: 13,
    color: PRIMARY,
    marginTop: 3,
    fontWeight: '700',
  },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },

  verifiedText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: '800',
  },

  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7E6',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },

  pendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },

  pendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BG,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    gap: 8,
  },

  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  shopAddress: {
    fontSize: 12,
    color: SUBTEXT,
    lineHeight: 17,
    flex: 1,
  },

  /* SEARCH */

  searchWrap: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  searchIconWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT,
    padding: 0,
  },

  /* CATEGORIES */

  chipRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },

  chip: {
    height: 35,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  chipActive: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },

  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: SUBTEXT,
  },

  chipTextActive: {
    color: PRIMARY,
  },

  /* PRODUCT HEADER */

  productsHeader: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: TEXT,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: SUBTEXT,
    marginTop: 3,
  },

  productCount: {
    minWidth: 34,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  productCountText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '900',
  },

  /* PRODUCT CARD */

  list: {
    paddingBottom: 32,
  },

  productCard: {
    minHeight: 126,
    flexDirection: 'row',
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginBottom: 11,
    borderRadius: 16,
    padding: 9,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.045,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  productCardUnavailable: {
    opacity: 0.72,
  },

  productImageWrap: {
    width: 108,
    height: 108,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: MUTED,
    position: 'relative',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MUTED,
  },

  imageDisabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: PRIMARY,
  },

  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },

  productInfo: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 11,
    paddingVertical: 2,
    justifyContent: 'space-between',
  },

  productTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },

  productName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: TEXT,
  },

  productUnit: {
    fontSize: 10.5,
    color: SUBTEXT,
    marginTop: 2,
  },

  productDescription: {
    fontSize: 10,
    color: SUBTEXT,
    marginTop: 3,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
  },

  productPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT,
  },

  mrpPrice: {
    fontSize: 10.5,
    color: SUBTEXT,
    textDecorationLine: 'line-through',
  },

  productBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  addBtn: {
    minWidth: 64,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1,
    borderColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  addBtnText: {
    color: PRIMARY_DARK,
    fontWeight: '900',
    fontSize: 10.5,
    letterSpacing: 0.3,
  },

  outOfStockBadge: {
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  outOfStockText: {
    color: '#D32F2F',
    fontWeight: '800',
    fontSize: 10,
  },

  /* EMPTY PRODUCTS */

  emptyProducts: {
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 55,
  },

  emptyProductsIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  emptyProductsTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
  },

  emptyProductsText: {
    color: SUBTEXT,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
});

export default ShopDetailsScreen;