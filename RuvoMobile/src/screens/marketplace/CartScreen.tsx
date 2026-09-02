import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { RuvoFirstOrderPromoBanner } from '../../components/premium/RuvoFirstOrderPromoBanner';

export default function CartScreen() {
  // BUSINESS LOGIC: Cart management
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

  const handleApplyCoupon = (couponCode: string) => {
    if (!hasDeliveryLocation) {
      setLocationPickerVisible(true);
      return;
    }
    navigation.navigate(ROUTES.CHECKOUT, { fromCart: true, couponCode });
  };

  if (cartItems.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-5">
        <Ionicons name="cart-outline" size={64} color="#ccc" />
        <Text className="text-2xl font-bold text-ruvo-ink mt-4 mb-2">
          Your Cart is Empty
        </Text>
        <Text className="text-sm text-gray-600 mb-6 text-center">
          Looks like you haven't added anything yet.
        </Text>
        <TouchableOpacity
          className="bg-ruvo-accent px-6 py-3 rounded-lg"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold text-center">
            Start Shopping
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const p = item.product;
    const imgUri = p.imageUrl || p.image || p.photoUrl;
    return (
      <View className="bg-white rounded-2xl p-3.5 mb-3 flex-row items-center gap-3 shadow-sm border border-gray-100">
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            className="w-16 h-16 rounded-xl bg-gray-50"
            resizeMode="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100">
            <Ionicons name="basket" size={26} color="#10B981" />
          </View>
        )}
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-bold text-ruvo-ink mb-0.5" numberOfLines={1}>
            {p.name}
          </Text>
          {p.shopName && (
            <Text className="text-[11px] text-gray-500 font-medium mb-1" numberOfLines={1}>
              {p.shopName}
            </Text>
          )}
          <Text className="text-sm font-black text-ruvo-accent">
            ₹{p.sellingPrice || p.price || 0}
          </Text>
        </View>
        <View className="flex-row items-center bg-gray-50 rounded-full px-2 py-1 border border-gray-200">
          <TouchableOpacity
            className="w-6 h-6 rounded-full bg-white items-center justify-center shadow-xs"
            onPress={() => updateQuantity(p.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={14} color="#333" />
          </TouchableOpacity>
          <Text className="text-xs font-bold w-6 text-center text-ruvo-ink">
            {item.quantity}
          </Text>
          <TouchableOpacity
            className="w-6 h-6 rounded-full bg-white items-center justify-center shadow-xs"
            onPress={() => updateQuantity(p.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={14} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            className="ml-2 p-1"
            onPress={() => removeFromCart(p.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* HEADER */}
      <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-ruvo-ink">
          Your Cart
        </Text>
        <TouchableOpacity
          onPress={clearCart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-red-500 font-semibold text-sm">
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cartItems}
        renderItem={renderItem}
        keyExtractor={item => String(item.product.id ?? item.product.name)}
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FOOTER */}
      <View className="absolute left-0 right-0 bottom-24 bg-white px-5 pt-3 pb-4 border border-gray-200 rounded-2xl mx-3 shadow-xl">
        <TouchableOpacity
          className="border border-ruvo-accent bg-ruvo-accent-soft rounded-lg p-2.5 mb-2.5 flex-row items-center gap-2.5"
          onPress={() => setLocationPickerVisible(true)}
        >
          <Ionicons name="location-outline" size={18} color="#2E7D32" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-ruvo-accent">
              {hasDeliveryLocation
                ? 'Delivering to'
                : 'Add delivery location to continue'}
            </Text>
            <Text
              className="text-xs text-gray-700 mt-0.5"
              numberOfLines={1}
            >
              {hasDeliveryLocation
                ? getDeliveryLocationLabel(location)
                : 'Required before payment'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>

        <View className="flex-row justify-between items-center mb-2.5">
          <Text className="text-gray-700 font-semibold text-sm">Subtotal</Text>
          <Text className="text-2xl font-bold text-ruvo-ink">
            ₹{cartTotal}
          </Text>
        </View>

        <TouchableOpacity
          className={`py-3 rounded-xl items-center shadow-xs ${
            hasDeliveryLocation
              ? 'bg-ruvo-accent'
              : 'bg-gray-400'
          }`}
          onPress={handleCheckout}
          disabled={!hasDeliveryLocation}
        >
          <Text className="text-white font-bold text-center text-base">
            {hasDeliveryLocation
              ? 'Proceed to Checkout'
              : 'Add Location to Continue'}
          </Text>
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
      />
    </View>
  );
}
