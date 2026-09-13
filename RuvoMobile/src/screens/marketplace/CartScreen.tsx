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
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { API_BASE_URL } from '../../config/api';
import { initializeCheckout, initializeCashfreeCheckout, fetchPricing, PricingResult } from '../../services/orderService';
import { getShopDetails } from '../../services/shopService';

// ─── Design Tokens ─────────────────────────────────────────────
const ORANGE_PRIMARY = '#FF7A00';
const ORANGE_LIGHT = '#FFF3E8';
const BG_GRAY = '#F5F6F8';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1C1C1E';
const TEXT_GRAY = '#8E8E93';
const BORDER_LIGHT = '#EFEFF4';
const GREEN_SAVING = '#16A34A';

const resolveImg = (url?: string | null) => {
  if (!url) return null;
  const t = url.trim();
  return t.startsWith('http') ? t : `${API_BASE_URL}${t.startsWith('/') ? '' : '/'}${t}`;
};

export default function CartScreen() {
  const { token, user } = useAuth();
  const { cartItems, cartShopId, updateQuantity, removeFromCart, addToCart, cartTotal, clearCart } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { location } = useDeliveryLocation();
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CASHFREE'>('COD');
  const [submitting, setSubmitting] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [billExpanded, setBillExpanded] = useState(true);

  // Dynamic Backend State
  const [shopDetails, setShopDetails] = useState<any | null>(null);
  const [pricingData, setPricingData] = useState<PricingResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

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
        const res = await fetchPricing(cartShopId, location.latitude, location.longitude, token || undefined);
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
  }, [cartShopId, location, token]);

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

  const inCartIds = new Set(cartItems.map(i => i.product.id));
  const related = shopProducts.filter(p => !inCartIds.has(p.id)).slice(0, 10);

  // Dynamic Resolved Properties
  const shopName = cartItems[0]?.product?.shopName || shopDetails?.name || 'Local Store';
  const shopCategory = shopDetails?.category || 'Grocery & Food';

  // Dynamic Free Delivery Threshold Logic
  const freeDeliveryThreshold = shopDetails?.minOrderForFreeDelivery ?? 299;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartTotal);
  const isFreeDeliveryEligible = remainingForFreeDelivery === 0;

  // Dynamic Fees Calculation
  const deliveryFee = isFreeDeliveryEligible ? 0 : (pricingData?.deliveryFee ?? 25);
  const platformFee = pricingData?.platformFee ?? 5;
  const finalPayableTotal = cartTotal + deliveryFee + platformFee;

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
      showToast('Please login to place an order', 'warning');
      (navigation.navigate as any)(ROUTES.LOGIN);
      return;
    }
    if (!location) {
      showToast('Please select a delivery address', 'warning');
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
            shopId: Number(shopId),
            items: cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity })),
            latitude: location.latitude,
            longitude: location.longitude,
            deliveryAddress: getDeliveryLocationLabel(location),
            customerName: user?.name,
            customerPhone: user?.phone,
          },
          token
        );
        clearCart();
        showToast('Order placed successfully!', 'success');
        (navigation.navigate as any)(ROUTES.ORDER_SUCCESS, { orderId: order.id });
      } else {
        const paymentRes = await initializeCashfreeCheckout(
          {
            shopId: Number(shopId),
            items: cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity })),
            latitude: location.latitude,
            longitude: location.longitude,
            deliveryAddress: getDeliveryLocationLabel(location),
            customerName: user?.name,
            customerPhone: user?.phone,
          },
          token
        );
        clearCart();
        if (paymentRes.paymentLink) {
          await Linking.openURL(paymentRes.paymentLink);
        }
        (navigation.navigate as any)(ROUTES.ORDER_SUCCESS, { orderId: paymentRes.orderId });
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Empty State ─────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconCircleBtn}>
            <Ionicons name="chevron-back" size={20} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={{ width: 36 }} />
        </View>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={56} color={ORANGE_PRIMARY} />
          </View>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>Explore nearby stores and add items to your cart!</Text>
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
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={WHITE} barStyle="dark-content" />

      {/* ── Top Header ───────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconCircleBtn}>
          <Ionicons name="chevron-back" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <Text style={styles.headerSubtitle}>
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
              <View key={String(p.id)} style={styles.itemCard}>
                <View style={styles.itemImageWrap}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.itemImg} resizeMode="cover" />
                  ) : (
                    <Ionicons name="basket-outline" size={32} color={TEXT_GRAY} />
                  )}
                </View>

                <View style={styles.itemContent}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemName} numberOfLines={2}>{p.name}</Text>
                    <TouchableOpacity onPress={() => removeFromCart(p.id!)} style={styles.deleteIconBtn}>
                      <Ionicons name="trash-outline" size={16} color={TEXT_GRAY} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.shopTagRow}>
                    <View style={styles.vegDot} />
                    <Text style={styles.shopTagName}>{shopCategory}</Text>
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.itemPrice}>₹{price}</Text>
                    {actualPrice > price && <Text style={styles.itemStrikePrice}>₹{actualPrice}</Text>}
                    {discountPct > 0 && (
                      <View style={styles.discountChip}>
                        <Text style={styles.discountChipText}>{discountPct}% OFF</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemBottomRow}>
                    <Text style={styles.lineCalculationText}>
                      {item.quantity} × ₹{price} = <Text style={{ fontWeight: '800', color: TEXT_DARK }}>₹{item.quantity * price}</Text>
                    </Text>

                    {/* Stepper pill */}
                    <View style={styles.stepperPill}>
                      <TouchableOpacity
                        style={styles.stepperMinusBtn}
                        onPress={() => item.quantity === 1 ? removeFromCart(p.id!) : updateQuantity(p.id!, item.quantity - 1)}
                      >
                        <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={14} color={item.quantity === 1 ? '#DC2626' : ORANGE_PRIMARY} />
                      </TouchableOpacity>
                      <Text style={styles.stepperQtyText}>{item.quantity}</Text>
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
              <Text style={styles.sectionTitle}>More from {shopName}</Text>
              <TouchableOpacity
                style={styles.viewAllPill}
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
                    <View style={styles.relCard}>
                      <View style={styles.relImgWrap}>
                        {uri ? (
                          <Image source={{ uri }} style={styles.relImg} resizeMode="cover" />
                        ) : (
                          <Ionicons name="cube-outline" size={28} color={TEXT_GRAY} />
                        )}
                      </View>
                      <Text style={styles.relName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.relPrice}>₹{price}</Text>
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

        {/* ── 3. Dynamic Free Delivery Callout Banner ──────────── */}
        <View style={styles.promoBannerWrap}>
          <View style={[styles.promoBanner, isFreeDeliveryEligible && { backgroundColor: '#DCFCE7' }]}>
            <View style={[styles.promoTagIcon, isFreeDeliveryEligible && { backgroundColor: '#86EFAC' }]}>
              <Ionicons name={isFreeDeliveryEligible ? 'sparkles' : 'pricetag'} size={14} color={isFreeDeliveryEligible ? '#15803D' : '#D97706'} />
            </View>
            <Text style={[styles.promoBannerText, isFreeDeliveryEligible && { color: '#15803D' }]}>
              {isFreeDeliveryEligible ? (
                <Text style={{ fontWeight: '900' }}>Congratulations! You have unlocked FREE Delivery! 🎉</Text>
              ) : (
                <>
                  Add items worth <Text style={{ fontWeight: '900' }}>₹{remainingForFreeDelivery}</Text> more to get <Text style={{ fontWeight: '900', color: GREEN_SAVING }}>FREE delivery!</Text>
                </>
              )}
            </Text>
          </View>
        </View>

        {/* ── 4. Delivery Address & Distance/ETA Info Card ─────── */}
        <View style={styles.infoCardWrap}>
          <View style={styles.infoCard}>
            <TouchableOpacity
              style={styles.deliveryRow}
              onPress={() => setLocationPickerVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.locationPinCircle}>
                <Ionicons name="location-sharp" size={18} color="#FF7A00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>DELIVERING TO</Text>
                <Text style={styles.infoAddressText} numberOfLines={1}>
                  {getDeliveryLocationLabel(location)}
                </Text>
              </View>
              <View style={styles.editPill}>
                <Text style={styles.editText}>Edit</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.dividerLine} />

            <View style={styles.timeRow}>
              <View style={styles.bikeIconCircle}>
                <Ionicons name="bicycle-outline" size={18} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeTitle}>Delivery in {estimatedETA}</Text>
                <Text style={styles.timeSubtext}>
                  From {shopName} {pricingData?.distanceKm ? `(${pricingData.distanceKm.toFixed(1)} km away)` : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 5. Dynamic Bill Details Accordion ───────────────── */}
        <View style={styles.billSectionWrap}>
          <View style={styles.billCard}>
            <TouchableOpacity
              style={styles.billHeader}
              onPress={() => setBillExpanded(!billExpanded)}
              activeOpacity={0.8}
            >
              <Text style={styles.billTitle}>Bill Details</Text>
              <Ionicons name={billExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={TEXT_DARK} />
            </TouchableOpacity>

            {billExpanded && (
              <View style={{ marginTop: 10 }}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total ({cartItems.length} item{cartItems.length > 1 ? 's' : ''})</Text>
                  <Text style={styles.billValue}>₹{cartTotal}</Text>
                </View>

                <View style={styles.billRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.billLabel}>Delivery Fee</Text>
                    <Ionicons name="information-circle-outline" size={14} color={TEXT_GRAY} />
                  </View>
                  {isFreeDeliveryEligible ? (
                    <Text style={{ fontSize: 13, fontWeight: '900', color: GREEN_SAVING }}>FREE</Text>
                  ) : (
                    <Text style={styles.billValue}>₹{deliveryFee}</Text>
                  )}
                </View>

                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Platform Fee</Text>
                  <Text style={styles.billValue}>₹{platformFee}</Text>
                </View>

                <View style={styles.dividerLine} />

                <View style={styles.billRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>₹{finalPayableTotal}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* ── Proceed to Checkout (Swiggy / Zomato Style Flow) ─── */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(tabBarHeight + 8, 16) }]}>
        <TouchableOpacity
          style={styles.checkoutFullBtn}
          activeOpacity={0.88}
          onPress={() => {
            (navigation.navigate as any)(ROUTES.CHECKOUT, { fromCart: true });
          }}
        >
          <View style={styles.checkoutBtnLeft}>
            <Text style={styles.checkoutItemsBadge}>
              {cartItems.length} ITEM{cartItems.length > 1 ? 'S' : ''}
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
  safe: { flex: 1, backgroundColor: BG_GRAY },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: TEXT_DARK },
  headerSubtitle: { fontSize: 11, color: TEXT_GRAY, marginTop: 1 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  clearText: { fontSize: 11, fontWeight: '800', color: '#DC2626' },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: ORANGE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: TEXT_DARK },
  emptySubtitle: { fontSize: 13, color: TEXT_GRAY, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  startShopBtn: { backgroundColor: ORANGE_PRIMARY, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
  startShopText: { fontSize: 14, fontWeight: '800', color: WHITE },

  // Cart item card
  sectionContainer: { paddingHorizontal: 16, paddingTop: 12 },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  itemImageWrap: { width: 84, height: 84, borderRadius: 14, backgroundColor: BG_GRAY, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  itemImg: { width: '100%', height: '100%' },
  itemContent: { flex: 1, marginLeft: 12 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 15, fontWeight: '900', color: TEXT_DARK, flex: 1, marginRight: 8 },
  deleteIconBtn: { padding: 2 },
  shopTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  vegDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  shopTagName: { fontSize: 11, color: TEXT_GRAY },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  itemPrice: { fontSize: 16, fontWeight: '900', color: ORANGE_PRIMARY },
  itemStrikePrice: { fontSize: 12, color: TEXT_GRAY, textDecorationLine: 'line-through' },
  discountChip: { backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  discountChipText: { fontSize: 9, fontWeight: '900', color: '#15803D' },
  itemBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  lineCalculationText: { fontSize: 11, color: TEXT_GRAY },

  // Stepper pill
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 2,
    gap: 8,
  },
  stepperMinusBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  stepperQtyText: { fontSize: 13, fontWeight: '900', color: TEXT_DARK, minWidth: 16, textAlign: 'center' },
  stepperPlusBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: ORANGE_PRIMARY, alignItems: 'center', justifyContent: 'center' },

  // Related section
  relatedSection: { paddingVertical: 8 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: TEXT_DARK },
  viewAllPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: ORANGE_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 2 },
  viewAllText: { fontSize: 12, fontWeight: '800', color: ORANGE_PRIMARY },
  relCard: { width: 130, backgroundColor: WHITE, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: BORDER_LIGHT },
  relImgWrap: { height: 80, borderRadius: 12, backgroundColor: BG_GRAY, alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden' },
  relImg: { width: '100%', height: '100%' },
  relName: { fontSize: 12, fontWeight: '700', color: TEXT_DARK },
  relPrice: { fontSize: 13, fontWeight: '900', color: TEXT_DARK, marginTop: 2 },
  relAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ORANGE_PRIMARY, borderRadius: 10, paddingVertical: 4, marginTop: 8, gap: 2 },
  relAddText: { fontSize: 11, fontWeight: '900', color: ORANGE_PRIMARY },

  // Promo Banner
  promoBannerWrap: { paddingHorizontal: 16, marginVertical: 8 },
  promoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, gap: 8 },
  promoTagIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' },
  promoBannerText: { flex: 1, fontSize: 12, color: '#92400E' },

  // Delivery & Time info
  infoCardWrap: { paddingHorizontal: 16, marginVertical: 6 },
  infoCard: { backgroundColor: WHITE, borderRadius: 18, padding: 14 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationPinCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: ORANGE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 9, fontWeight: '800', color: TEXT_GRAY, letterSpacing: 0.5 },
  infoAddressText: { fontSize: 13, fontWeight: '800', color: TEXT_DARK, marginTop: 1 },
  editPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editText: { fontSize: 12, fontWeight: '900', color: '#D97706' },
  dividerLine: { height: 1, backgroundColor: BORDER_LIGHT, marginVertical: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bikeIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  timeTitle: { fontSize: 13, fontWeight: '900', color: TEXT_DARK },
  timeSubtext: { fontSize: 11, color: TEXT_GRAY, marginTop: 1 },

  // Payment Options
  paymentSectionWrap: { paddingHorizontal: 16, marginVertical: 6 },
  paymentCard: { backgroundColor: WHITE, borderRadius: 18, padding: 14 },
  paymentOptionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  paymentOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_GRAY,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    gap: 6,
  },
  paymentOptionActive: { backgroundColor: ORANGE_LIGHT, borderColor: ORANGE_PRIMARY },
  paymentOptionText: { fontSize: 12, fontWeight: '700', color: TEXT_GRAY },
  paymentOptionTextActive: { color: ORANGE_PRIMARY, fontWeight: '900' },

  // Bill details
  billSectionWrap: { paddingHorizontal: 16, marginVertical: 6 },
  billCard: { backgroundColor: WHITE, borderRadius: 18, padding: 14 },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billTitle: { fontSize: 15, fontWeight: '900', color: TEXT_DARK },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  billLabel: { fontSize: 13, color: TEXT_GRAY },
  billValue: { fontSize: 13, fontWeight: '800', color: TEXT_DARK },
  totalLabel: { fontSize: 14, fontWeight: '900', color: TEXT_DARK },
  totalValue: { fontSize: 16, fontWeight: '900', color: TEXT_DARK },

  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_LIGHT,
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
    fontWeight: '900',
    color: WHITE,
    opacity: 0.88,
    letterSpacing: 0.5,
  },
  checkoutPriceText: {
    fontSize: 18,
    fontWeight: '900',
    color: WHITE,
    marginTop: -2,
  },
  checkoutBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkoutActionText: {
    fontSize: 15,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: 0.2,
  },
  arrowIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutFullText: { fontSize: 16, fontWeight: '900', color: WHITE },
});
