import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Linking,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

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

const WELCOME_COUPON = {
  code: 'WELCOME100',
  discount: 100,
  minOrder: 299,
};

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, userId, user } = useAuth();
  const { cartItems, clearCart } = useCart();
  const { location } = useDeliveryLocation();

  // BUSINESS LOGIC: Determine checkout items from route params or cart
  const routeProduct = route.params?.product as Product | undefined;
  const routeQuantity = route.params?.quantity as number | undefined;
  const fromCart = route.params?.fromCart === true;
  const routeCouponCode = route.params?.couponCode as string | undefined;

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
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const shopId = primaryItem?.product.shopId || 1;

  // BUSINESS LOGIC: Fetch delivery pricing
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
        (sum, item) => {
          const price = Number((item.product as any).sellingPrice ?? (item.product as any).price ?? 0);
          const qty = Number(item.quantity ?? 1);
          const validPrice = isNaN(price) ? 0 : price;
          const validQty = isNaN(qty) ? 1 : qty;
          return sum + validPrice * validQty;
        },
        0,
      ),
    [checkoutItems],
  );
  const couponDiscount = appliedCoupon === WELCOME_COUPON.code
    ? Math.min(WELCOME_COUPON.discount, itemTotal)
    : 0;
  const safePlatformFee = isNaN(Number(platformFee)) ? 0 : Number(platformFee);
  const safeDeliveryFee = isNaN(Number(deliveryFee)) ? 0 : Number(deliveryFee);
  const grandTotal = itemTotal + safePlatformFee + safeDeliveryFee - couponDiscount;

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

  const handleApplyCoupon = (rawCode = couponCode) => {
    const normalizedCode = rawCode.trim().toUpperCase();

    if (!normalizedCode) {
      setCouponMessage('Enter a coupon code.');
      return;
    }

    if (appliedCoupon === normalizedCode) {
      setCouponMessage('Coupon already applied.');
      return;
    }

    if (normalizedCode !== WELCOME_COUPON.code) {
      setAppliedCoupon(null);
      setCouponMessage('Invalid coupon code.');
      return;
    }

    if (itemTotal < WELCOME_COUPON.minOrder) {
      setAppliedCoupon(null);
      setCouponMessage(`Add Rs ${WELCOME_COUPON.minOrder - itemTotal} more to apply this coupon.`);
      return;
    }

    setCouponCode(WELCOME_COUPON.code);
    setAppliedCoupon(WELCOME_COUPON.code);
    setCouponMessage(`Coupon applied. You saved Rs ${WELCOME_COUPON.discount}.`);
  };

  useEffect(() => {
    if (routeCouponCode && itemTotal > 0 && !pricingLoading) {
      handleApplyCoupon(routeCouponCode);
    }
  }, [routeCouponCode, itemTotal, pricingLoading]);

  // BUSINESS LOGIC: Handle order placement
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
      const validShopId = Number(shopId);
      if (!validShopId || isNaN(validShopId)) {
        Alert.alert('Invalid Shop', 'Unable to resolve shop details. Please re-open the cart.');
        setSubmitting(false);
        return;
      }

      const formattedItems = checkoutItems.map(i => ({
        productId: i.product.id || 0,
        productName: i.product.name,
        quantity: i.quantity,
        price: (i.product as any).sellingPrice ?? (i.product as any).price ?? 0,
      }));

      if (paymentMethod === 'CASHFREE') {
        const checkoutRes = await initializeCashfreeCheckout(
          {
            userId: String(userId),
            shopId: validShopId,
            productId: primaryItem.product.id!,
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
            shopId: validShopId,
            productId: primaryItem.product.id!,
            productName: primaryItem.product.name,
            quantity: primaryItem.quantity,
            items: formattedItems,
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
      const errorMsg = err?.message || err?.toString() || 'Could not place order. Please check connection or stock.';
      console.error('[CheckoutScreen] Place Order Error:', errorMsg, err);
      Alert.alert('Order Failed', errorMsg);
    }
  };

  if (!primaryItem) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg">
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
          <Text className="text-lg font-bold text-ruvo-ink">
            Nothing to checkout
          </Text>
          <TouchableOpacity
            className="bg-ruvo-accent px-6 py-3 rounded-lg"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white font-bold text-center">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg">
      {/* HEADER */}
      <View className="h-14 px-4 border-b border-gray-200 bg-white flex-row items-center justify-between">
        <TouchableOpacity className="p-2" onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-ruvo-ink">Checkout</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ORDER ITEMS */}
        <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <Text className="text-base font-bold text-ruvo-ink mb-3">
            Order items ({checkoutItems.length})
          </Text>
          {checkoutItems.map(item => {
            const p = item.product as any;
            const imgUri = p.imageUrl || p.image || p.photoUrl;
            const unitPrice = Number(p.sellingPrice ?? p.price ?? 0);
            const validUnitPrice = isNaN(unitPrice) ? 0 : unitPrice;
            const qty = Number(item.quantity ?? 1);
            const lineTotal = validUnitPrice * qty;

            return (
              <View key={p.id ?? p.name} className="flex-row items-center mb-3">
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    className="w-16 h-16 rounded-lg bg-gray-50"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-16 h-16 rounded-lg bg-emerald-50 items-center justify-center border border-emerald-100">
                    <Ionicons name="basket" size={26} color="#10B981" />
                  </View>
                )}
                <View className="flex-1 ml-3">
                  <Text
                    className="text-sm font-semibold text-ruvo-ink"
                    numberOfLines={2}
                  >
                    {p.name}
                  </Text>
                  {p.unit ? (
                    <Text className="text-gray-600 text-xs mt-0.5">
                      {p.unit}
                    </Text>
                  ) : null}
                  <Text className="text-ruvo-accent text-sm font-bold mt-1">
                    ₹{validUnitPrice} × {qty}
                  </Text>
                </View>
                <Text className="text-ruvo-ink text-sm font-bold">
                  ₹{lineTotal}
                </Text>
              </View>
            );
          })}
        </View>

        {/* DELIVERY ADDRESS */}
        <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-ruvo-ink">
              Delivery Address
            </Text>
            <TouchableOpacity onPress={() => setLocationPickerVisible(true)}>
              <Text className="text-ruvo-accent font-bold text-sm">Change</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setLocationPickerVisible(true)}
          >
            <Ionicons name="location" size={20} color="#2E7D32" className="mr-2.5" />
            <View className="flex-1">
              <Text className="text-ruvo-ink text-sm font-bold">
                {getDeliveryLocationLabel(location)}
              </Text>
              <Text className="text-gray-600 text-xs leading-5 mt-1">
                {deliveryAddress}
              </Text>
              {location?.details.phone ? (
                <Text className="text-gray-600 text-xs mt-1">
                  Contact: {location.details.receiverName ? `${location.details.receiverName} · ` : ''}{location.details.phone}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* PAYMENT METHOD */}
        <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <Text className="text-base font-bold text-ruvo-ink mb-3">
            Payment Method
          </Text>

          <TouchableOpacity
            className="flex-row items-center"
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('CASHFREE')}
          >
            <Ionicons
              name={paymentMethod === 'CASHFREE' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color="#2E7D32"
            />
            <View className="ml-3 flex-1">
              <Text className="text-ruvo-ink text-sm font-semibold">
                UPI / Online Payment
              </Text>
              <Text className="text-gray-600 text-xs mt-0.5">
                Pay via UPI, Cards, NetBanking, or Wallets
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center border-t border-gray-200 mt-2.5 pt-2.5"
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons
              name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color="#2E7D32"
            />
            <View className="ml-3 flex-1">
              <Text className="text-ruvo-ink text-sm font-semibold">
                Cash on Delivery (COD)
              </Text>
              <Text className="text-gray-600 text-xs mt-0.5">
                Pay with cash when your order is delivered
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* BILL DETAILS */}
        <View className="bg-white rounded-lg border border-gray-200 p-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-ruvo-ink">
              Bill Details
            </Text>
            {distanceKm !== null && (
              <View className="flex-row items-center bg-ruvo-accent-soft px-2 py-0.5 rounded-full gap-1">
                <Ionicons name="navigate" size={11} color="#2E7D32" />
                <Text className="text-ruvo-accent text-xs font-semibold">
                  {distanceKm} km away
                </Text>
              </View>
            )}
          </View>

          {!serviceable && !pricingLoading && (
            <View className="flex-row items-center gap-1.5 bg-red-50 rounded-lg p-2.5 mb-3">
              <Ionicons name="close-circle" size={16} color="#D32F2F" />
              <Text className="text-red-600 text-xs font-semibold flex-shrink">
                This shop is outside the 5 km delivery zone.
              </Text>
            </View>
          )}

          {pricingLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#2E7D32" />
              <Text className="text-gray-600 text-xs mt-2">
                Calculating delivery fees…
              </Text>
            </View>
          ) : (
            <>
              <View className="mb-4">
                <Text className="text-sm font-bold text-ruvo-ink mb-2">
                  Apply Coupon
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="flex-1 h-11 rounded-lg border border-gray-200 bg-gray-50 px-3 flex-row items-center">
                    <Ionicons name="pricetag-outline" size={16} color="#2E7D32" />
                    <TextInput
                      className="flex-1 ml-2 text-sm font-semibold text-ruvo-ink"
                      placeholder="Enter coupon code"
                      placeholderTextColor="#9CA3AF"
                      value={couponCode}
                      autoCapitalize="characters"
                      onChangeText={(value) => {
                        setCouponCode(value.toUpperCase());
                        setCouponMessage(null);
                        if (appliedCoupon) setAppliedCoupon(null);
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    className={`h-11 px-4 rounded-lg items-center justify-center ${
                      appliedCoupon ? 'bg-gray-100' : 'bg-ruvo-yellow'
                    }`}
                    onPress={() => {
                      if (appliedCoupon) {
                        setAppliedCoupon(null);
                        setCouponMessage('Coupon removed.');
                      } else {
                        handleApplyCoupon();
                      }
                    }}
                  >
                    <Text className="text-sm font-bold text-ruvo-ink">
                      {appliedCoupon ? 'Remove' : 'Apply'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  className="mt-2 self-start bg-ruvo-accent-soft rounded-full px-3 py-1.5"
                  onPress={() => handleApplyCoupon(WELCOME_COUPON.code)}
                >
                  <Text className="text-xs font-bold text-ruvo-accent">
                    Use WELCOME100: ₹100 off above ₹299
                  </Text>
                </TouchableOpacity>
                {couponMessage ? (
                  <Text className={`text-xs mt-2 font-semibold ${
                    appliedCoupon ? 'text-ruvo-accent' : 'text-red-500'
                  }`}>
                    {couponMessage}
                  </Text>
                ) : null}
              </View>

              <View className="flex-row justify-between mb-1.5">
                <Text className="text-gray-600 text-sm">Item Total</Text>
                <Text className="text-ruvo-ink text-sm">₹{itemTotal}</Text>
              </View>
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-gray-600 text-sm">Platform Fee</Text>
                <Text className="text-ruvo-ink text-sm">₹{platformFee}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600 text-sm">
                  Delivery Fee{distanceKm !== null ? ` (${distanceKm} km)` : ''}
                </Text>
                <Text className="text-ruvo-ink text-sm">₹{deliveryFee}</Text>
              </View>
              {couponDiscount > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-ruvo-accent text-sm">
                    Coupon Discount ({appliedCoupon})
                  </Text>
                  <Text className="text-ruvo-accent text-sm font-bold">
                    -₹{couponDiscount}
                  </Text>
                </View>
              )}
              <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
                <Text className="text-base font-bold text-ruvo-ink">
                  Grand Total
                </Text>
                <Text className="text-base font-bold text-ruvo-accent">
                  ₹{grandTotal}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View className="bg-white px-4 py-4 border-t border-gray-200 flex-row items-center justify-between">
        <View>
          <Text className="text-gray-600 text-xs">Grand Total</Text>
          <Text className="text-2xl font-black text-ruvo-ink">
            {pricingLoading ? '...' : `₹${grandTotal}`}
          </Text>
        </View>

        <TouchableOpacity
          className={`px-6 py-3 rounded-lg flex-row items-center justify-center ${
            !hasAddress || !serviceable || pricingLoading
              ? 'bg-gray-400'
              : 'bg-ruvo-accent'
          }`}
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
              <Text className="text-white font-bold text-center">
                {getButtonText()}
              </Text>
              {hasAddress && serviceable && (
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="#FFFFFF"
                  className="ml-1.5"
                />
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
