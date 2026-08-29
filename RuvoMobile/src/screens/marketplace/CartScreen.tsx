import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { sw, sh, sf } from '../../utils/responsive';
import { RuvoFirstOrderPromoBanner } from '../../components/premium/RuvoFirstOrderPromoBanner';

export default function CartScreen() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { location } = useDeliveryLocation();
  const [locationPickerVisible, setLocationPickerVisible] = React.useState(false);
  const hasDeliveryLocation = Boolean(location?.fullAddress && location.latitude && location.longitude);

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      if (!hasDeliveryLocation) {
        setLocationPickerVisible(true);
        return;
      }
      navigation.navigate(ROUTES.CHECKOUT, { fromCart: true });
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={sw(64)} color="#ccc" />
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
      {item.product.imageUrl ? (
        <Image source={{ uri: item.product.imageUrl }} style={styles.itemImage} />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <Ionicons name="image-outline" size={22} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>₹{item.product.sellingPrice}</Text>
      </View>
      <View style={styles.qtyContainer}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={16} color="#333" />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={16} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => removeFromCart(item.product.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <TouchableOpacity onPress={clearCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cartItems}
        renderItem={renderItem}
        keyExtractor={item => String(item.product.id ?? item.product.name)}
        ListHeaderComponent={<RuvoFirstOrderPromoBanner compact={true} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.locationRow} onPress={() => setLocationPickerVisible(true)}>
          <Ionicons name="location-outline" size={18} color="#2E7D32" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationRowTitle}>{hasDeliveryLocation ? 'Delivering to' : 'Add delivery location to continue'}</Text>
            <Text style={styles.locationRowValue} numberOfLines={1}>{hasDeliveryLocation ? getDeliveryLocationLabel(location) : 'Required before payment'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₹{cartTotal}</Text>
        </View>
        <TouchableOpacity style={[styles.checkoutBtn, !hasDeliveryLocation && styles.checkoutBtnDisabled]} onPress={handleCheckout}>
          <Text style={styles.checkoutBtnText}>{hasDeliveryLocation ? 'Proceed to Checkout' : 'Add Location to Continue'}</Text>
        </TouchableOpacity>
      </View>
      <LocationPickerModal visible={locationPickerVisible} onClose={() => setLocationPickerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sw(16),
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + sh(10) : sh(16),
    paddingBottom: sh(14),
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: { fontSize: sf(18), fontWeight: '700', color: '#111' },
  clearText: { color: '#FF3B30', fontWeight: '600', fontSize: sf(14) },
  listContainer: { padding: sw(16), paddingBottom: sh(24) },
  cartItem: {
    backgroundColor: '#FFF',
    borderRadius: sw(12),
    padding: sw(12),
    marginBottom: sh(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(12),
  },
  itemImage: { width: sw(64), height: sw(64), borderRadius: sw(10) },
  itemImagePlaceholder: {
    width: sw(64),
    height: sw(64),
    borderRadius: sw(10),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: sf(14), fontWeight: '600', color: '#333', marginBottom: sh(4) },
  itemPrice: { fontSize: sf(14), fontWeight: '700', color: '#2E7D32' },
  qtyContainer: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: sw(30),
    height: sw(30),
    borderRadius: sw(15),
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: sf(14), fontWeight: '600', width: sw(28), textAlign: 'center' },
  deleteBtn: { marginLeft: sw(8), padding: sw(6) },
  footer: {
    backgroundColor: '#FFF',
    paddingHorizontal: sw(20),
    paddingTop: sh(16),
    paddingBottom: Platform.OS === 'ios' ? sh(30) : sh(16),
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sh(14) },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: sw(10), borderWidth: 1, borderColor: '#D1E7D2', backgroundColor: '#F3FAF3', borderRadius: sw(10), padding: sw(10), marginBottom: sh(14) },
  locationRowTitle: { fontSize: sf(12), fontWeight: '700', color: '#245C28' },
  locationRowValue: { fontSize: sf(12), color: '#4B5563', marginTop: 2 },
  totalLabel: { fontSize: sf(15), color: '#666' },
  totalValue: { fontSize: sf(19), fontWeight: '700', color: '#111' },
  checkoutBtn: {
    backgroundColor: '#2E7D32',
    paddingVertical: sh(14),
    borderRadius: sw(12),
    alignItems: 'center',
  },
  checkoutBtnDisabled: { backgroundColor: '#6B7280' },
  checkoutBtnText: { color: '#FFF', fontSize: sf(15), fontWeight: '700' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: sw(20),
  },
  emptyTitle: { fontSize: sf(20), fontWeight: '700', color: '#333', marginTop: sh(16), marginBottom: sh(8) },
  emptySub: { fontSize: sf(14), color: '#888', marginBottom: sh(24), textAlign: 'center' },
  startBtn: { backgroundColor: '#2E7D32', paddingHorizontal: sw(24), paddingVertical: sh(12), borderRadius: sw(8) },
  startBtnText: { color: '#FFF', fontSize: sf(15), fontWeight: '600' },
});
