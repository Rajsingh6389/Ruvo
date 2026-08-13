import React, { useState, useMemo } from 'react';
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
import RazorpayCheckout from 'react-native-razorpay';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { initializeCheckout, verifyPayment, failPayment, initializeCashfreeCheckout } from '../../services/orderService';
import { ROUTES } from '../../constants/routes';

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { token, userId, user } = useAuth();

  const { product, quantity: initialQuantity } = route.params;

  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE' | 'CASHFREE'>('CASHFREE');
  const [submitting, setSubmitting] = useState(false);

  // Price calculations
  const itemTotal = useMemo(() => quantity * product.sellingPrice, [quantity, product.sellingPrice]);
  const deliveryFee = 30;
  const discount = 0;
  const taxes = Math.round(itemTotal * 0.05); // 5% GST
  const grandTotal = itemTotal + deliveryFee + taxes - discount;

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
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
        // Cashfree redirect payment flow
        const checkoutRes = await initializeCashfreeCheckout({
          userId: String(userId),
          shopId: product.shopId || 1,
          productId: product.id || 0,
          productName: product.name,
          quantity,
          deliveryAddress: address,
          customerPhone: user?.mobileNumber || undefined,
          customerEmail: user?.email || undefined,
        }, token);

        setSubmitting(false);
        if (checkoutRes.success && checkoutRes.paymentUrl) {
          Linking.openURL(checkoutRes.paymentUrl);
        } else {
          Alert.alert('Error', checkoutRes.message || 'Failed to initialize Cashfree payment.');
        }
      } else if (paymentMethod === 'COD') {
        // Cash on Delivery flow - order created instantly
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
      } else {
        // Online Payment Flow (Razorpay)
        const checkoutRes = await initializeCheckout({
          userId: String(userId),
          shopId: product.shopId || 1,
          productId: product.id || 0,
          productName: product.name,
          quantity,
          paymentMethod: 'ONLINE',
          deliveryAddress: address,
        }, token);

        const options = {
          description: `RuVo Purchase - ${product.name}`,
          image: product.imageUrl || 'https://ruvo.in/logo.png',
          currency: 'INR',
          key: checkoutRes.keyId,
          amount: Math.round(grandTotal * 100), // in paise
          name: 'RuVo Local Store',
          order_id: checkoutRes.razorpayOrderId,
          prefill: {
            email: user?.email || 'customer@ruvo.com',
            contact: user?.mobileNumber || '9999999999',
            name: user?.name || 'RuVo Customer',
          },
          theme: { color: '#2E7D32' }
        };

        RazorpayCheckout.open(options)
          .then(async (data: any) => {
            try {
              await verifyPayment({
                orderId: checkoutRes.orderId,
                razorpayPaymentId: data.razorpay_payment_id,
                razorpayOrderId: data.razorpay_order_id,
                razorpaySignature: data.razorpay_signature,
              }, token);

              setSubmitting(false);
              navigation.navigate(ROUTES.MAIN_TABS);
              Alert.alert(
                'Payment Successful!',
                'Your online payment was verified and order has been confirmed.',
                [{ text: 'OK' }]
              );
            } catch (err: any) {
              setSubmitting(false);
              Alert.alert('Verification Failed', err.message || 'Verification failed, contact support.');
            }
          })
          .catch(async (error: any) => {
            await failPayment(checkoutRes.orderId, token).catch(() => null);
            setSubmitting(false);
            Alert.alert('Payment Cancelled/Failed', error.description || 'The payment session was cancelled.');
          });
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
            onPress={() => setPaymentMethod('ONLINE')}
          >
            <Ionicons
              name={paymentMethod === 'ONLINE' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={colors.primary}
            />
            <View style={styles.paymentTextCol}>
              <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary }]}>Razorpay Online</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Pay securely via Razorpay payment gateway</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={{ color: colors.textSecondary }}>Item Total</Text>
            <Text style={{ color: colors.textPrimary }}>₹{itemTotal}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={{ color: colors.textSecondary }}>Delivery Fee</Text>
            <Text style={{ color: colors.textPrimary }}>₹{deliveryFee}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={{ color: colors.textSecondary }}>GST & Taxes</Text>
            <Text style={{ color: colors.textPrimary }}>₹{taxes}</Text>
          </View>
          <View style={[styles.billRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }]}>
            <Text style={[styles.grandTotalText, { color: colors.textPrimary }]}>Grand Total</Text>
            <Text style={[styles.grandTotalText, { color: colors.primary }]}>₹{grandTotal}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer bar */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Grand Total</Text>
          <Text style={[styles.footerPrice, { color: colors.textPrimary }]}>₹{grandTotal}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
          disabled={submitting}
          onPress={handlePlaceOrder}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>Place Order</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
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
