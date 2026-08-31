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

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-lg p-3 mb-3 flex-row items-center gap-3 shadow-sm border border-gray-100">
      {item.product.imageUrl ? (
        <Image
          source={{ uri: item.product.imageUrl }}
          className="w-16 h-16 rounded-lg"
        />
      ) : (
        <View className="w-16 h-16 rounded-lg bg-gray-100 items-center justify-center">
          <Ionicons name="image-outline" size={22} color="#9CA3AF" />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-ruvo-ink mb-1" numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text className="text-sm font-bold text-ruvo-accent">
          ₹{item.product.sellingPrice}
        </Text>
      </View>
      <View className="flex-row items-center">
        <TouchableOpacity
          className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center"
          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={16} color="#333" />
        </TouchableOpacity>
        <Text className="text-sm font-semibold w-7 text-center text-ruvo-ink">
          {item.quantity}
        </Text>
        <TouchableOpacity
          className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center"
          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={16} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          className="ml-2 p-1.5"
          onPress={() => removeFromCart(item.product.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
        ListHeaderComponent={
          <RuvoFirstOrderPromoBanner compact={true} onApplyCoupon={handleApplyCoupon} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FOOTER */}
      <View className="absolute left-0 right-0 bottom-0 bg-white px-5 pt-4 pb-6 border-t border-gray-200">
        <TouchableOpacity
          className="border border-ruvo-accent bg-ruvo-accent-soft rounded-lg p-2.5 mb-3 flex-row items-center gap-2.5"
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

        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-700">Subtotal</Text>
          <Text className="text-2xl font-bold text-ruvo-ink">
            ₹{cartTotal}
          </Text>
        </View>

        <TouchableOpacity
          className={`py-3.5 rounded-lg items-center ${
            hasDeliveryLocation
              ? 'bg-ruvo-accent'
              : 'bg-gray-400'
          }`}
          onPress={handleCheckout}
          disabled={!hasDeliveryLocation}
        >
          <Text className="text-white font-bold text-center">
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
