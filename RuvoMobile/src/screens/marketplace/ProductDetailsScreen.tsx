import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { placeOrder } from '../../services/orderService';

const GREEN = '#2E7D32';
const LIGHT_GREEN = '#E8F5E9';
const BG = '#F7F8FA';
const TEXT = '#1A1A1A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';

type Product = {
  id?: number;
  shopId?: number;
  name: string;
  category?: string;
  brandName?: string;
  description?: string;
  actualPrice: number;
  sellingPrice: number;
  discount?: number;
  stockQuantity: number;
  unit?: string;
  imageUrl?: string;
  isAvailable?: boolean;
};

/* -------------------------------------------------- */
/* SMALL COMPONENTS */
/* -------------------------------------------------- */

const Benefit = ({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) => (
  <View style={styles.benefit}>
    <Ionicons
      name={icon}
      size={22}
      color={GREEN}
    />
    <View>
      <Text style={styles.benefitTitle}>
        {title}
      </Text>
      <Text style={styles.benefitSubtitle}>
        {subtitle}
      </Text>
    </View>
  </View>
);

const Spec = ({
  icon,
  title,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}) => (
  <View style={styles.spec}>
    <View style={styles.specIcon}>
      <Ionicons
        name={icon}
        size={17}
        color={GREEN}
      />
    </View>
    <Text style={styles.specTitle}>
      {title}
    </Text>
    <Text
      style={styles.specValue}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const parseUnit = (unit: string) => {
  const number = parseFloat(unit);
  if (!Number.isNaN(number) && number > 0) {
    return number;
  }
  return 1;
};

const ProductDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  /*
   * Expected navigation:
   *
   * navigation.navigate(ROUTES.PRODUCT_DETAILS, {
   *   product: item,
   * });
   */

  const product: Product | undefined = route.params?.product;

  const [quantity, setQuantity] = useState(1);
  const [favorite, setFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { isAuthenticated, userId, token, user } = useAuth();

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please login to purchase products.');
      return;
    }
    navigation.navigate('Checkout', { product, quantity });
  };

  const discount = useMemo(() => {
    if (product?.discount !== undefined) {
      return Math.round(product.discount);
    }

    if (
      product?.actualPrice &&
      product.actualPrice > product.sellingPrice
    ) {
      return Math.round(
        ((product.actualPrice - product.sellingPrice) /
          product.actualPrice) *
          100,
      );
    }

    return 0;
  }, [product]);

  if (!product) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={50}
          color={GREEN}
        />

        <Text style={styles.emptyTitle}>
          Product not found
        </Text>

        <TouchableOpacity
          style={styles.backButtonLarge}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const available =
    product.isAvailable !== false &&
    product.stockQuantity > 0;

  const increaseQuantity = () => {
    if (quantity < product.stockQuantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={TEXT}
          />
        </TouchableOpacity>

        <View style={styles.headerRight}>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.75}
            onPress={() => setFavorite(prev => !prev)}
          >
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={23}
              color={favorite ? '#D32F2F' : TEXT}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.75}
          >
            <Ionicons
              name="share-social-outline"
              size={22}
              color={TEXT}
            />
          </TouchableOpacity>

        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* PRODUCT IMAGE */}

        <View style={styles.imageContainer}>

          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <Ionicons
                name="image-outline"
                size={65}
                color="#BFC7C0"
              />

              <Text style={styles.noImageText}>
                No product image
              </Text>
            </View>
          )}

          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {discount}% OFF
              </Text>
            </View>
          )}

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              1 / 1
            </Text>
          </View>

        </View>

        {/* PRODUCT INFO */}

        <View style={styles.productInfoCard}>

          <View style={styles.titleRow}>

            <View style={styles.titleContainer}>
              <Text style={styles.productName}>
                {product.name}
              </Text>

              {product.unit && (
                <Text style={styles.unit}>
                  {product.unit}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor: available
                    ? LIGHT_GREEN
                    : '#FDECEC',
                },
              ]}
            >
              <Text
                style={[
                  styles.stockText,
                  {
                    color: available
                      ? GREEN
                      : '#D32F2F',
                  },
                ]}
              >
                {available
                  ? 'In Stock'
                  : 'Out of Stock'}
              </Text>
            </View>

          </View>

          {/* RATING */}

          <View style={styles.ratingRow}>

            <View style={styles.starBox}>
              <Ionicons
                name="star"
                size={15}
                color="#FFFFFF"
              />

              <Text style={styles.ratingText}>
                4.6
              </Text>
            </View>

            <Text style={styles.reviewText}>
              128 reviews
            </Text>

          </View>

          {/* PRICE */}

          <View style={styles.priceRow}>

            <Text style={styles.sellingPrice}>
              ₹{product.sellingPrice}
            </Text>

            {product.actualPrice >
              product.sellingPrice && (
              <Text style={styles.actualPrice}>
                ₹{product.actualPrice}
              </Text>
            )}

            {discount > 0 && (
              <View style={styles.smallDiscount}>
                <Text style={styles.smallDiscountText}>
                  {discount}% OFF
                </Text>
              </View>
            )}

          </View>

          {product.unit && (
            <Text style={styles.pricePerUnit}>
              ₹
              {(
                product.sellingPrice /
                parseUnit(product.unit)
              ).toFixed(2)}{' '}
              per unit
            </Text>
          )}

          {/* BENEFITS */}

          <View style={styles.benefitsCard}>

            <Benefit
              icon="shield-checkmark-outline"
              title="100%"
              subtitle="Original"
            />

            <View style={styles.benefitDivider} />

            <Benefit
              icon="ribbon-outline"
              title="Quality"
              subtitle="Guaranteed"
            />

            <View style={styles.benefitDivider} />

            <Benefit
              icon="bicycle-outline"
              title="Fast"
              subtitle="Delivery"
            />

          </View>

        </View>

        {/* SHOP */}

        <View style={styles.sectionCard}>

          <View style={styles.shopIcon}>
            <Ionicons
              name="storefront"
              size={25}
              color={GREEN}
            />
          </View>

          <View style={styles.shopInfo}>
            <Text style={styles.soldBy}>
              Sold by
            </Text>

            <Text style={styles.shopName}>
              Local RuVo Shop
            </Text>

            <View style={styles.distanceRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={GREEN}
              />

              <Text style={styles.distance}>
                Nearby shop
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.viewShopButton}
            onPress={() => {
              if (product.shopId) {
                navigation.navigate('ShopDetails', {
                  shopId: product.shopId,
                });
              }
            }}
          >
            <Text style={styles.viewShopText}>
              View Shop
            </Text>
          </TouchableOpacity>

        </View>

        {/* PRODUCT DETAILS */}

        <View style={styles.detailsCard}>

          <Text style={styles.sectionTitle}>
            Product Details
          </Text>

          <Text style={styles.description}>
            {product.description ||
              'Quality product available from your nearby local shop on RuVo.'}
          </Text>

          <View style={styles.specsRow}>

            <Spec
              icon="pricetag-outline"
              title="Brand"
              value={product.brandName || 'N/A'}
            />

            <View style={styles.specDivider} />

            <Spec
              icon="cube-outline"
              title="Category"
              value={product.category || 'General'}
            />

            <View style={styles.specDivider} />

            <Spec
              icon="layers-outline"
              title="Stock"
              value={`${product.stockQuantity}`}
            />

          </View>

        </View>

        {/* QUANTITY */}

        {available && (
          <View style={styles.quantityCard}>

            <Text style={styles.quantityTitle}>
              Quantity
            </Text>

            <View style={styles.quantityControls}>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.quantityButton}
                onPress={decreaseQuantity}
              >
                <Ionicons
                  name="remove"
                  size={19}
                  color={GREEN}
                />
              </TouchableOpacity>

              <Text style={styles.quantityValue}>
                {quantity}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.quantityButton}
                onPress={increaseQuantity}
              >
                <Ionicons
                  name="add"
                  size={19}
                  color={GREEN}
                />
              </TouchableOpacity>

            </View>

          </View>
        )}

        <View style={{ height: 110 }} />

      </ScrollView>

      {/* BOTTOM ACTIONS */}

      <View style={styles.bottomBar}>

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={!available}
          style={[
            styles.addCartButton,
            !available && styles.disabledButton,
          ]}
          onPress={handleBuyNow}
        >
          <Ionicons
            name="cart-outline"
            size={21}
            color={WHITE}
          />

          <Text style={styles.addCartText}>
            Add to Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={!available || submitting}
          style={[
            styles.buyButton,
            (!available || submitting) && styles.disabledOutlineButton,
          ]}
          onPress={handleBuyNow}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={GREEN} />
          ) : (
            <Text
              style={[
                styles.buyText,
                !available && styles.disabledText,
              ]}
            >
              Buy Now
            </Text>
          )}
        </TouchableOpacity>

      </View>

    </View>
  );
};



