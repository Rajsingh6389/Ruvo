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

import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

import { useAuth } from '../../context/AuthContext';
import { CategoryDropdown } from '../../components/CategoryDropdown';
import { uploadProduct, addProduct } from '../../services/productService';
<<<<<<< HEAD

=======
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL } from '../../config/api';

const MAX_IMAGES = 8;

interface ProductImage { uri: string; type: string; fileName: string; }
interface FormErrors {
  name?: string; category?: string; actualPrice?: string;
  sellingPrice?: string; stockQuantity?: string;
}

<<<<<<< HEAD
export const AddProductScreen = ({ navigation, route }: any) => {
  const { token } = useAuth();
=======
const InputField = ({ label, icon, value, onChangeText, placeholder, errorText, isMultiline = false, ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false);
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={isMultiline}
          style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, flex: 1, paddingVertical: 10, textAlignVertical: isMultiline ? 'top' : 'center', minHeight: isMultiline ? 80 : 0 }}
          {...props}
        />
      </View>
    </View>
  );
};


export const AddProductScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { token, user, userId } = useAuth();
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
  const { showToast } = useToast();

  const [shopId, setShopId] = useState<number | string | undefined>(route.params?.shopId);

  useEffect(() => {
    async function resolveShopId() {
      if (!shopId && token && (userId || user)) {
        try {
          const ownerId = userId || user?.email || '';
          const res = await fetch(`${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerId)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setShopId(data[0].id);
          }
        } catch (e) {}
      }
    }
    resolveShopId();
  }, [shopId, token, user, userId]);

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
  const [activeField, setActiveField] = useState<string | null>(null);

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
      showToast(`You can add up to ${MAX_IMAGES} product photos.`, 'warning');
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
      showToast('Could not select images.', 'error');
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
    if (!token) { showToast('You are not logged in', 'error'); return; }
    if (!shopId) { showToast('Could not link to your shop', 'error'); return; }
    setLoading(true);
    try {
      const ap = parseFloat(actualPrice);
      const sp = parseFloat(sellingPrice);
      const sq = parseInt(stockQuantity, 10);
      const disc = ap > 0 ? Math.round(((ap - sp) / ap) * 100) : 0;

      if (images.length > 0) {
        const formData = new FormData();
        formData.append('product', JSON.stringify({
          shopId: Number(shopId), name: name.trim(), category,
          brandName: brandName.trim() || null, description: description.trim() || null,
          actualPrice: Number(ap), sellingPrice: Number(sp), discount: disc,
          stockQuantity: Number(sq), unit: unit.trim() || null, isAvailable,
        }));
        (formData as any).append('image', { uri: images[0].uri, type: images[0].type, name: images[0].fileName });
        for (let i = 0; i < images.length; i++) {
          (formData as any).append('images', { uri: images[i].uri, type: images[i].type, name: images[i].fileName });
        }
        await uploadProduct(formData, token);
      } else {
        await addProduct({
          shopId: Number(shopId), name: name.trim(), category,
          brandName: brandName.trim() || undefined, description: description.trim() || undefined,
          actualPrice: Number(ap), sellingPrice: Number(sp), discount: disc,
          stockQuantity: Number(sq), unit: unit.trim() || undefined, isAvailable,
        }, token);
      }
      showToast('Product added successfully!', 'success');
      navigation.goBack();
    } catch (err: any) {
      showToast(err?.message || 'Failed to add product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const discount = computedDiscount();

  const inputClass = "bg-warm-50 border border-warm-200 rounded-[18px] px-4 py-[16px] text-[15px] font-semibold text-ruvo-ink";
  const labelClass = "text-[13px] font-extrabold text-ruvo-ink mb-2 mt-4";
  const sectionClass = "bg-ruvo-surface border border-warm-200 rounded-[24px] p-5 mb-5 shadow-sm";
  const sectionHeaderClass = "text-[12px] font-black text-warm-500 uppercase tracking-widest mb-4 border-b border-warm-100 pb-3";

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* Header */}
<<<<<<< HEAD
      <View className="bg-ruvo-surface border-b border-warm-200 shadow-sm z-10 px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 bg-warm-50 rounded-[12px] border border-warm-200 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#171A1F" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-ruvo-ink tracking-tight">Add Product</Text>
          <Text className="text-[12px] font-bold text-warm-600">Expand your digital catalog</Text>
        </View>
        <View className="w-10 h-10 bg-ruvo-yellow/20 rounded-[12px] border border-ruvo-yellow/30 items-center justify-center">
          <Ionicons name="add-circle" size={18} color="#D97706" />
=======
      <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center gap-4 shadow-sm z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-gray-50 rounded-full border border-gray-100 items-center justify-center active:opacity-70">
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-gray-900 tracking-tight">Add New Product</Text>
          <Text className="text-[11px] text-[#FF7A00] font-black uppercase tracking-widest mt-0.5">Grow Your Catalog</Text>
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
<<<<<<< HEAD
          contentContainerClassName="px-4 pt-5 pb-10"
=======
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 250 }}
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Photos */}
          <Animated.View entering={FadeInUp.duration(500)}>
<<<<<<< HEAD
            <View className={sectionClass}>
              <View className="flex-row items-center justify-between mb-4 border-b border-warm-100 pb-3">
                <Text className="text-[12px] font-black text-warm-500 uppercase tracking-widest">Product Photos</Text>
                <View className="bg-warm-100 px-2 py-0.5 rounded-[8px]">
                   <Text className="text-[11px] font-bold text-warm-700">{images.length}/{MAX_IMAGES}</Text>
                </View>
              </View>

              {images.length > 0 && (
                <View className="relative mb-4">
                  <Image source={{ uri: images[0].uri }} className="w-full h-[220px] rounded-[18px]" resizeMode="cover" />
                  <View className="absolute bottom-3 left-3 bg-ruvo-yellow px-3 py-1.5 rounded-[10px] shadow-sm">
                    <Text className="text-[12px] font-black text-ruvo-ink uppercase tracking-wide">Cover Photo</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeImage(0)} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full items-center justify-center backdrop-blur-sm">
                    <Ionicons name="close" size={18} color="#FFF" />
=======
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
              <View className="flex-row items-center justify-between mb-6 border-b border-gray-50 pb-4">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 items-center justify-center">
                    <Ionicons name="images" size={14} color="#FF7A00" />
                  </View>
                  <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Photos</Text>
                </View>
                <Text className="text-[11px] font-black text-[#FF7A00] uppercase tracking-widest">{images.length}/{MAX_IMAGES}</Text>
              </View>

              {images.length > 0 && (
                <View className="relative shadow-sm rounded-2xl overflow-hidden border border-gray-200 mb-4">
                  <Image source={{ uri: images[0].uri }} className="w-full h-48" resizeMode="cover" />
                  <View className="absolute bottom-3 left-3 bg-[#FF7A00] shadow-md px-3 py-1.5 rounded-lg flex-row items-center gap-1.5">
                    <Ionicons name="star" size={14} color="#FFF" />
                    <Text className="text-[11px] font-black text-white uppercase tracking-widest">Cover</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeImage(0)} className="absolute top-3 right-3 w-8 h-8 bg-red-500 rounded-full items-center justify-center shadow-lg active:scale-95">
                    <Ionicons name="trash" size={16} color="#FFF" />
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
                  </TouchableOpacity>
                </View>
              )}

              {images.length > 1 && (
<<<<<<< HEAD
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {images.slice(1).map((img, idx) => (
                    <View key={idx} className="relative w-[72px] h-[72px]">
                      <Image source={{ uri: img.uri }} className="w-full h-full rounded-[14px]" resizeMode="cover" />
                      <TouchableOpacity onPress={() => removeImage(idx + 1)} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full items-center justify-center border-2 border-white">
=======
                <View className="flex-row flex-wrap gap-3 mb-4">
                  {images.slice(1).map((img, idx) => (
                    <View key={idx} className="relative w-[72px] h-[72px]">
                      <Image source={{ uri: img.uri }} className="w-[72px] h-[72px] rounded-xl border border-gray-200" resizeMode="cover" />
                      <TouchableOpacity onPress={() => removeImage(idx + 1)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center shadow-md active:scale-95 border-2 border-white">
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
                        <Ionicons name="close" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                onPress={pickImages}
<<<<<<< HEAD
                activeOpacity={0.7}
                className="bg-warm-50 border border-dashed border-warm-300 rounded-[16px] py-6 items-center justify-center gap-2 flex-row"
              >
                <Ionicons name="images-outline" size={24} color="#A79E92" />
                <Text className="text-[14px] font-bold text-warm-600">
                  {images.length === 0 ? 'Upload product photos' : 'Add more photos'}
=======
                className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl py-8 items-center justify-center gap-2 active:bg-gray-100"
              >
                <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                <Text className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  {images.length === 0 ? 'Upload Photos' : 'Add more photos'}
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Basic Details */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
<<<<<<< HEAD
            <View className={sectionClass}>
              <Text className={sectionHeaderClass}>Basic Details</Text>

              <Text className={`${labelClass} mt-0`}>Product Name *</Text>
              <TextInput
                value={name}
                onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: undefined })); }}
                placeholder="e.g. Fresh Organic Tomatoes"
                placeholderTextColor="#A79E92"
                className={`${inputClass} mb-1 ${errors.name ? 'border-red-400 bg-red-50' : ''}`}
              />
              {errors.name ? <Text className="text-[11px] font-bold text-red-600 mb-0">{errors.name}</Text> : null}

              <Text className={labelClass}>Category *</Text>
              <View className="mb-1">
                 <CategoryDropdown
                   value={category}
                   onChange={v => { setCategory(v); setErrors(e => ({ ...e, category: undefined })); }}
                 />
              </View>
              {errors.category ? <Text className="text-[11px] font-bold text-red-600 mb-0">{errors.category}</Text> : null}

              <Text className={labelClass}>Brand Name</Text>
              <TextInput
                value={brandName}
                onChangeText={setBrandName}
                placeholder="Optional"
                placeholderTextColor="#A79E92"
                className={inputClass}
              />

              <Text className={labelClass}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Optional product description"
                placeholderTextColor="#A79E92"
                multiline
                numberOfLines={3}
                className={`bg-warm-50 border border-warm-200 rounded-[18px] px-4 py-[16px] text-[15px] font-semibold text-ruvo-ink min-h-[100px]`}
                style={{ textAlignVertical: 'top' }}
              />
=======
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                  <Ionicons name="cube" size={16} color="#3B82F6" />
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Basic Details</Text>
              </View>

              <InputField label="Product Name *" icon="text-outline" value={name} onChangeText={(t: string) => { setName(t); setErrors(e => ({ ...e, name: undefined })); }} placeholder="e.g. Fresh Organic Tomatoes" errorText={errors.name} />

              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`text-xs font-black uppercase tracking-wider text-gray-500`}>Category *</Text>
                  {errors.category && <Text className="text-[10px] font-bold text-red-500 uppercase">{errors.category}</Text>}
                </View>
                <CategoryDropdown
                  value={category}
                  onChange={v => { setCategory(v); setErrors(e => ({ ...e, category: undefined })); }}
                />
              </View>

              <InputField label="Brand Name" icon="business-outline" value={brandName} onChangeText={setBrandName} placeholder="Optional, e.g. RuVo Farms" />
              <InputField label="Description" icon="document-text-outline" value={description} onChangeText={setDescription} placeholder="About this product..." isMultiline={true} />
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
            </View>
          </Animated.View>

          {/* Pricing */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
<<<<<<< HEAD
            <View className={sectionClass}>
              <Text className={sectionHeaderClass}>Pricing</Text>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className={`${labelClass} mt-0`}>Actual Price (₹) *</Text>
                  <TextInput
                    value={actualPrice}
                    onChangeText={t => { setActualPrice(t); setErrors(e => ({ ...e, actualPrice: undefined })); }}
                    placeholder="0.00"
                    placeholderTextColor="#A79E92"
                    keyboardType="decimal-pad"
                    className={`${inputClass} mb-1 ${errors.actualPrice ? 'border-red-400 bg-red-50' : ''}`}
                  />
                  {errors.actualPrice ? <Text className="text-[11px] font-bold text-red-600 mb-0">{errors.actualPrice}</Text> : null}
                </View>
                <View className="flex-1">
                  <Text className={`${labelClass} mt-0`}>Selling Price (₹) *</Text>
                  <TextInput
                    value={sellingPrice}
                    onChangeText={t => { setSellingPrice(t); setErrors(e => ({ ...e, sellingPrice: undefined })); }}
                    placeholder="0.00"
                    placeholderTextColor="#A79E92"
                    keyboardType="decimal-pad"
                    className={`${inputClass} mb-1 ${errors.sellingPrice ? 'border-red-400 bg-red-50' : ''}`}
                  />
                  {errors.sellingPrice ? <Text className="text-[11px] font-bold text-red-600 mb-0">{errors.sellingPrice}</Text> : null}
=======
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-green-50 border border-green-100 items-center justify-center">
                  <Ionicons name="pricetag" size={14} color="#10B981" />
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Pricing</Text>
              </View>

              <InputField label="Actual Price (₹) *" icon="cash-outline" value={actualPrice} onChangeText={(t: string) => { setActualPrice(t); setErrors(e => ({ ...e, actualPrice: undefined })); }} placeholder="0.00" keyboardType="decimal-pad" errorText={errors.actualPrice} />
              <InputField label="Selling Price (₹) *" icon="cash" value={sellingPrice} onChangeText={(t: string) => { setSellingPrice(t); setErrors(e => ({ ...e, sellingPrice: undefined })); }} placeholder="0.00" keyboardType="decimal-pad" errorText={errors.sellingPrice} />
              
              {discount && (
<<<<<<< HEAD
                <View className="mt-4 bg-ruvo-yellow/20 rounded-[12px] px-3 py-2 flex-row items-center gap-2 border border-ruvo-yellow/30">
                  <Ionicons name="pricetag" size={16} color="#D97706" />
                  <Text className="text-[13px] font-black text-ruvo-yellow-dark">{discount} discount applied</Text>
                </View>
=======
                <Animated.View entering={FadeIn.duration(300)} className="mb-2 bg-green-50 rounded-xl px-4 py-3 border border-green-200 flex-row items-center gap-3">
                  <Ionicons name="sparkles" size={16} color="#16A34A" />
                  <Text className="text-sm font-black text-green-700 tracking-wide">{discount} discount applied!</Text>
                </Animated.View>
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
              )}
            </View>
          </Animated.View>

          {/* Inventory */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)}>
<<<<<<< HEAD
            <View className={sectionClass}>
              <Text className={sectionHeaderClass}>Inventory</Text>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className={`${labelClass} mt-0`}>Stock Quantity *</Text>
                  <TextInput
                    value={stockQuantity}
                    onChangeText={t => { setStockQuantity(t); setErrors(e => ({ ...e, stockQuantity: undefined })); }}
                    placeholder="0"
                    placeholderTextColor="#A79E92"
                    keyboardType="number-pad"
                    className={`${inputClass} mb-1 ${errors.stockQuantity ? 'border-red-400 bg-red-50' : ''}`}
                  />
                  {errors.stockQuantity ? <Text className="text-[11px] font-bold text-red-600 mb-0">{errors.stockQuantity}</Text> : null}
                </View>
                <View className="flex-1">
                  <Text className={`${labelClass} mt-0`}>Unit (optional)</Text>
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="kg, pcs, litre..."
                    placeholderTextColor="#A79E92"
                    className={inputClass}
                  />
=======
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                <View className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 items-center justify-center">
                  <Ionicons name="layers" size={14} color="#9333EA" />
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Inventory</Text>
              </View>

<<<<<<< HEAD
              <View className="flex-row items-center justify-between mt-5 pt-5 border-t border-warm-100">
                <View className="flex-1 mr-3">
                  <Text className="text-[15px] font-black text-ruvo-ink">Available for Sale</Text>
                  <Text className="text-[12px] text-warm-600 font-medium mt-0.5">Customers can buy this product</Text>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{ false: '#E5E7EB', true: '#F5B700' }}
                  thumbColor="#FFF"
=======
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
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
<<<<<<< HEAD
             <TouchableOpacity 
               onPress={handleSubmit} 
               disabled={loading}
               activeOpacity={0.8}
               className={`w-full py-[16px] rounded-[18px] flex-row items-center justify-center shadow-sm mb-4 gap-2 ${loading ? 'bg-warm-200' : 'bg-ruvo-ink'}`}
             >
                <Ionicons name="checkmark-circle" size={20} color={loading ? "#A79E92" : "#FFF"} />
                <Text className={`text-[16px] font-black ${loading ? 'text-warm-500' : 'text-white'}`}>
                  {loading ? 'Adding Product...' : 'Add Product'}
                </Text>
             </TouchableOpacity>
=======
            <TouchableOpacity onPress={handleSubmit} disabled={loading} className="bg-[#FF7A00] rounded-[20px] py-4 items-center justify-center flex-row shadow-lg active:opacity-[0.85]" style={{ shadowColor: '#FF7A00' }}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text className="text-base font-black text-white uppercase tracking-widest">Add Product</Text>
                </>
              )}
            </TouchableOpacity>
>>>>>>> 23f1d36d1772a3c9cf66e69ed0db78d93dbf0ac7
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
