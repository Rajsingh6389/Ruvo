import React, { useState, useCallback, useEffect } from 'react';
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
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

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
  const { token, userId } = useAuth();
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
  const [activeField, setActiveField] = useState<string | null>(null);

  useEffect(() => {
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
      const disc = ap > 0 ? Math.round(((ap - sp) / ap) * 100) : 0;

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

  const InputField = ({ label, icon, value, onChangeText, placeholder, errorText, isMultiline = false, ...props }: any) => {
    const isFocused = activeField === label;
    return (
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`text-xs font-black uppercase tracking-wider ${isFocused ? 'text-[#FF7A00]' : 'text-gray-500'}`}>{label}</Text>
          {errorText && <Text className="text-[10px] font-bold text-red-500 uppercase">{errorText}</Text>}
        </View>
        <View className={`flex-row items-start border-[1.5px] rounded-2xl px-4 py-2 flex-1 bg-white shadow-sm ${
          errorText ? 'border-red-400' : isFocused ? 'border-[#FF7A00]' : 'border-gray-100'
        }`} style={{ minHeight: isMultiline ? 100 : 56 }}>
          <Ionicons name={icon} size={20} color={errorText ? '#F87171' : isFocused ? '#FF7A00' : '#9CA3AF'} className={`mr-3 ${isMultiline ? 'mt-2' : 'mt-2.5'}`} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            onFocus={() => setActiveField(label)}
            onBlur={() => setActiveField(null)}
            multiline={isMultiline}
            style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, flex: 1, paddingVertical: 10, textAlignVertical: isMultiline ? 'top' : 'center', minHeight: isMultiline ? 80 : 0 }}
            {...props}
          />
        </View>
      </View>
    );
  };

  if (fetchingProduct) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FF7A00" />
        <Text className="text-sm text-gray-500 mt-4 font-bold tracking-widest uppercase">Fetching Details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center gap-4 shadow-sm z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-gray-50 rounded-full border border-gray-100 items-center justify-center active:opacity-70">
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-gray-900 tracking-tight">Edit Product</Text>
          <Text className="text-[11px] text-[#FF7A00] font-black uppercase tracking-widest mt-0.5">Manage Catalog</Text>
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 250 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Image */}
          <Animated.View entering={FadeInUp.duration(500)}>
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 items-center justify-center">
                  <Ionicons name="image" size={14} color="#FF7A00" />
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Product Photo</Text>
              </View>

              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {displayImageUri ? (
                  <View className="relative shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                    <Image source={{ uri: displayImageUri }} className="w-full h-48" resizeMode="cover" />
                    <View className="absolute inset-0 bg-black/40 items-center justify-center">
                      <View className="bg-white/95 px-5 py-3 rounded-full flex-row items-center gap-3 shadow-xl">
                        <Ionicons name="camera" size={18} color="#FF7A00" />
                        <Text className="text-sm font-black text-gray-900 tracking-wider uppercase">Change Photo</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl py-12 items-center justify-center gap-3 active:bg-gray-100">
                    <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                    <Text className="text-xs font-black text-gray-500 uppercase tracking-widest">Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Basic Details */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                  <Ionicons name="cube" size={16} color="#3B82F6" />
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Basic Details</Text>
              </View>

              <InputField label="Product Name *" icon="text-outline" value={name} onChangeText={(t: string) => { setName(t); setErrors(e => ({ ...e, name: undefined })); }} placeholder="e.g. Fresh Apples" errorText={errors.name} />

              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`text-xs font-black uppercase tracking-wider ${activeField === 'Category' ? 'text-[#FF7A00]' : 'text-gray-500'}`}>Category *</Text>
                  {errors.category && <Text className="text-[10px] font-bold text-red-500 uppercase">{errors.category}</Text>}
                </View>
                <CategoryDropdown
                  value={category}
                  onChange={v => { setCategory(v); setErrors(e => ({ ...e, category: undefined })); }}
                />
              </View>

              <InputField label="Brand Name" icon="business-outline" value={brandName} onChangeText={setBrandName} placeholder="Optional, e.g. RuVo Farms" />
              <InputField label="Description" icon="document-text-outline" value={description} onChangeText={setDescription} placeholder="About this product..." isMultiline={true} />
            </View>
          </Animated.View>

          {/* Pricing */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-green-50 border border-green-100 items-center justify-center">
                  <Ionicons name="pricetag" size={14} color="#10B981" />
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Pricing</Text>
              </View>

              <InputField label="Actual Price (₹) *" icon="cash-outline" value={actualPrice} onChangeText={(t: string) => { setActualPrice(t); setErrors(e => ({ ...e, actualPrice: undefined })); }} placeholder="0.00" keyboardType="decimal-pad" errorText={errors.actualPrice} />
              <InputField label="Selling Price (₹) *" icon="cash" value={sellingPrice} onChangeText={(t: string) => { setSellingPrice(t); setErrors(e => ({ ...e, sellingPrice: undefined })); }} placeholder="0.00" keyboardType="decimal-pad" errorText={errors.sellingPrice} />
              
              {discount && (
                <Animated.View entering={FadeIn.duration(300)} className="mb-2 bg-green-50 rounded-xl px-4 py-3 border border-green-200 flex-row items-center gap-3">
                  <Ionicons name="sparkles" size={16} color="#16A34A" />
                  <Text className="text-sm font-black text-green-700 tracking-wide">{discount} discount applied!</Text>
                </Animated.View>
              )}
            </View>
          </Animated.View>

          {/* Inventory */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)}>
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 items-center justify-center">
                  <Ionicons name="layers" size={14} color="#9333EA" />
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Inventory</Text>
              </View>

              <InputField label="Stock Quantity *" icon="albums-outline" value={stockQuantity} onChangeText={(t: string) => { setStockQuantity(t); setErrors(e => ({ ...e, stockQuantity: undefined })); }} placeholder="0" keyboardType="number-pad" errorText={errors.stockQuantity} />
              <InputField label="Unit (optional)" icon="scale-outline" value={unit} onChangeText={setUnit} placeholder="e.g. kg, pcs" />
              
              <View className="flex-row items-center justify-between mt-4 pt-6 border-t border-gray-100">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Ionicons name={isAvailable ? "eye" : "eye-off"} size={16} color={isAvailable ? "#FF7A00" : "#9CA3AF"} />
                    <Text className={`text-[13px] font-black tracking-widest uppercase ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>Available for Sale</Text>
                  </View>
                  <Text className="text-[11px] font-semibold text-gray-500 leading-4">Turning this off instantly hides the product from the customer app.</Text>
                </View>
                <Switch 
                  value={isAvailable} 
                  onValueChange={setIsAvailable} 
                  trackColor={{ false: '#E5E7EB', true: '#FF7A00' }} 
                  thumbColor="#FFF" 
                  style={{ transform: [{ scale: 1.1 }] }}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <TouchableOpacity onPress={handleSubmit} disabled={loading} className="bg-[#FF7A00] rounded-[20px] py-4 items-center justify-center flex-row shadow-lg active:opacity-[0.85]" style={{ shadowColor: '#FF7A00' }}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text className="text-base font-black text-white uppercase tracking-widest">Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
