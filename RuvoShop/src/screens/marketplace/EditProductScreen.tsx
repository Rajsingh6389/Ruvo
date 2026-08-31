/**
 * EditProductScreen - RuvoShop (Redesigned)
 * Full NativeWind + Reanimated premium UI.
 * All image picking, validation, and update logic preserved.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { CategoryDropdown } from '../../components/CategoryDropdown';
import { updateProduct, updateProductWithImage, getProductById } from '../../services/productService';
import type { Product } from '../../services/productService';
import { Button } from '../../components/ui/Button';

interface FormErrors {
  name?: string; category?: string; actualPrice?: string;
  sellingPrice?: string; stockQuantity?: string;
}

export const EditProductScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { token } = useAuth();
  const initialProduct: Product | undefined = route.params?.product;
  const targetProductId: number | undefined = initialProduct?.id ?? route.params?.productId;

  const [name, setName] = useState(initialProduct?.name ?? '');
  const [category, setCategory] = useState(initialProduct?.category ?? '');
  const [brandName, setBrandName] = useState(initialProduct?.brandName ?? '');
  const [description, setDescription] = useState(initialProduct?.description ?? '');
  const [actualPrice, setActualPrice] = useState(initialProduct?.actualPrice?.toString() ?? '');
  const [sellingPrice, setSellingPrice] = useState(initialProduct?.sellingPrice?.toString() ?? '');
  const [stockQuantity, setStockQuantity] = useState(initialProduct?.stockQuantity?.toString() ?? '');
  const [unit, setUnit] = useState(initialProduct?.unit ?? '');
  const [isAvailable, setIsAvailable] = useState(initialProduct?.isAvailable ?? true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(initialProduct?.imageUrl ?? null);
  const [imageType, setImageType] = useState('image/jpeg');
  const [imageName, setImageName] = useState('product.jpg');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(!initialProduct && !!targetProductId);

  React.useEffect(() => {
    if (!initialProduct && targetProductId && token) {
      setFetchingProduct(true);
      getProductById(targetProductId, token)
        .then(p => {
          if (p) {
            setName(p.name ?? '');
            setCategory(p.category ?? '');
            setBrandName(p.brandName ?? '');
            setDescription(p.description ?? '');
            setActualPrice(p.actualPrice?.toString() ?? '');
            setSellingPrice(p.sellingPrice?.toString() ?? '');
            setStockQuantity(p.stockQuantity?.toString() ?? '');
            setUnit(p.unit ?? '');
            setIsAvailable(p.isAvailable ?? true);
            setExistingImageUrl(p.imageUrl ?? null);
          }
        })
        .catch(err => Alert.alert('Error', err.message || 'Failed to load product details'))
        .finally(() => setFetchingProduct(false));
    }
  }, [initialProduct, targetProductId, token]);

  const computedDiscount = useCallback((): string | null => {
    const ap = parseFloat(actualPrice);
    const sp = parseFloat(sellingPrice);
    if (!isNaN(ap) && !isNaN(sp) && ap > 0 && sp >= 0 && sp <= ap) {
      const disc = ((ap - sp) / ap) * 100;
      return disc === 0 ? null : `${Math.round(disc * 100) / 100}% OFF`;
    }
    return null;
  }, [actualPrice, sellingPrice]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri ?? null);
        setImageType(asset.mimeType ?? 'image/jpeg');
        setImageName(asset.fileName ?? 'product.jpg');
      }
    } catch {}
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!category) newErrors.category = 'Category is required';
    const ap = parseFloat(actualPrice);
    const sp = parseFloat(sellingPrice);
    if (!actualPrice.trim() || isNaN(ap) || ap <= 0) newErrors.actualPrice = 'Enter a valid actual price';
    if (!sellingPrice.trim() || isNaN(sp) || sp < 0) newErrors.sellingPrice = 'Enter a valid selling price';
    else if (ap && sp > ap) newErrors.sellingPrice = 'Selling price cannot exceed actual price';
    const sq = parseInt(stockQuantity, 10);
    if (!stockQuantity.trim() || isNaN(sq) || sq < 0) newErrors.stockQuantity = 'Enter a valid stock quantity';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!token || !targetProductId) { Alert.alert('Error', 'Product ID missing or authentication error'); return; }
    setLoading(true);
    try {
      const ap = parseFloat(actualPrice);
      const sp = parseFloat(sellingPrice);
      const sq = parseInt(stockQuantity, 10);
      const disc = ap > 0 ? Math.round(((ap - sp) / ap) * 100 * 100) / 100 : 0;

      if (imageUri) {
        const formData = new FormData();
        formData.append('product', JSON.stringify({
          name: name.trim(), category, brandName: brandName.trim() || null,
          description: description.trim() || null, actualPrice: ap, sellingPrice: sp,
          discount: disc, stockQuantity: sq, unit: unit.trim() || null, isAvailable,
        }));
        (formData as any).append('image', { uri: imageUri, type: imageType, name: imageName });
        await updateProductWithImage(targetProductId, formData, token);
      } else {
        await updateProduct(targetProductId, {
          name: name.trim(), category, brandName: brandName.trim() || undefined,
          description: description.trim() || undefined, actualPrice: ap, sellingPrice: sp,
          discount: disc, stockQuantity: sq, unit: unit.trim() || undefined, isAvailable,
        }, token);
      }
      Alert.alert('Success', 'Product updated successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const displayImageUri = imageUri ?? existingImageUrl;
  const discount = computedDiscount();

  if (fetchingProduct) {
    return (
      <SafeAreaView className="flex-1 bg-ruvo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#F5B700" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center gap-md">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 bg-warm-200 rounded-lg items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#231C10" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-extrabold text-ruvo-ink">Edit Product</Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="px-lg pt-lg pb-2xl"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Image */}
          <Animated.View entering={FadeInUp.duration(500)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">Product Image</Text>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {displayImageUri ? (
                  <View className="relative">
                    <Image source={{ uri: displayImageUri }} className="w-full h-44 rounded-xl" resizeMode="cover" />
                    <View className="absolute inset-0 bg-black/30 rounded-xl items-center justify-center">
                      <View className="bg-white/80 px-md py-xs rounded-lg flex-row items-center gap-xs">
                        <Ionicons name="camera" size={16} color="#231C10" />
                        <Text className="text-sm font-bold text-ruvo-ink">Change Photo</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="border-2 border-dashed border-warm-400 rounded-xl py-xl items-center justify-center gap-sm">
                    <Ionicons name="camera-outline" size={32} color="#A79E92" />
                    <Text className="text-sm font-bold text-warm-600">Tap to add product photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Basic Details */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">Basic Details</Text>

              <Text className="text-xs font-bold text-warm-700 mb-xs">Product Name *</Text>
              <TextInput
                value={name}
                onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: undefined })); }}
                placeholder="Product name"
                placeholderTextColor="#A79E92"
                className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink mb-xs ${errors.name ? 'border-red-400' : 'border-warm-300'}`}
              />
              {errors.name && <Text className="text-xs text-red-500 mb-sm">{errors.name}</Text>}

              <Text className="text-xs font-bold text-warm-700 mt-sm mb-xs">Category *</Text>
              <CategoryDropdown
                value={category}
                onChange={v => { setCategory(v); setErrors(e => ({ ...e, category: undefined })); }}
              />
              {errors.category && <Text className="text-xs text-red-500 mt-xs">{errors.category}</Text>}

              <Text className="text-xs font-bold text-warm-700 mt-sm mb-xs">Brand Name</Text>
              <TextInput value={brandName} onChangeText={setBrandName} placeholder="Optional" placeholderTextColor="#A79E92" className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink" />

              <Text className="text-xs font-bold text-warm-700 mt-sm mb-xs">Description</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Optional" placeholderTextColor="#A79E92" multiline numberOfLines={3} className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink" style={{ textAlignVertical: 'top', minHeight: 80 }} />
            </View>
          </Animated.View>

          {/* Pricing */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">Pricing</Text>
              <View className="flex-row gap-md">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-warm-700 mb-xs">Actual Price (₹) *</Text>
                  <TextInput value={actualPrice} onChangeText={t => { setActualPrice(t); setErrors(e => ({ ...e, actualPrice: undefined })); }} placeholder="0.00" placeholderTextColor="#A79E92" keyboardType="decimal-pad" className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink ${errors.actualPrice ? 'border-red-400' : 'border-warm-300'}`} />
                  {errors.actualPrice && <Text className="text-xs text-red-500 mt-xs">{errors.actualPrice}</Text>}
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-warm-700 mb-xs">Selling Price (₹) *</Text>
                  <TextInput value={sellingPrice} onChangeText={t => { setSellingPrice(t); setErrors(e => ({ ...e, sellingPrice: undefined })); }} placeholder="0.00" placeholderTextColor="#A79E92" keyboardType="decimal-pad" className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink ${errors.sellingPrice ? 'border-red-400' : 'border-warm-300'}`} />
                  {errors.sellingPrice && <Text className="text-xs text-red-500 mt-xs">{errors.sellingPrice}</Text>}
                </View>
              </View>
              {discount && (
                <View className="mt-sm bg-ruvo-yellow/20 rounded-lg px-md py-xs flex-row items-center gap-xs">
                  <Ionicons name="pricetag" size={14} color="#F5B700" />
                  <Text className="text-sm font-extrabold text-ruvo-ink">{discount} discount applied</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Inventory */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">Inventory</Text>
              <View className="flex-row gap-md">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-warm-700 mb-xs">Stock Quantity *</Text>
                  <TextInput value={stockQuantity} onChangeText={t => { setStockQuantity(t); setErrors(e => ({ ...e, stockQuantity: undefined })); }} placeholder="0" placeholderTextColor="#A79E92" keyboardType="number-pad" className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink ${errors.stockQuantity ? 'border-red-400' : 'border-warm-300'}`} />
                  {errors.stockQuantity && <Text className="text-xs text-red-500 mt-xs">{errors.stockQuantity}</Text>}
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-warm-700 mb-xs">Unit (optional)</Text>
                  <TextInput value={unit} onChangeText={setUnit} placeholder="kg, pcs..." placeholderTextColor="#A79E92" className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink" />
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-lg pt-md border-t border-warm-200">
                <View>
                  <Text className="text-sm font-extrabold text-ruvo-ink">Available for Sale</Text>
                  <Text className="text-xs text-warm-600 font-medium mt-xs">Customers can buy this product</Text>
                </View>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: '#D1C7BA', true: '#F5B700' }} thumbColor="#FFF" />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <Button variant="primary" onPress={handleSubmit} loading={loading} icon="checkmark-circle">
              Save Changes
            </Button>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
