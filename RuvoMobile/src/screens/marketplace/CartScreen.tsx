import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { getDeliveryLocationLabel, useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { RuvoFirstOrderPromoBanner } from '../../components/premium/RuvoFirstOrderPromoBanner';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function CartScreen() {
  // BUSINESS LOGIC: Cart management
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { location } = useDeliveryLocation();
  const [locationPickerVisible, setLocationPickerVisible] = React.useState(false);
  const hasDeliveryLocation = Boolean(location);

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
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50 px-8">
        <Animated.View entering={FadeInDown.duration(600).springify()} className="items-center w-full">
          <View className="w-40 h-40 bg-orange-50 rounded-full items-center justify-center mb-8 border-8 border-white shadow-sm">
            <View className="w-32 h-32 bg-ruvo-yellow-soft rounded-full items-center justify-center">
              <Ionicons name="bag-handle-outline" size={60} color="#D99B00" />
            </View>
          </View>
          
          <Text className="text-2xl font-extrabold text-ruvo-ink mt-2 mb-3 text-center">
            Your cart awaits!
          </Text>
          <Text className="text-base text-gray-600 text-center mb-10 px-4 font-medium leading-6">
            Looks like you haven't added anything yet. Let's find something delicious for today.
          </Text>

          <TouchableOpacity
            className="w-full bg-ruvo-yellow py-4 rounded-xl items-center active:bg-ruvo-yellow-dark"
            style={{ shadowColor: '#D99B00', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text className="text-ruvo-ink font-black text-lg tracking-wide">
              Start Shopping Now
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const p = item.product;
    const imgUri = p.imageUrl || p.image || p.photoUrl;
    return (
      <View 
        className="bg-white rounded-[24px] p-3.5 mb-3 flex-row items-center gap-3 border border-gray-100/50"
        style={{ shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 }}
      >
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            className="w-16 h-16 rounded-xl bg-gray-50"
            resizeMode="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-xl bg-ruvo-yellow-soft items-center justify-center border border-ruvo-yellow-soft">
            <Ionicons name="basket" size={26} color="#F5B700" />
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
          <Text className="text-sm font-black text-ruvo-ink">
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
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* HEADER */}
      <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center justify-between shadow-sm">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-10 h-10 rounded-full bg-warm-100 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
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
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FOOTER */}
      <View 
        className="bg-white pt-4 px-5 border-t border-gray-100"
        style={{
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingBottom: 96, // Give clearance for the absolute TabBar
          shadowColor: '#1A1A1A',
          shadowOffset: { width: 0, height: -12 },
          shadowOpacity: 0.08,
          shadowRadius: 30,
          elevation: 20,
        }}
      >
        {/* Address Selection - Shown when address exists (can be tapped to change) */}
        {hasDeliveryLocation && (
          <TouchableOpacity
            className="border border-ruvo-yellow/30 bg-ruvo-yellow/10 rounded-2xl p-3 mb-4 flex-row items-center gap-3"
            onPress={() => setLocationPickerVisible(true)}
          >
            <Ionicons name="location-outline" size={18} color="#D99B00" />
            <View className="flex-1">
              <Text className="text-xs font-bold text-ruvo-yellow-dark">
                Delivering to
              </Text>
              <Text
                className="text-xs text-gray-700 mt-0.5"
                numberOfLines={1}
              >
                {getDeliveryLocationLabel(location)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}

        <View className="flex-row justify-between items-center mb-4 px-1">
          <Text className="text-gray-500 font-bold text-sm">Subtotal</Text>
          <Text className="text-2xl font-black text-ruvo-ink">
            ₹{cartTotal}
          </Text>
        </View>

        {/* Primary Action Button (Add Address OR Checkout) */}
        {!hasDeliveryLocation ? (
          <TouchableOpacity
            className="py-4 rounded-2xl flex-row justify-center gap-2 items-center bg-ruvo-yellow active:bg-ruvo-yellow-dark"
            style={{ shadowColor: '#F5B700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 }}
            onPress={() => setLocationPickerVisible(true)}
          >
            <Ionicons name="location-outline" size={20} color="#1A1A1A" />
            <Text className="text-ruvo-ink font-black text-center text-base">
              Add Delivery Address
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="py-4 rounded-2xl flex-row justify-center gap-2 items-center bg-ruvo-yellow active:bg-ruvo-yellow-dark"
            style={{ shadowColor: '#F5B700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 }}
            onPress={handleCheckout}
          >
            <Text className="text-ruvo-ink font-black text-center text-base">
              Proceed to Checkout
            </Text>
            <Ionicons name="arrow-forward-circle" size={20} color="#1A1A1A" />
          </TouchableOpacity>
        )}
      </View>

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
