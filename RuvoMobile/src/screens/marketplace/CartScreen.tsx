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
      <SafeAreaView className="flex-1 justify-center items-center bg-ruvo-bg px-8">
        <Animated.View entering={FadeInDown.duration(600).springify()} className="items-center w-full">
          <View className="w-40 h-40 bg-ruvo-yellow-soft rounded-full items-center justify-center mb-8 border-8 border-white shadow-sm">
            <View className="w-28 h-28 bg-white rounded-full items-center justify-center border border-ruvo-border">
              <Ionicons name="bag-handle-outline" size={52} color="#F4B400" />
            </View>
          </View>
          
          <Text className="text-2xl font-black text-ruvo-ink mt-2 mb-3 text-center">
            Your cart awaits!
          </Text>
          <Text className="text-sm text-ruvo-muted text-center mb-8 px-4 font-medium leading-6">
            Looks like you haven't added anything yet. Let's find something delicious for today.
          </Text>

          <TouchableOpacity
            className="w-full bg-ruvo-yellow py-4 rounded-xl items-center shadow-md active:bg-ruvo-yellow-dark"
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text className="text-ruvo-ink font-black text-base tracking-wide">
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
        className="bg-white rounded-[20px] p-3.5 mb-3 flex-row items-center gap-3 border border-ruvo-border shadow-xs"
      >
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
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-extrabold text-ruvo-ink mb-0.5" numberOfLines={1}>
            {p.name}
          </Text>
          {p.shopName && (
            <Text className="text-[11px] text-ruvo-muted font-semibold mb-1" numberOfLines={1}>
              {p.shopName}
            </Text>
          )}
          <Text className="text-sm font-black text-ruvo-ink">
            ₹{p.sellingPrice || p.price || 0}
          </Text>
        </View>
        <View className="flex-row items-center bg-ruvo-card rounded-full px-2 py-1 border border-ruvo-border">
          <TouchableOpacity
            className="w-6 h-6 rounded-full bg-white items-center justify-center border border-ruvo-border"
            onPress={() => updateQuantity(p.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={14} color="#171A1F" />
          </TouchableOpacity>
          <Text className="text-xs font-black w-6 text-center text-ruvo-ink">
            {item.quantity}
          </Text>
          <TouchableOpacity
            className="w-6 h-6 rounded-full bg-white items-center justify-center border border-ruvo-border"
            onPress={() => updateQuantity(p.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={14} color="#171A1F" />
          </TouchableOpacity>
          <TouchableOpacity
            className="ml-2 p-1"
            onPress={() => removeFromCart(p.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#D94A4A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg">
      {/* HEADER */}
      <View className="bg-white px-4 py-3 border-b border-ruvo-border flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-10 h-10 rounded-full bg-ruvo-card border border-ruvo-border items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color="#171A1F" />
        </TouchableOpacity>
        <Text className="text-lg font-black text-ruvo-ink">
          Your Cart
        </Text>
        <TouchableOpacity
          onPress={clearCart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-red-600 font-bold text-xs uppercase tracking-wider">
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
        className="bg-white pt-4 px-5 border-t border-ruvo-border"
        style={{
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: 96,
          shadowColor: '#171A1F',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        {/* Address Selection */}
        {hasDeliveryLocation && (
          <TouchableOpacity
            className="border border-ruvo-border bg-ruvo-card rounded-2xl p-3 mb-4 flex-row items-center gap-3"
            onPress={() => setLocationPickerVisible(true)}
          >
            <Ionicons name="location" size={18} color="#F4B400" />
            <View className="flex-1">
              <Text className="text-xs font-black text-ruvo-ink">
                Delivering to
              </Text>
              <Text
                className="text-xs text-ruvo-muted font-medium mt-0.5"
                numberOfLines={1}
              >
                {getDeliveryLocationLabel(location)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A39D93" />
          </TouchableOpacity>
        )}

        <View className="flex-row justify-between items-center mb-4 px-1">
          <Text className="text-ruvo-muted font-bold text-sm">Subtotal</Text>
          <Text className="text-2xl font-black text-ruvo-ink">
            ₹{cartTotal}
          </Text>
        </View>

        {/* Primary Action Button */}
        {!hasDeliveryLocation ? (
          <TouchableOpacity
            className="py-4 rounded-xl flex-row justify-center gap-2 items-center bg-ruvo-yellow active:bg-ruvo-yellow-dark shadow-sm"
            onPress={() => setLocationPickerVisible(true)}
          >
            <Ionicons name="location-outline" size={20} color="#171A1F" />
            <Text className="text-ruvo-ink font-black text-center text-base">
              Add Delivery Address
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="py-4 rounded-xl flex-row justify-center gap-2 items-center bg-ruvo-yellow active:bg-ruvo-yellow-dark shadow-sm"
            onPress={handleCheckout}
          >
            <Text className="text-ruvo-ink font-black text-center text-base">
              Proceed to Checkout
            </Text>
            <Ionicons name="arrow-forward-circle" size={20} color="#171A1F" />
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
