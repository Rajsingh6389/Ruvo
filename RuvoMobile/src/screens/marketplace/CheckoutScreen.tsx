import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { initializeCheckout, initializeCashfreeCheckout, fetchPricing, PricingResult } from '../../services/orderService';
import { ROUTES } from '../../constants/routes';

import Geolocation from 'react-native-geolocation-service';

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { token, userId, user } = useAuth();

  const { product, quantity: initialQuantity } = route.params;

  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CASHFREE'>('CASHFREE');
  const [submitting, setSubmitting] = useState(false);

  // Pricing from backend
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  // Cached user coords for the order call
  const [userLat, setUserLat] = useState<number | undefined>(undefined);
  const [userLng, setUserLng] = useState<number | undefined>(undefined);

  // Fetch pricing on mount once we have the shop id
  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      setPricingLoading(true);
      try {
        // Get GPS
        const position = await new Promise<any>((resolve, reject) => {
          Geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        if (cancelled) return;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);

        // Fetch pricing from backend
        const result = await fetchPricing(product.shopId || 1, lat, lng, token || undefined);
        if (!cancelled) setPricing(result);
      } catch (e) {
        console.warn('Pricing fetch failed:', e);
        // Fallback defaults if GPS or network fail
        if (!cancelled) {
          setPricing({ distanceKm: 0, deliveryFee: 10, platformFee: 5, serviceable: true });
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    };

    loadPricing();
    return () => { cancelled = true; };
  }, [product.shopId]);

  // Price calculations (backend fees, no hardcoding)
  const deliveryFee  = pricing?.deliveryFee  ?? 0;
  const platformFee  = pricing?.platformFee  ?? 0;
  const serviceable  = pricing?.serviceable  ?? true;
  const distanceKm   = pricing?.distanceKm   ?? null;

  const itemTotal  = useMemo(() => quantity * product.sellingPrice, [quantity, product.sellingPrice]);
  // grandTotal = subtotal + deliveryFee + platformFee (no hardcoded taxes — all from backend)
  const grandTotal = itemTotal + platformFee + deliveryFee;

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (quantity < product.stockQuantity) {
      setQuantity(quantity + 1);
    } else {
      Alert.alert('Limit Reached', 'No more stock available for this product.');
    }
  };

  const handlePlaceOrder = async () => {
    if (!token || !userId) {
      Alert.alert('Authentication Required', 'Please log in to complete your checkout.');
      return;
    }

    setSubmitting(true);
    const address = user?.mobileNumber ? `Delivery to registered mobile ${user.mobileNumber}` : 'Delivery Address';

    try {
      if (paymentMethod === 'CASHFREE') {
        const checkoutRes = await initializeCashfreeCheckout({
          userId: String(userId),
          shopId: product.shopId || 1,
          productId: product.id || 0,
          productName: product.name,
          quantity,
          deliveryAddress: address,
          customerPhone: user?.mobileNumber || undefined,
          customerEmail: user?.email || undefined,
          userLatitude: userLat,
          userLongitude: userLng,
        }, token);

        setSubmitting(false);
        if (checkoutRes.success && checkoutRes.paymentUrl) {
          Linking.openURL(checkoutRes.paymentUrl);
        } else {
          Alert.alert('Error', checkoutRes.message || 'Failed to initialize Cashfree payment.');
        }
      } else if (paymentMethod === 'COD') {
        await initializeCheckout({
          userId: String(userId),
          shopId: product.shopId || 1,
          productId: product.id || 0,
          productName: product.name,
          quantity,
          paymentMethod: 'COD',
          deliveryAddress: address,
        }, token);

        setSubmitting(false);
        navigation.navigate(ROUTES.MAIN_TABS);
        Alert.alert(
          'Order Successful!',
          'Your Cash on Delivery order has been successfully placed.',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert('Order Failed', err.message || 'Something went wrong while initializing order.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Item Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.itemRow}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
            ) : (
              <View style={[styles.noImage, { backgroundColor: colors.border }]}>
                <Ionicons name="image-outline" size={32} color="#AEB5AF" />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>
                {product.name}
              </Text>
              {product.unit ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{product.unit}</Text>
              ) : null}
              <Text style={[styles.itemPrice, { color: colors.primary }]}>₹{product.sellingPrice}</Text>
            </View>

            {/* Quantity Controls */}
            <View style={styles.quantityContainer}>
              <TouchableOpacity onPress={handleDecrease} style={styles.qtyBtn}>
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.qtyText, { color: colors.textPrimary }]}>{quantity}</Text>
              <TouchableOpacity onPress={handleIncrease} style={styles.qtyBtn}>
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Delivery Address</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>
              {user?.mobileNumber ? `Registered mobile: ${user.mobileNumber}` : 'Default Address'}
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
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
              <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary }]}>Cashfree Payments</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Pay via Cards, UPI, NetBanking, or Wallets</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 }]}
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons
              name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={colors.primary}
            />
            <View style={styles.paymentTextCol}>
              <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary }]}>Cash on Delivery</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Pay with cash when order arrives</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bill Details */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Bill Details</Text>
            {distanceKm !== null && (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={11} color="#2E7D32" />
                <Text style={styles.distanceBadgeText}>{distanceKm} km away</Text>
              </View>
            )}
          </View>

          {/* Not serviceable banner */}
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
              <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 12 }}>Calculating delivery fees…</Text>
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
              <View style={styles.billRow}>
                <Text style={{ color: colors.textSecondary }}>Platform Fee</Text>
                <Text style={{ color: colors.textPrimary }}>₹{platformFee}</Text>
              </View>
              <View style={[styles.billRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }]}>
                <Text style={[styles.grandTotalText, { color: colors.textPrimary }]}>Grand Total</Text>
                <Text style={[styles.grandTotalText, { color: colors.primary }]}>₹{grandTotal}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer bar */}
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
            { backgroundColor: (!serviceable || pricingLoading) ? '#A5A5A5' : colors.primary },
          ]}
          disabled={submitting || !serviceable || pricingLoading}
          onPress={handlePlaceOrder}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>
                {!serviceable ? 'Not Deliverable' : 'Place Order'}
              </Text>
              {serviceable && <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentTextCol: {
    marginLeft: 12,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  grandTotalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
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
  footerPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
