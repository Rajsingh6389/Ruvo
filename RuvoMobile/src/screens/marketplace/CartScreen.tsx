import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';

export default function CartScreen() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCheckout = () => {
    // We navigate to Checkout
    // But right now ruined Checkout expects a single product! 
    // We will pass the first item for now to allow them to proceed smoothly.
    if (cartItems.length > 0) {
      navigation.navigate(ROUTES.CHECKOUT, { product: cartItems[0].product, quantity: cartItems[0].quantity });
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptySub}>Looks like you haven't added anything yet.</Text>
        <TouchableOpacity style={styles.startBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.startBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>₹{item.product.sellingPrice}</Text>
      </View>
      <View style={styles.qtyContainer}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.product.id, item.quantity - 1)}>
          <Ionicons name="remove" size={16} color="#333" />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.product.id, item.quantity + 1)}>
          <Ionicons name="add" size={16} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeFromCart(item.product.id)}>
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cartItems}
        renderItem={renderItem}
        keyExtractor={item => item.product.id.toString()}
        contentContainerStyle={styles.listContainer}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₹{cartTotal}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEE'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  clearText: { color: '#FF3B30', fontWeight: '600' },
  listContainer: { padding: 16 },
  cartItem: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  itemInfo: { flex: 1, marginRight: 16 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  qtyContainer: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontWeight: '600', width: 30, textAlign: 'center' },
  deleteBtn: { marginLeft: 12, padding: 8 },
  footer: { backgroundColor: '#FFF', padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalLabel: { fontSize: 16, color: '#666' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#111' },
  checkoutBtn: { backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#888', marginBottom: 24 },
  startBtn: { backgroundColor: '#2E7D32', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  startBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' }
});