/* -------------------------------------------------- */
/* STYLES */
/* -------------------------------------------------- */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: BG,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 5,
  },

  /* HEADER */

  header: {
    height: 58,
    paddingHorizontal: 13,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerRight: {
    flexDirection: 'row',
    gap: 7,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* IMAGE */

  imageContainer: {
    height: 340,
    backgroundColor: WHITE,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  productImage: {
    width: '90%',
    height: '90%',
  },

  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  noImageText: {
    marginTop: 8,
    color: MUTED,
    fontSize: 12,
  },

  discountBadge: {
    position: 'absolute',
    left: 15,
    bottom: 15,
    backgroundColor: GREEN,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
  },

  discountText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '900',
  },

  imageCounter: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },

  imageCounterText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '700',
  },

  /* PRODUCT INFO */

  productInfoCard: {
    backgroundColor: WHITE,
    borderRadius: 19,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },

  productName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: TEXT,
  },

  unit: {
    fontSize: 14,
    color: MUTED,
    marginTop: 3,
  },

  stockBadge: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#B7DDBB',
  },

  stockText: {
    fontSize: 10,
    fontWeight: '900',
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
  },

  starBox: {
    backgroundColor: GREEN,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  ratingText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '800',
  },

  reviewText: {
    color: MUTED,
    fontSize: 12,
    marginLeft: 8,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },

  sellingPrice: {
    color: GREEN,
    fontSize: 31,
    fontWeight: '900',
  },

  actualPrice: {
    color: '#8B8F92',
    fontSize: 16,
    marginLeft: 10,
    textDecorationLine: 'line-through',
  },

  smallDiscount: {
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 9,
  },

  smallDiscountText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: '900',
  },

  pricePerUnit: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
  },

  /* BENEFITS */

  benefitsCard: {
    minHeight: 67,
    backgroundColor: '#F2FAF2',
    borderRadius: 13,
    marginTop: 15,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  benefit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  benefitTitle: {
    color: TEXT,
    fontSize: 10.5,
    fontWeight: '900',
  },

  benefitSubtitle: {
    color: MUTED,
    fontSize: 9.5,
    marginTop: 1,
  },

  benefitDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#CFE2D0',
  },

  /* SHOP */

  sectionCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 13,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
  },

  shopIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  shopInfo: {
    flex: 1,
  },

  soldBy: {
    color: MUTED,
    fontSize: 10,
  },

  shopName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },

  distance: {
    color: MUTED,
    fontSize: 10,
    marginLeft: 3,
  },

  viewShopButton: {
    borderWidth: 1,
    borderColor: GREEN,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
  },

  viewShopText: {
    color: GREEN,
    fontSize: 10.5,
    fontWeight: '900',
  },

  /* DETAILS */

  detailsCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '900',
  },

  description: {
    color: MUTED,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 7,
  },

  specsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 15,
  },

  spec: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },

  specIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  specTitle: {
    color: MUTED,
    fontSize: 9,
  },

  specValue: {
    color: TEXT,
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 2,
    maxWidth: '90%',
  },

  specDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginVertical: 2,
  },

  /* QUANTITY */

  quantityCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  quantityTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '900',
  },

  quantityControls: {
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  quantityButton: {
    width: 39,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFA',
  },

  quantityValue: {
    minWidth: 40,
    textAlign: 'center',
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },

  /* BOTTOM */

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 13,
    flexDirection: 'row',
    gap: 10,
  },

  addCartButton: {
    flex: 1,
    height: 53,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  addCartText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '900',
  },

  buyButton: {
    flex: 1,
    height: 53,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buyText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '900',
  },

  disabledButton: {
    backgroundColor: '#AEB5AF',
  },

  disabledOutlineButton: {
    borderColor: '#AEB5AF',
  },

  disabledText: {
    color: '#8B918C',
  },

  /* EMPTY */

  emptyContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 12,
  },

  backButtonLarge: {
    backgroundColor: GREEN,
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 18,
  },

  backButtonText: {
    color: WHITE,
    fontWeight: '800',
  },
});

export default ProductDetailsScreen;