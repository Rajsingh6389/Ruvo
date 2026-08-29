import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { useToast } from '../../context/ToastContext';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import {
  initializeCheckout,
  initializeCashfreeCheckout,
  fetchPricing,
  PricingResult,
} from '../../services/orderService';
import { ROUTES } from '../../constants/routes';
import type { Product } from '../../services/productService';

type CheckoutItem = {
  product: Product;
  quantity: number;
};

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { token, userId, user } = useAuth();
  const { cartItems, clearCart } = useCart();
  const { location } = useDeliveryLocation();

  const routeProduct = route.params?.product as Product | undefined;
  const routeQuantity = route.params?.quantity as number | undefined;
  const fromCart = route.params?.fromCart === true;

  const checkoutItems: CheckoutItem[] = useMemo(() => {
    if (fromCart && cartItems.length > 0) {
      return cartItems;
    }
    if (routeProduct) {
      return [{ product: routeProduct, quantity: routeQuantity || 1 }];
    }
    return [];
  }, [cartItems, fromCart, routeProduct, routeQuantity]);

  const primaryItem = checkoutItems[0];
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CASHFREE'>('CASHFREE');
  const [submitting, setSubmitting] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  const shopId = primaryItem?.product.shopId || 1;

  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      if (!primaryItem) return;

      setPricingLoading(true);
      try {
        const lat = location?.latitude;
        const lng = location?.longitude;

        if (lat == null || lng == null) {
          if (!cancelled) {
            setPricing({
              distanceKm: 0,
              deliveryFee: 10,
              platformFee: 5,
              serviceable: true,
            });
          }
          return;
        }

        const result = await fetchPricing(shopId, lat, lng, token || undefined);
        if (!cancelled) setPricing(result);
      } catch (e) {
        console.warn('Pricing fetch failed:', e);
        if (!cancelled) {
          setPricing({
            distanceKm: 0,
            deliveryFee: 10,
            platformFee: 5,
            serviceable: true,
          });
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    };

    loadPricing();
    return () => {
      cancelled = true;
    };
  }, [location?.latitude, location?.longitude, primaryItem, shopId, token]);

  const deliveryFee = pricing?.deliveryFee ?? 0;
  const platformFee = pricing?.platformFee ?? 0;
  const serviceable = pricing?.serviceable ?? true;
  const distanceKm = pricing?.distanceKm ?? null;

  const itemTotal = useMemo(
    () =>
      checkoutItems.reduce(
        (sum, item) => sum + item.quantity * item.product.sellingPrice,
        0,
      ),
    [checkoutItems],
  );
  const grandTotal = itemTotal + platformFee + deliveryFee;

  const deliveryAddress =
    location?.fullAddress ||
    user?.mobileNumber ||
    'Please set your delivery address';

  const hasAddress = Boolean(location?.fullAddress);

  const getButtonText = () => {
    if (!hasAddress) return 'Add Delivery Address';
    if (!serviceable) return 'Not Deliverable';
    return 'Place Order';
  };

  const handlePlaceOrder = async () => {
    if (!token || !userId || !primaryItem) {
      Alert.alert('Authentication Required', 'Please log in to complete your checkout.');
      return;
    }

    if (!location?.fullAddress) {
      Alert.alert('Delivery address required', 'Please set your delivery address before placing the order.');
      setLocationPickerVisible(true);
      return;
    }
    if (!primaryItem.product.id) {
      Alert.alert('Product unavailable', 'This product is missing its catalogue ID. Refresh the shop and try again.');
      return;
    }

    setSubmitting(true);

    try {
      if (paymentMethod === 'CASHFREE') {
        const checkoutRes = await initializeCashfreeCheckout(
          {
            userId: String(userId),
            shopId,
            productId: primaryItem.product.id,
            productName: primaryItem.product.name,
            quantity: primaryItem.quantity,
            deliveryAddress,
            customerPhone: location.details.phone || user?.mobileNumber || undefined,
            customerEmail: user?.email || undefined,
            userLatitude: location.latitude,
            userLongitude: location.longitude,
          },
          token,
        );

        setSubmitting(false);
        if (checkoutRes.success && checkoutRes.paymentUrl) {
          if (fromCart) clearCart();
          Linking.openURL(checkoutRes.paymentUrl);
        } else {
          Alert.alert('Error', checkoutRes.message || 'Failed to initialize Cashfree payment.');
        }
      } else {
        const result = await initializeCheckout(
          {
            userId: String(userId),
            shopId,
            productId: primaryItem.product.id,
            productName: primaryItem.product.name,
            quantity: primaryItem.quantity,
            paymentMethod: 'COD',
            deliveryAddress,
            userLatitude: location.latitude,
            userLongitude: location.longitude,
            customerName: location.details.receiverName || user?.name,
            customerPhone: location.details.phone || user?.mobileNumber,
          },
          token,
        );

        setSubmitting(false);
        if (fromCart) clearCart();
        navigation.replace(ROUTES.ORDER_SUCCESS, {
          orderId: result.orderId,
          total: grandTotal,
        });
      }
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert('Order Failed', err.message || 'Something went wrong while placing your order.');
    }
  };

  if (!primaryItem) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyWrap}>
          <Ionicons name="cart-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Nothing to checkout
          </Text>
          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.checkoutBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Order items ({checkoutItems.length})
          </Text>
          {checkoutItems.map(item => (
            <View key={item.product.id} style={styles.itemRow}>
              {item.product.imageUrl ? (
                <Image source={{ uri: item.product.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={[styles.noImage, { backgroundColor: colors.border }]}>
                  <Ionicons name="image-outline" size={32} color="#AEB5AF" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.product.name}
                </Text>
                {item.product.unit ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                    {item.product.unit}
                  </Text>
                ) : null}
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  ₹{item.product.sellingPrice} × {item.quantity}
                </Text>
              </View>
              <Text style={[styles.lineTotal, { color: colors.textPrimary }]}>
                ₹{item.product.sellingPrice * item.quantity}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.addressHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
              Delivery Address
            </Text>
            <TouchableOpacity onPress={() => setLocationPickerVisible(true)}>
              <Text style={[styles.changeAddress, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addressRow}
            onPress={() => setLocationPickerVisible(true)}
          >
            <Ionicons name="location" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.addressLabel, { color: colors.textPrimary }]}>
                {getDeliveryLocationLabel(location)}
              </Text>
              <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                {deliveryAddress}
              </Text>
              {location?.details.phone ? (
                <Text style={[styles.phoneText, { color: colors.textSecondary }]}>
                  Contact: {location.details.receiverName ? `${location.details.receiverName} · ` : ''}{location.details.phone}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment Method</Text>

          <TouchableOpacity
            style={styles.paymentOption}
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('CASHFREE')}
          >
            <Ionicons
              name={paymentMethod === 'CASHFREE' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={colors.primary}
            />
            <View style={styles.paymentTextCol}>
              <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary }]}>
                UPI / Online Payment
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Pay via UPI, Cards, NetBanking, or Wallets
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 },
            ]}
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons
              name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={colors.primary}
            />
            <View style={styles.paymentTextCol}>
              <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary }]}>
                Cash on Delivery (COD)
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Pay with cash when your order is delivered
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.billHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
              Bill Details
            </Text>
            {distanceKm !== null && (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={11} color="#2E7D32" />
                <Text style={styles.distanceBadgeText}>{distanceKm} km away</Text>
              </View>
            )}
          </View>

          {!serviceable && !pricingLoading && (
            <View style={styles.unserviceableBanner}>
              <Ionicons name="close-circle" size={16} color="#D32F2F" />
              <Text style={styles.unserviceableText}>
                This shop is outside the 5 km delivery zone.
              </Text>
            </View>
          )}

          {pricingLoading ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2E7D32" />
              <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 12 }}>
                Calculating delivery fees…
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.billRow}>
                <Text style={{ color: colors.textSecondary }}>Item Total</Text>
                <Text style={{ color: colors.textPrimary }}>₹{itemTotal}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={{ color: colors.textSecondary }}>Platform Fee</Text>
                <Text style={{ color: colors.textPrimary }}>₹{platformFee}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={{ color: colors.textSecondary }}>
                  Delivery Fee{distanceKm !== null ? ` (${distanceKm} km)` : ''}
                </Text>
                <Text style={{ color: colors.textPrimary }}>₹{deliveryFee}</Text>
              </View>
              <View
                style={[
                  styles.billRow,
                  { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 },
                ]}
              >
                <Text style={[styles.grandTotalText, { color: colors.textPrimary }]}>
                  Grand Total
                </Text>
                <Text style={[styles.grandTotalText, { color: colors.primary }]}>
                  ₹{grandTotal}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Grand Total</Text>
          <Text style={[styles.footerPrice, { color: colors.textPrimary }]}>
            {pricingLoading ? '...' : `₹${grandTotal}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            { backgroundColor: (!hasAddress || !serviceable || pricingLoading) && hasAddress ? '#A5A5A5' : colors.primary },
          ]}
          disabled={submitting || (hasAddress && (!serviceable || pricingLoading))}
          onPress={() => {
            if (!hasAddress) {
              setLocationPickerVisible(true);
            } else {
              handlePlaceOrder();
            }
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>
                {getButtonText()}
              </Text>
              {hasAddress && serviceable && (
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: { width: 60, height: 60, borderRadius: 8 },
  noImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemPrice: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  lineTotal: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeAddress: { fontSize: 13, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  addressText: { fontSize: 13, lineHeight: 18 },
  phoneText: { fontSize: 12, marginTop: 4 },
  paymentOption: { flexDirection: 'row', alignItems: 'center' },
  paymentTextCol: { marginLeft: 12 },
  paymentOptionTitle: { fontSize: 14, fontWeight: '600' },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  grandTotalText: { fontSize: 16, fontWeight: '700' },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  distanceBadgeText: { fontSize: 11, fontWeight: '600', color: '#2E7D32' },
  unserviceableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  unserviceableText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  footerPrice: { fontSize: 20, fontWeight: '800' },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkoutBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
});
