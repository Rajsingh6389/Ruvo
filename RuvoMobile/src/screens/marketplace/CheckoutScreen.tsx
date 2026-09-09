import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
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
  const { showToast } = useToast();

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
    return paymentMethod === 'COD' ? 'Confirm & Place Order (COD)' : 'Proceed to Pay Online';
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

  const handlePlaceOrder = async () => {
    if (!token || !userId || !primaryItem) {
      showToast('Please log in to complete your checkout.', 'info');
      return;
    }

    if (!location?.fullAddress) {
      showToast('Please set your delivery address before placing the order.', 'info');
      setLocationPickerVisible(true);
      return;
    }

    setSubmitting(true);

    try {
      const validShopId = Number(shopId) || 1;

      const formattedItems = checkoutItems.map(i => {
        const p = i.product as any;
        return {
          productId: p.id || 0,
          productName: p.name,
          productImageUrl: p.imageUrl || p.image || p.photoUrl || undefined,
          quantity: i.quantity,
          price: p.sellingPrice ?? p.price ?? 0,
        };
      });

      if (paymentMethod === 'CASHFREE') {
        const checkoutRes = await initializeCashfreeCheckout(
          {
            userId: String(userId),
            shopId: validShopId,
            productId: primaryItem.product.id || 1,
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
          showToast(checkoutRes.message || 'Failed to initialize Cashfree payment.', 'error');
        }
      } else {
        const result = await initializeCheckout(
          {
            userId: String(userId),
            shopId: validShopId,
            productId: primaryItem.product.id || 1,
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
      const errorMsg = err?.message || err?.toString() || 'Could not place order. Please check connection.';
      console.error('[CheckoutScreen] Place Order Error:', errorMsg, err);
      showToast(errorMsg, 'error');
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
            className="bg-ruvo-yellow px-6 py-3 rounded-xl shadow-xs"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-ruvo-ink font-black text-center">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg">
      {/* HEADER */}
      <View className="h-14 px-4 border-b border-ruvo-border bg-white flex-row items-center justify-between">
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-ruvo-card border border-ruvo-border items-center justify-center" 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#171A1F" />
        </TouchableOpacity>
        <Text className="text-lg font-black text-ruvo-ink">Checkout</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ORDER ITEMS */}
        <View className="bg-white rounded-[20px] border border-ruvo-border p-4 mb-4 shadow-xs">
          <Text className="text-sm font-black text-ruvo-ink uppercase tracking-wider mb-3">
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
                    className="w-16 h-16 rounded-xl bg-ruvo-card border border-ruvo-border"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-16 h-16 rounded-xl bg-ruvo-yellow-soft items-center justify-center border border-ruvo-border">
                    <Ionicons name="basket" size={24} color="#F4B400" />
                  </View>
                )}
                <View className="flex-1 ml-3">
                  <Text
                    className="text-sm font-extrabold text-ruvo-ink"
                    numberOfLines={2}
                  >
                    {p.name}
                  </Text>
                  {p.unit ? (
                    <Text className="text-ruvo-muted text-xs mt-0.5">
                      {p.unit}
                    </Text>
                  ) : null}
                  <Text className="text-ruvo-ink text-xs font-black mt-1">
                    ₹{validUnitPrice} × {qty}
                  </Text>
                </View>
                <Text className="text-ruvo-ink text-sm font-black">
                  ₹{lineTotal}
                </Text>
              </View>
            );
          })}
        </View>

        {/* DELIVERY ADDRESS */}
        <View className="bg-white rounded-[20px] border border-ruvo-border p-4 mb-4 shadow-xs">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-black text-ruvo-ink uppercase tracking-wider">
              Delivery Address
            </Text>
            <TouchableOpacity onPress={() => setLocationPickerVisible(true)}>
              <Text className="text-ruvo-ink font-extrabold text-xs uppercase tracking-wider underline">Change</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setLocationPickerVisible(true)}
          >
            <View className="w-10 h-10 rounded-xl bg-ruvo-yellow-soft border border-ruvo-border items-center justify-center mr-3">
              <Ionicons name="location" size={20} color="#F4B400" />
            </View>
            <View className="flex-1">
              <Text className="text-ruvo-ink text-sm font-extrabold">
                {getDeliveryLocationLabel(location)}
              </Text>
              <Text className="text-ruvo-muted text-xs leading-5 mt-0.5 font-medium" numberOfLines={2}>
                {deliveryAddress}
              </Text>
              {location?.details.phone ? (
                <Text className="text-ruvo-muted text-xs mt-1 font-semibold">
                  Contact: {location.details.receiverName ? `${location.details.receiverName} · ` : ''}{location.details.phone}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A39D93" />
          </TouchableOpacity>
        </View>

        {/* PAYMENT METHOD */}
        <View className="bg-white rounded-[20px] border border-ruvo-border p-4 mb-4 shadow-xs">
          <Text className="text-sm font-black text-ruvo-ink uppercase tracking-wider mb-3">
            Payment Method
          </Text>

          <TouchableOpacity
            className={`flex-row items-center p-3.5 rounded-xl border ${
              paymentMethod === 'CASHFREE' ? 'border-ruvo-ink bg-ruvo-card' : 'border-ruvo-border bg-white'
            }`}
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('CASHFREE')}
          >
            <Ionicons
              name={paymentMethod === 'CASHFREE' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'CASHFREE' ? '#171A1F' : '#A39D93'}
            />
            <View className="ml-3 flex-1">
              <Text className="text-ruvo-ink text-sm font-extrabold">
                UPI / Online Payment (Cashfree)
              </Text>
              <Text className="text-ruvo-muted text-xs mt-0.5 font-medium">
                Instant pay via Google Pay, PhonePe, Paytm, Cards, NetBanking
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-row items-center p-3.5 rounded-xl border mt-2.5 ${
              paymentMethod === 'COD' ? 'border-ruvo-ink bg-ruvo-card' : 'border-ruvo-border bg-white'
            }`}
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons
              name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'COD' ? '#171A1F' : '#A39D93'}
            />
            <View className="ml-3 flex-1">
              <Text className="text-ruvo-ink text-sm font-extrabold">
                Cash on Delivery (COD)
              </Text>
              <Text className="text-ruvo-muted text-xs mt-0.5 font-medium">
                Pay with cash directly to delivery partner upon arrival
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* BILL DETAILS */}
        <View className="bg-white rounded-[20px] border border-ruvo-border p-4 shadow-xs">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-black text-ruvo-ink uppercase tracking-wider">
              Bill Summary
            </Text>
            {distanceKm !== null && (
              <View className="flex-row items-center bg-ruvo-yellow-soft px-2.5 py-0.5 rounded-full gap-1 border border-ruvo-border">
                <Ionicons name="navigate" size={11} color="#F4B400" />
                <Text className="text-ruvo-ink text-xs font-black">
                  {distanceKm} km
                </Text>
              </View>
            )}
          </View>

          {!serviceable && !pricingLoading && (
            <View className="flex-row items-center gap-1.5 bg-red-50 rounded-xl p-2.5 mb-3 border border-red-200">
              <Ionicons name="close-circle" size={16} color="#D94A4A" />
              <Text className="text-red-700 text-xs font-bold flex-shrink">
                This shop is outside the delivery zone.
              </Text>
            </View>
          )}

          {pricingLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#F4B400" />
              <Text className="text-ruvo-muted text-xs mt-2 font-medium">
                Calculating delivery fees...
              </Text>
            </View>
          ) : (
            <>
              <View className="mb-4">
                <Text className="text-xs font-extrabold text-ruvo-muted mb-2 uppercase tracking-wider">
                  Apply Coupon Code
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="flex-1 h-11 rounded-xl border border-ruvo-border bg-ruvo-card px-3 flex-row items-center">
                    <Ionicons name="pricetag-outline" size={16} color="#F4B400" />
                    <TextInput
                      className="flex-1 ml-2 text-sm font-extrabold text-ruvo-ink"
                      placeholder="Enter coupon code"
                      placeholderTextColor="#A39D93"
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
                    className={`h-11 px-4 rounded-xl items-center justify-center ${
                      appliedCoupon ? 'bg-ruvo-card border border-ruvo-border' : 'bg-ruvo-yellow shadow-xs'
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
                    <Text className="text-sm font-black text-ruvo-ink">
                      {appliedCoupon ? 'Remove' : 'Apply'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  className="mt-2 self-start bg-ruvo-yellow-soft border border-ruvo-border rounded-full px-3 py-1"
                  onPress={() => handleApplyCoupon(WELCOME_COUPON.code)}
                >
                  <Text className="text-xs font-extrabold text-ruvo-ink">
                    Use WELCOME100: ₹100 off above ₹299
                  </Text>
                </TouchableOpacity>
                {couponMessage ? (
                  <Text className={`text-xs mt-2 font-bold ${
                    appliedCoupon ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {couponMessage}
                  </Text>
                ) : null}
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-ruvo-muted text-xs font-semibold">Item Total</Text>
                <Text className="text-ruvo-ink text-xs font-black">₹{itemTotal}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-ruvo-muted text-xs font-semibold">Platform Fee</Text>
                <Text className="text-ruvo-ink text-xs font-black">₹{platformFee}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-ruvo-muted text-xs font-semibold">
                  Delivery Fee{distanceKm !== null ? ` (${distanceKm} km)` : ''}
                </Text>
                <Text className="text-ruvo-ink text-xs font-black">₹{deliveryFee}</Text>
              </View>
              {couponDiscount > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-emerald-700 text-xs font-bold">
                    Coupon Discount ({appliedCoupon})
                  </Text>
                  <Text className="text-emerald-700 text-xs font-black">
                    -₹{couponDiscount}
                  </Text>
                </View>
              )}
              <View className="border-t border-ruvo-border mt-2 pt-2 flex-row justify-between items-center">
                <Text className="text-base font-black text-ruvo-ink">
                  Grand Total
                </Text>
                <Text className="text-lg font-black text-ruvo-ink">
                  ₹{grandTotal}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View className="bg-white px-5 py-4 border-t border-ruvo-border flex-row items-center justify-between shadow-lg">
        <View>
          <Text className="text-ruvo-muted text-[11px] font-bold uppercase tracking-wider">Grand Total</Text>
          <Text className="text-2xl font-black text-ruvo-ink">
            {pricingLoading ? '...' : `₹${grandTotal}`}
          </Text>
        </View>

        <TouchableOpacity
          className={`px-6 py-3.5 rounded-xl flex-row items-center justify-center ${
            submitting ? 'bg-ruvo-card border border-ruvo-border' : 'bg-ruvo-yellow shadow-md active:bg-ruvo-yellow-dark'
          }`}
          disabled={submitting}
          onPress={() => {
            if (!hasAddress) {
              showToast('Please select your delivery address to proceed.', 'info');
              setLocationPickerVisible(true);
            } else if (!serviceable) {
              showToast('Sorry, this shop is outside your delivery area.', 'error');
            } else if (pricingLoading) {
              showToast('Please wait while we calculate delivery charges.', 'info');
            } else {
              handlePlaceOrder();
            }
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#171A1F" />
          ) : (
            <>
              <Text className="text-ruvo-ink font-black text-center text-base">
                {getButtonText()}
              </Text>
              {hasAddress && serviceable && (
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#171A1F"
                  className="ml-2"
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
