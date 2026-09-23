import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { API_BASE_URL } from '../../config/api';
import { initializeCheckout, verifyPayment, failPayment, fetchPricing, PricingResult } from '../../services/orderService';
import { getShopDetails } from '../../services/shopService';
import { validateCoupon } from '../../services/offerService';

const ORANGE_PRIMARY = '#FF7A00';
const ORANGE_LIGHT = 'rgba(255,122,0,0.15)';
const GREEN_SAVING = '#16A34A';

const resolveImg = (url?: string | null) => {
  if (!url) return null;
  const t = url.trim();
  return t.startsWith('http') ? t : `${API_BASE_URL}${t.startsWith('/') ? '' : '/'}${t}`;
};

export default function CartScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { token, user } = useAuth();
  const { cartItems, cartShopId, updateQuantity, removeFromCart, addToCart, cartTotal, clearCart } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { location } = useDeliveryLocation();
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [submitting, setSubmitting] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [billExpanded, setBillExpanded] = useState(true);

  // Dynamic Backend State
  const [shopDetails, setShopDetails] = useState<any | null>(null);
  const [pricingData, setPricingData] = useState<PricingResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  let tabBarHeight = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    tabBarHeight = useBottomTabBarHeight();
  } catch (_) {
    tabBarHeight = 70;
  }

  // 1. Fetch Dynamic Shop Details (Category, Min Order, Location)
  useEffect(() => {
    let cancelled = false;
    const loadShopInfo = async () => {
      if (!cartShopId) return;
      try {
        const details = await getShopDetails(cartShopId);
        if (!cancelled && details) {
          setShopDetails(details);
        }
      } catch (_) {}
    };
    loadShopInfo();
    return () => { cancelled = true; };
  }, [cartShopId]);

  // 2. Fetch Dynamic Pricing Matrix (Delivery Fee, Platform Fee, Distance)
  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      if (!cartShopId || !location?.latitude || !location?.longitude) {
        setPricingData(null);
        return;
      }
      setPricingLoading(true);
      try {
        // Pass cartTotal so backend applies hybrid (distance × cart modifier) logic
        const res = await fetchPricing(cartShopId, location.latitude, location.longitude, token || undefined, cartTotal);
        if (!cancelled && res) {
          setPricingData(res);
        }
      } catch (_) {
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    };
    loadPricing();
    return () => { cancelled = true; };
  // Re-fetch when cartTotal changes so fee updates dynamically
  }, [cartShopId, location, token, cartTotal]);

  // Related products from shop
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const loadShopProducts = useCallback(async () => {
    if (!cartShopId) { setShopProducts([]); return; }
    setRelatedLoading(true);
    try {
      const { getProductsByShop } = require('../../services/productService');
      const prods = await getProductsByShop(cartShopId);
      if (Array.isArray(prods)) setShopProducts(prods.filter((p: any) => p.isAvailable !== false));
    } catch (_) {}
    setRelatedLoading(false);
  }, [cartShopId]);

  useEffect(() => { loadShopProducts(); }, [loadShopProducts]);

  // If cart total changes, coupon might become invalid
  useEffect(() => {
    if (appliedCoupon && cartTotal > 0) {
      // Re-validate silently
      validateCoupon(appliedCoupon.code, cartShopId || 0, cartTotal).then(res => {
        if (!res.valid) {
          setAppliedCoupon(null);
          setCouponError(res.message || 'Coupon no longer valid for this cart amount');
        } else {
          setAppliedCoupon({ code: appliedCoupon.code, discountAmount: res.discountAmount || 0 });
          setCouponError(null);
        }
      }).catch(() => {
        setAppliedCoupon(null);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartTotal, cartShopId]);

  const inCartIds = new Set(cartItems.map(i => i.product.id));
  const related = shopProducts.filter(p => !inCartIds.has(p.id)).slice(0, 10);

  // Dynamic Resolved Properties
  const shopName = cartItems[0]?.product?.shopName || shopDetails?.name || 'Local Store';
  const shopCategory = shopDetails?.category || 'Grocery & Food';

  // ── Fee Calculation (backend-driven, hybrid distance × cart modifier) ────
  const isFreeDelivery    = pricingData?.isFreeDelivery ?? false;
  const deliveryFee       = isFreeDelivery ? 0 : (pricingData?.deliveryFee ?? 20);
  const platformFee       = pricingData?.platformFee ?? 6;
  const gstOnPlatformFee  = pricingData?.gstOnPlatformFee ?? Number(((platformFee * 18) / 100).toFixed(2));
  const appliedDiscount   = appliedCoupon?.discountAmount || 0;
  const finalPayableTotal = Math.max(0, cartTotal - appliedDiscount + deliveryFee + platformFee + gstOnPlatformFee);

  // ── Free Delivery Nudge — show next threshold ─────────────────────────────
  // Slabs: ₹500+ = FREE, ₹300 = 40% off, else base
  const FREE_THRESHOLD = 500;
  const PARTIAL_THRESHOLD = 300;
  const nudgeMessage = (() => {
    if (isFreeDelivery) return null;
    if (cartTotal < PARTIAL_THRESHOLD) {
      const toPartial = PARTIAL_THRESHOLD - cartTotal;
      const partialFee = Math.round(deliveryFee * 0.6);
      return `Add ₹${toPartial} more → delivery drops to ₹${partialFee}!`;
    }
    if (cartTotal < FREE_THRESHOLD) {
      const toFree = FREE_THRESHOLD - cartTotal;
      return `Add ₹${toFree} more → FREE delivery! 🎉`;
    }
    return null;
  })();

  // Dynamic Estimated Delivery Time based on distance (Km)
  const estimatedETA = useMemo(() => {
    const dist = pricingData?.distanceKm ?? 2.5;
    const baseTime = 15;
    const travelTime = Math.round(dist * 5); // 5 mins per km
    return `${baseTime + travelTime}-${baseTime + travelTime + 5} mins`;
  }, [pricingData?.distanceKm]);

  // ── Direct Express Checkout Execution ─────────────────────────
  const handlePlaceOrder = async () => {
    if (!token) {
      showToast('Please login to place an order', 'info');
      (navigation.navigate as any)(ROUTES.LOGIN);
      return;
    }
    if (!location) {
      showToast('Please select a delivery address', 'info');
      setLocationPickerVisible(true);
      return;
    }
    if (cartItems.length === 0) return;

    setSubmitting(true);
    try {
      const primaryItem = cartItems[0];
      const shopId = primaryItem?.product.shopId || cartShopId || 1;

      if (paymentMethod === 'COD') {
        const order = await initializeCheckout(
          {
            userId: String(user?.id ?? ''),
            shopId: Number(shopId),
            productId: primaryItem?.product.id || 0,
            productName: primaryItem?.product.name || '',
            quantity: primaryItem?.quantity || 1,
            paymentMethod: 'COD',
            items: cartItems.map(i => ({
              productId: i.product.id!,
              productName: i.product.name,
              quantity: i.quantity,
              price: i.product.sellingPrice,
            })),
            userLatitude: location.latitude,
            userLongitude: location.longitude,
            deliveryAddress: getDeliveryLocationLabel(location),
            customerName: user?.name,
            customerPhone: (user as any)?.phone || (user as any)?.phoneNumber,
            couponCode: appliedCoupon?.code,
          },
          token
        );
        clearCart();
        showToast('Order placed successfully!', 'success');
        (navigation.navigate as any)(ROUTES.ORDER_SUCCESS, { orderId: order.id });
      } else {
        const checkoutRes = await initializeCheckout(
          {
            userId: String(user?.id ?? ''),
            shopId: Number(shopId),
            productId: primaryItem?.product.id || 0,
            productName: primaryItem?.product.name || '',
            quantity: primaryItem?.quantity || 1,
            paymentMethod: 'ONLINE',
            items: cartItems.map(i => ({
              productId: i.product.id!,
              productName: i.product.name,
              quantity: i.quantity,
              price: i.product.sellingPrice,
            })),
            userLatitude: location.latitude,
            userLongitude: location.longitude,
            deliveryAddress: getDeliveryLocationLabel(location),
            customerName: user?.name,
            customerPhone: (user as any)?.phone || (user as any)?.phoneNumber,
            couponCode: appliedCoupon?.code,
          },
          token
        );

        setSubmitting(false);
        console.log('[CartScreen] initializeCheckout response:', checkoutRes);
        
        if (checkoutRes.success && checkoutRes.razorpayOrderId) {
          console.log('[CartScreen] Initializing Razorpay Checkout flow...');
          try {
            const RazorpayCheckout = require('react-native-razorpay').default;
            const { NativeModules } = require('react-native');
            console.log('[CartScreen] Module required successfully:', !!RazorpayCheckout);
            
            if (!NativeModules.RNRazorpayCheckout) {
              setSubmitting(false);
              showToast('Razorpay is not supported in Expo Go. Please use a development build or TestFlight/APK.', 'error');
              return;
            }

            const options = {
              description: 'Order Payment',
              image: 'https://i.imgur.com/3g7nmJC.png',
              currency: checkoutRes.currency || 'INR',
              key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YourKeyIdHere',
              amount: checkoutRes.amount * 100,
              name: 'RuVo',
              order_id: checkoutRes.razorpayOrderId,
              prefill: {
                email: user?.email || 'customer@ruvomobile.me',
                contact: (user as any)?.phone || '9999999999',
                name: (user as any)?.name || 'Customer'
              },
              theme: { color: '#FF7A00' }
            };
            
            console.log('[CartScreen] Calling RazorpayCheckout.open with options:', JSON.stringify(options, null, 2));

            RazorpayCheckout.open(options).then(async (data: any) => {
              console.log('[CartScreen] Razorpay payment SUCCESS:', data);
              clearCart();
              try {
                await verifyPayment({
                  orderId: checkoutRes.orderId,
                  razorpayPaymentId: data.razorpay_payment_id,
                  razorpayOrderId: data.razorpay_order_id,
                  razorpaySignature: data.razorpay_signature || '',
                }, token);
                (navigation.navigate as any)(ROUTES.ORDER_SUCCESS, { orderId: checkoutRes.orderId });
              } catch (verifyError: any) {
                console.error('[CartScreen] Payment verification failed:', verifyError);
                showToast('Payment verification failed on server.', 'error');
              }
            }).catch(async (error: any) => {
              console.error('[CartScreen] Razorpay payment FAILED/CANCELLED:', error);
              try {
                 await failPayment(checkoutRes.orderId, token);
              } catch (e) {
                 console.error('[CartScreen] Could not update payment status to failed:', e);
              }
              showToast('Payment cancelled or failed.', 'error');
            });
            
          } catch (e: any) {
             console.error('[CartScreen] Failed to load or run RazorpayCheckout module:', e);
             showToast('Razorpay module not linked. Please build native app!', 'error');
          }
        } else {
          showToast(checkoutRes.message || 'Failed to initialize payment.', 'error');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(couponCode.trim(), cartShopId!, cartTotal);
      if (res.valid && res.discountAmount) {
        setAppliedCoupon({ code: res.code || couponCode.trim(), discountAmount: res.discountAmount });
        showToast('Coupon applied successfully', 'success');
        setCouponCode('');
      } else {
        setCouponError(res.message || 'Invalid coupon code');
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Failed to validate coupon');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  // ── Empty State ──────────────────────────  // ── Empty State ─────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar backgroundColor={colors.surface} barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.topHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconCircleBtn, { backgroundColor: colors.surfaceSunken }]}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Your Cart</Text>
          <View style={{ width: 36 }} />
        </View>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,122,0,0.2)' : ORANGE_LIGHT }]}>
            <Ionicons name="cart-outline" size={56} color={ORANGE_PRIMARY} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Your Cart is Empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Explore nearby stores and add items to your cart!</Text>
          <TouchableOpacity
            style={styles.startShopBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.startShopText}>Browse Shops</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.surface} barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Top Header ───────────────────────────────────────── */}
      <View style={[styles.topHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconCircleBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Your Cart</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {cartItems.length} item{cartItems.length > 1 ? 's' : ''} from {shopName}
          </Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
          <Ionicons name="trash-outline" size={14} color="#DC2626" />
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 140 }}
      >
        {/* ── 1. Dynamic Cart Items ───────────────────────────── */}
        <View style={styles.sectionContainer}>
          {cartItems.map((item) => {
            const p = item.product;
            const uri = resolveImg(p.imageUrl || (p as any).image);
            const price = Number(p.sellingPrice ?? (p as any).price ?? 0);
            const actualPrice = Number(p.actualPrice ?? price);
            const discountPct = actualPrice > price ? Math.round(((actualPrice - price) / actualPrice) * 100) : 0;

            return (
              <View key={String(p.id)} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <View style={[styles.itemImageWrap, { backgroundColor: colors.surfaceSunken }]}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.itemImg} resizeMode="cover" />
                  ) : (
                    <Ionicons name="basket-outline" size={32} color={colors.textHint} />
                  )}
                </View>

                <View style={styles.itemContent}>
                  <View style={styles.itemTopRow}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>{p.name}</Text>
                    <TouchableOpacity onPress={() => removeFromCart(p.id!)} style={styles.deleteIconBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.shopTagRow}>
                    <View style={styles.vegDot} />
                    <Text style={[styles.shopTagName, { color: colors.textSecondary }]}>{shopCategory}</Text>
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.itemPrice}>₹{price}</Text>
                    {actualPrice > price && <Text style={[styles.itemStrikePrice, { color: colors.textHint }]}>₹{actualPrice}</Text>}
                    {discountPct > 0 && (
                      <View style={styles.discountChip}>
                        <Text style={styles.discountChipText}>{discountPct}% OFF</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemBottomRow}>
                    <Text style={[styles.lineCalculationText, { color: colors.textSecondary }]}>
                      {item.quantity} × ₹{price} = <Text style={{ fontFamily: 'Poppins_800ExtraBold', color: colors.textPrimary }}>₹{item.quantity * price}</Text>
                    </Text>

                    {/* Stepper pill */}
                    <View style={[styles.stepperPill, { backgroundColor: colors.surfaceSunken }]}>
                      <TouchableOpacity
                        style={[styles.stepperMinusBtn, { backgroundColor: colors.surface }]}
                        onPress={() => item.quantity === 1 ? removeFromCart(p.id!) : updateQuantity(p.id!, item.quantity - 1)}
                      >
                        <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={14} color={item.quantity === 1 ? '#DC2626' : ORANGE_PRIMARY} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperQtyText, { color: colors.textPrimary }]}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepperPlusBtn}
                        onPress={() => updateQuantity(p.id!, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── 2. More From This Shop Section ──────────────────── */}
        {(relatedLoading || related.length > 0) && (
          <View style={styles.relatedSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>More from {shopName}</Text>
              <TouchableOpacity
                style={[styles.viewAllPill, { backgroundColor: isDark ? 'rgba(255,122,0,0.2)' : ORANGE_LIGHT }]}
                onPress={() => cartShopId && (navigation.navigate as any)(ROUTES.SHOP_DETAILS, { shopId: cartShopId })}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={12} color={ORANGE_PRIMARY} />
              </TouchableOpacity>
            </View>

            {relatedLoading ? (
              <ActivityIndicator color={ORANGE_PRIMARY} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={related}
                keyExtractor={p => String(p.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                renderItem={({ item: p }) => {
                  const uri = resolveImg(p.imageUrl || p.image);
                  const price = Number(p.sellingPrice ?? p.price ?? 0);
                  return (
                    <View style={[styles.relCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[styles.relImgWrap, { backgroundColor: colors.surfaceSunken }]}>
                        {uri ? (
                          <Image source={{ uri }} style={styles.relImg} resizeMode="cover" />
                        ) : (
                          <Ionicons name="cube-outline" size={28} color={colors.textHint} />
                        )}
                      </View>
                      <Text style={[styles.relName, { color: colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[styles.relPrice, { color: colors.textPrimary }]}>₹{price}</Text>
                      <TouchableOpacity
                        style={styles.relAddBtn}
                        onPress={() => addToCart(p)}
                      >
                        <Ionicons name="add" size={14} color={ORANGE_PRIMARY} />
                        <Text style={styles.relAddText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </View>
        )}

        {/* ── 3. Free Delivery Nudge Banner ────────────────────── */}
        <View style={styles.promoBannerWrap}>
          <View style={[styles.promoBanner, { backgroundColor: isFreeDelivery ? (isDark ? 'rgba(34,197,94,0.2)' : '#DCFCE7') : (isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7') }]}>
            <View style={[styles.promoTagIcon, { backgroundColor: isFreeDelivery ? (isDark ? 'rgba(34,197,94,0.3)' : '#86EFAC') : (isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A') }]}>
              <Ionicons name={isFreeDelivery ? 'sparkles' : 'pricetag'} size={14} color={isFreeDelivery ? '#16A34A' : '#D97706'} />
            </View>
            <Text style={[styles.promoBannerText, { color: isFreeDelivery ? '#22C55E' : (isDark ? '#FBBF24' : '#92400E') }]}>
              {isFreeDelivery ? (
                <Text style={{ fontFamily: 'Poppins_800ExtraBold' }}>🎉 Congratulations! FREE Delivery unlocked!</Text>
              ) : nudgeMessage ? (
                nudgeMessage
              ) : (
                <>
                  Add more items to reduce your <Text style={{ fontFamily: 'Poppins_800ExtraBold', color: GREEN_SAVING }}>delivery fee!</Text>
                </>
              )}
            </Text>
          </View>
        </View>

        {/* ── 4. Delivery Address & Distance/ETA Info Card ─────── */}
        <View style={styles.infoCardWrap}>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <TouchableOpacity
              style={styles.deliveryRow}
              onPress={() => setLocationPickerVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.locationPinCircle, { backgroundColor: isDark ? 'rgba(255,122,0,0.2)' : ORANGE_LIGHT }]}>
                <Ionicons name="location-sharp" size={18} color="#FF7A00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>DELIVERING TO</Text>
                <Text style={[styles.infoAddressText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {getDeliveryLocationLabel(location)}
                </Text>
              </View>
              <View style={[styles.editPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7' }]}>
                <Text style={styles.editText}>Edit</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

            <View style={styles.timeRow}>
              <View style={[styles.bikeIconCircle, { backgroundColor: isDark ? 'rgba(34,197,94,0.2)' : '#DCFCE7' }]}>
                <Ionicons name="bicycle-outline" size={18} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.timeTitle, { color: colors.textPrimary }]}>Delivery in {estimatedETA}</Text>
                <Text style={[styles.timeSubtext, { color: colors.textSecondary }]}>
                  From {shopName} {pricingData?.distanceKm ? `(${pricingData.distanceKm.toFixed(1)} km away)` : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Coupon Code Section ───────────────────────────── */}
        <View style={styles.couponSectionWrap}>
          <View style={[styles.couponCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
              <Ionicons name="pricetag-outline" size={18} color={ORANGE_PRIMARY} />
              <Text style={[styles.couponTitle, { color: colors.textPrimary }]}>Apply Coupon</Text>
            </View>
            
            {appliedCoupon ? (
              <View style={[styles.appliedCouponRow, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#F0FDF4', borderColor: '#22C55E' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  <View>
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins_800ExtraBold', color: '#15803D' }}>{appliedCoupon.code}</Text>
                    <Text style={{ fontSize: 11, color: '#16A34A', marginTop: 1 }}>Saved ₹{appliedCoupon.discountAmount}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setAppliedCoupon(null)}>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins_800ExtraBold', color: '#DC2626' }}>REMOVE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    style={[styles.couponInput, { backgroundColor: colors.surfaceSunken, color: colors.textPrimary, borderColor: couponError ? '#DC2626' : colors.border }]}
                    placeholder="Enter coupon code"
                    placeholderTextColor={colors.textHint}
                    value={couponCode}
                    onChangeText={(t) => { setCouponCode(t); setCouponError(null); }}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[styles.applyBtn, !couponCode.trim() && { opacity: 0.5 }]}
                    disabled={!couponCode.trim() || validatingCoupon}
                    onPress={handleApplyCoupon}
                  >
                    {validatingCoupon ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.applyBtnText}>APPLY</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {couponError && (
                  <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 6, fontFamily: 'Poppins_400Regular' }}>{couponError}</Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* ── 5. Dynamic Bill Details Accordion ───────────────── */}
        <View style={styles.billSectionWrap}>
          <View style={[styles.billCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <TouchableOpacity
              style={styles.billHeader}
              onPress={() => setBillExpanded(!billExpanded)}
              activeOpacity={0.8}
            >
              <Text style={[styles.billTitle, { color: colors.textPrimary }]}>Bill Details</Text>
              <Ionicons name={billExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            {billExpanded && (
              <View style={{ marginTop: 10 }}>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Item Total ({cartItems.length} item{cartItems.length > 1 ? 's' : ''})</Text>
                  <Text style={[styles.billValue, { color: colors.textPrimary }]}>₹{cartTotal}</Text>
                </View>

                {appliedDiscount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={{ fontSize: 13, color: '#16A34A' }}>Discount ({appliedCoupon?.code})</Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins_800ExtraBold', color: '#16A34A' }}>- ₹{appliedDiscount}</Text>
                  </View>
                )}

                <View style={styles.billRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
                    <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                  </View>
                  {isFreeDelivery ? (
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins_800ExtraBold', color: GREEN_SAVING }}>FREE</Text>
                  ) : (
                    <Text style={[styles.billValue, { color: colors.textPrimary }]}>₹{deliveryFee}</Text>
                  )}
                </View>

                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Handling Fee</Text>
                  <Text style={[styles.billValue, { color: colors.textPrimary }]}>₹{platformFee}</Text>
                </View>

                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>GST (18% on handling)</Text>
                  <Text style={[styles.billValue, { color: colors.textSecondary, fontSize: 12 }]}>₹{gstOnPlatformFee.toFixed(2)}</Text>
                </View>

                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

                <View style={styles.billRow}>
                  <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total Amount</Text>
                  <Text style={[styles.totalValue, { color: colors.textPrimary }]}>₹{finalPayableTotal}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* ── Proceed to Checkout (Swiggy / Zomato Style Flow) ─── */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(tabBarHeight + 8, 16), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.checkoutFullBtn}
          activeOpacity={0.88}
          onPress={() => {
            (navigation.navigate as any)(ROUTES.CHECKOUT, { fromCart: true });
          }}
        >
          <View style={styles.checkoutBtnLeft}>
            <Text style={styles.checkoutItemsBadge}>
              {cartItems.length} ITEM{cartItems.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.checkoutPriceText}>₹{finalPayableTotal}</Text>
          </View>

          <View style={styles.checkoutBtnRight}>
            <Text style={styles.checkoutActionText}>Proceed to Pay</Text>
            <View style={styles.arrowIconWrap}>
              <Ionicons name="chevron-forward" size={16} color={ORANGE_PRIMARY} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutFullText: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: '#FFFFFF' },
  couponSectionWrap: { paddingHorizontal: 16, marginVertical: 6 },
  couponCard: { borderRadius: 18, padding: 14 },
  couponTitle: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold' },
  appliedCouponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  couponInput: { flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, fontFamily: 'Poppins_700Bold', fontSize: 13 },
  applyBtn: { backgroundColor: ORANGE_PRIMARY, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 12 },
  applyBtnText: { color: '#FFF', fontFamily: 'Poppins_800ExtraBold', fontSize: 12 },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_800ExtraBold' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  clearText: { fontSize: 11, fontFamily: 'Poppins_800ExtraBold', color: '#DC2626' },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_800ExtraBold' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  startShopBtn: { backgroundColor: ORANGE_PRIMARY, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
  startShopText: { fontSize: 14, fontFamily: 'Poppins_800ExtraBold', color: '#FFFFFF' },

  // Cart item card
  sectionContainer: { paddingHorizontal: 16, paddingTop: 12 },
  itemCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  itemImageWrap: { width: 84, height: 84, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  itemImg: { width: '100%', height: '100%' },
  itemContent: { flex: 1, marginLeft: 12 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold', flex: 1, marginRight: 8 },
  deleteIconBtn: { padding: 2 },
  shopTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  vegDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  shopTagName: { fontSize: 11 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  itemPrice: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold', color: ORANGE_PRIMARY },
  itemStrikePrice: { fontSize: 12, textDecorationLine: 'line-through' },
  discountChip: { backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  discountChipText: { fontSize: 9, fontFamily: 'Poppins_800ExtraBold', color: '#15803D' },
  itemBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  lineCalculationText: { fontSize: 11 },

  // Stepper pill
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 2,
    gap: 8,
  },
  stepperMinusBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepperQtyText: { fontSize: 13, fontFamily: 'Poppins_800ExtraBold', minWidth: 16, textAlign: 'center' },
  stepperPlusBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: ORANGE_PRIMARY, alignItems: 'center', justifyContent: 'center' },

  // Related section
  relatedSection: { paddingVertical: 8 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold' },
  viewAllPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 2 },
  viewAllText: { fontSize: 12, fontFamily: 'Poppins_800ExtraBold', color: ORANGE_PRIMARY },
  relCard: { width: 130, borderRadius: 16, padding: 10, borderWidth: 1 },
  relImgWrap: { height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden' },
  relImg: { width: '100%', height: '100%' },
  relName: { fontSize: 12, fontFamily: 'Poppins_700Bold' },
  relPrice: { fontSize: 13, fontFamily: 'Poppins_800ExtraBold', marginTop: 2 },
  relAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ORANGE_PRIMARY, borderRadius: 10, paddingVertical: 4, marginTop: 8, gap: 2 },
  relAddText: { fontSize: 11, fontFamily: 'Poppins_800ExtraBold', color: ORANGE_PRIMARY },

  // Promo Banner
  promoBannerWrap: { paddingHorizontal: 16, marginVertical: 8 },
  promoBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, gap: 8 },
  promoTagIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  promoBannerText: { flex: 1, fontSize: 12 },

  // Delivery & Time info
  infoCardWrap: { paddingHorizontal: 16, marginVertical: 6 },
  infoCard: { borderRadius: 18, padding: 14 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationPinCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 9, fontFamily: 'Poppins_800ExtraBold', letterSpacing: 0.5 },
  infoAddressText: { fontSize: 13, fontFamily: 'Poppins_800ExtraBold', marginTop: 1 },
  editPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editText: { fontSize: 12, fontFamily: 'Poppins_800ExtraBold', color: '#D97706' },
  dividerLine: { height: 1, marginVertical: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bikeIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  timeTitle: { fontSize: 13, fontFamily: 'Poppins_800ExtraBold' },
  timeSubtext: { fontSize: 11, marginTop: 1 },

  // Payment Options
  paymentSectionWrap: { paddingHorizontal: 16, marginVertical: 6 },
  paymentCard: { borderRadius: 18, padding: 14 },
  paymentOptionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  paymentOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  paymentOptionActive: { backgroundColor: ORANGE_LIGHT, borderColor: ORANGE_PRIMARY },
  paymentOptionText: { fontSize: 12, fontFamily: 'Poppins_700Bold' },
  paymentOptionTextActive: { color: ORANGE_PRIMARY, fontFamily: 'Poppins_800ExtraBold' },

  // Bill details
  billSectionWrap: { paddingHorizontal: 16, marginVertical: 6 },
  billCard: { borderRadius: 18, padding: 14 },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billTitle: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  billLabel: { fontSize: 13 },
  billValue: { fontSize: 13, fontFamily: 'Poppins_800ExtraBold' },
  totalLabel: { fontSize: 14, fontFamily: 'Poppins_800ExtraBold' },
  totalValue: { fontSize: 16, fontFamily: 'Poppins_800ExtraBold' },

  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  checkoutFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ORANGE_PRIMARY,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: ORANGE_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  checkoutBtnLeft: {
    justifyContent: 'center',
  },
  checkoutItemsBadge: {
    fontSize: 10,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    opacity: 0.88,
    letterSpacing: 0.5,
  },
  checkoutPriceText: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    marginTop: -2,
  },
  checkoutBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkoutActionText: {
    fontSize: 15,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  arrowIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

});
