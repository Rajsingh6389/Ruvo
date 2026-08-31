/**
 * AddProductScreen - RuvoShop (Redesigned)
 * Full NativeWind + Reanimated premium UI.
 * All image picking, validation, and upload logic preserved.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { CategoryDropdown } from '../../components/CategoryDropdown';
import { uploadProduct, addProduct } from '../../services/productService';
import { Button } from '../../components/ui/Button';

const MAX_IMAGES = 8;

interface ProductImage { uri: string; type: string; fileName: string; }
interface FormErrors {
  name?: string; category?: string; actualPrice?: string;
  sellingPrice?: string; stockQuantity?: string;
}

export const AddProductScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { token } = useAuth();
  const shopId: number = route.params?.shopId;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [actualPrice, setActualPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const computedDiscount = useCallback((): string | null => {
    const ap = parseFloat(actualPrice);
    const sp = parseFloat(sellingPrice);
    if (!isNaN(ap) && !isNaN(sp) && ap > 0 && sp >= 0 && sp <= ap) {
      const disc = ((ap - sp) / ap) * 100;
      return disc === 0 ? null : `${Math.round(disc * 100) / 100}% OFF`;
    }
    return null;
  }, [actualPrice, sellingPrice]);

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} product photos.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
      });
      if (result.canceled || !result.assets?.length) return;
      const newImgs: ProductImage[] = result.assets.map((asset, i) => ({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `product_${Date.now()}_${i}.jpg`,
      }));
      setImages(prev => [...prev, ...newImgs].slice(0, MAX_IMAGES));
    } catch {
      Alert.alert('Image error', 'Could not select images.');
    }
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

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
    if (!token) { Alert.alert('Error', 'You are not logged in'); return; }
    setLoading(true);
    try {
      const ap = parseFloat(actualPrice);
      const sp = parseFloat(sellingPrice);
      const sq = parseInt(stockQuantity, 10);
      const disc = ap > 0 ? Math.round(((ap - sp) / ap) * 100 * 100) / 100 : 0;

      if (images.length > 0) {
        const formData = new FormData();
        formData.append('product', JSON.stringify({
          shopId, name: name.trim(), category,
          brandName: brandName.trim() || null, description: description.trim() || null,
          actualPrice: ap, sellingPrice: sp, discount: disc,
          stockQuantity: sq, unit: unit.trim() || null, isAvailable,
        }));
        formData.append('image', { uri: images[0].uri, type: images[0].type, name: images[0].fileName } as any);
        for (let i = 1; i < images.length; i++) {
          formData.append('images', { uri: images[i].uri, type: images[i].type, name: images[i].fileName } as any);
        }
        await uploadProduct(formData, token);
      } else {
        await addProduct({
          shopId, name: name.trim(), category,
          brandName: brandName.trim() || undefined, description: description.trim() || undefined,
          actualPrice: ap, sellingPrice: sp, discount: disc,
          stockQuantity: sq, unit: unit.trim() || undefined, isAvailable,
        }, token);
      }
      Alert.alert('Success', 'Product added successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const discount = computedDiscount();

  return (
    <SafeAreaView className="flex-1 bg-ruvo-bg" edges={['top']}>
      {/* Header */}
      <View className="bg-ruvo-surface border-b border-warm-300 px-lg py-md flex-row items-center gap-md">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 bg-warm-200 rounded-lg items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#231C10" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-extrabold text-ruvo-ink">Add Product</Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="px-lg pt-lg pb-2xl"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Photos */}
          <Animated.View entering={FadeInUp.duration(500)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <View className="flex-row items-center justify-between mb-md">
                <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider">Product Photos</Text>
                <Text className="text-xs text-warm-600 font-semibold">{images.length}/{MAX_IMAGES}</Text>
              </View>

              {images.length > 0 && (
                <View className="relative mb-md">
                  <Image source={{ uri: images[0].uri }} className="w-full h-48 rounded-xl" resizeMode="cover" />
                  <View className="absolute bottom-sm left-sm bg-ruvo-yellow px-sm py-xs rounded-md">
                    <Text className="text-xs font-extrabold text-ruvo-ink">Cover photo</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeImage(0)} className="absolute top-sm right-sm w-8 h-8 bg-red-500 rounded-full items-center justify-center">
                    <Ionicons name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}

              {images.length > 1 && (
                <View className="flex-row flex-wrap gap-sm mb-md">
                  {images.slice(1).map((img, idx) => (
                    <View key={idx} className="relative w-20 h-20">
                      <Image source={{ uri: img.uri }} className="w-20 h-20 rounded-lg" resizeMode="cover" />
                      <TouchableOpacity onPress={() => removeImage(idx + 1)} className="absolute top-xs right-xs w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                        <Ionicons name="close" size={10} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                onPress={pickImages}
                className="border-2 border-dashed border-warm-400 rounded-xl py-lg items-center justify-center gap-sm flex-row"
              >
                <Ionicons name="camera-outline" size={22} color="#A79E92" />
                <Text className="text-sm font-bold text-warm-600">
                  {images.length === 0 ? 'Add product photos' : 'Add more photos'}
                </Text>
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
                placeholder="e.g. Fresh Organic Tomatoes"
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
              <TextInput
                value={brandName}
                onChangeText={setBrandName}
                placeholder="Optional"
                placeholderTextColor="#A79E92"
                className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink"
              />

              <Text className="text-xs font-bold text-warm-700 mt-sm mb-xs">Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Optional product description"
                placeholderTextColor="#A79E92"
                multiline
                numberOfLines={3}
                className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink"
                style={{ textAlignVertical: 'top', minHeight: 80 }}
              />
            </View>
          </Animated.View>

          {/* Pricing */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
            <View className="bg-ruvo-surface border border-warm-300 rounded-xl p-lg mb-lg">
              <Text className="text-xs font-extrabold text-warm-700 uppercase tracking-wider mb-md">Pricing</Text>

              <View className="flex-row gap-md">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-warm-700 mb-xs">Actual Price (₹) *</Text>
                  <TextInput
                    value={actualPrice}
                    onChangeText={t => { setActualPrice(t); setErrors(e => ({ ...e, actualPrice: undefined })); }}
                    placeholder="0.00"
                    placeholderTextColor="#A79E92"
                    keyboardType="decimal-pad"
                    className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink ${errors.actualPrice ? 'border-red-400' : 'border-warm-300'}`}
                  />
                  {errors.actualPrice && <Text className="text-xs text-red-500 mt-xs">{errors.actualPrice}</Text>}
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-warm-700 mb-xs">Selling Price (₹) *</Text>
                  <TextInput
                    value={sellingPrice}
                    onChangeText={t => { setSellingPrice(t); setErrors(e => ({ ...e, sellingPrice: undefined })); }}
                    placeholder="0.00"
                    placeholderTextColor="#A79E92"
                    keyboardType="decimal-pad"
                    className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink ${errors.sellingPrice ? 'border-red-400' : 'border-warm-300'}`}
                  />
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
                  <TextInput
                    value={stockQuantity}
                    onChangeText={t => { setStockQuantity(t); setErrors(e => ({ ...e, stockQuantity: undefined })); }}
                    placeholder="0"
                    placeholderTextColor="#A79E92"
                    keyboardType="number-pad"
                    className={`bg-warm-100 border rounded-lg px-md py-sm text-sm text-ruvo-ink ${errors.stockQuantity ? 'border-red-400' : 'border-warm-300'}`}
                  />
                  {errors.stockQuantity && <Text className="text-xs text-red-500 mt-xs">{errors.stockQuantity}</Text>}
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-warm-700 mb-xs">Unit (optional)</Text>
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="kg, pcs, litre..."
                    placeholderTextColor="#A79E92"
                    className="bg-warm-100 border border-warm-300 rounded-lg px-md py-sm text-sm text-ruvo-ink"
                  />
                </View>
              </View>

              <View className="flex-row items-center justify-between mt-lg pt-md border-t border-warm-200">
                <View>
                  <Text className="text-sm font-extrabold text-ruvo-ink">Available for Sale</Text>
                  <Text className="text-xs text-warm-600 font-medium mt-xs">Customers can buy this product</Text>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{ false: '#D1C7BA', true: '#F5B700' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <Button variant="primary" onPress={handleSubmit} loading={loading} icon="checkmark-circle">
              Add Product
            </Button>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
