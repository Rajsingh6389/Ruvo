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
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="px-4 pt-5 pb-10"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Photos */}
          <Animated.View entering={FadeInUp.duration(500)}>
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
                  </TouchableOpacity>
                </View>
              )}

              {images.length > 1 && (
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {images.slice(1).map((img, idx) => (
                    <View key={idx} className="relative w-[72px] h-[72px]">
                      <Image source={{ uri: img.uri }} className="w-full h-full rounded-[14px]" resizeMode="cover" />
                      <TouchableOpacity onPress={() => removeImage(idx + 1)} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full items-center justify-center border-2 border-white">
                        <Ionicons name="close" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                onPress={pickImages}
                activeOpacity={0.7}
                className="bg-warm-50 border border-dashed border-warm-300 rounded-[16px] py-6 items-center justify-center gap-2 flex-row"
              >
                <Ionicons name="images-outline" size={24} color="#A79E92" />
                <Text className="text-[14px] font-bold text-warm-600">
                  {images.length === 0 ? 'Upload product photos' : 'Add more photos'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Basic Details */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
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
            </View>
          </Animated.View>

          {/* Pricing */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
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
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Pricing</Text>
              </View>

              <InputField label="Actual Price (₹) *" icon="cash-outline" value={actualPrice} onChangeText={(t: string) => { setActualPrice(t); setErrors(e => ({ ...e, actualPrice: undefined })); }} placeholder="0.00" keyboardType="decimal-pad" errorText={errors.actualPrice} />
              <InputField label="Selling Price (₹) *" icon="cash" value={sellingPrice} onChangeText={(t: string) => { setSellingPrice(t); setErrors(e => ({ ...e, sellingPrice: undefined })); }} placeholder="0.00" keyboardType="decimal-pad" errorText={errors.sellingPrice} />
              
              {discount && (
                <View className="mt-4 bg-ruvo-yellow/20 rounded-[12px] px-3 py-2 flex-row items-center gap-2 border border-ruvo-yellow/30">
                  <Ionicons name="pricetag" size={16} color="#D97706" />
                  <Text className="text-[13px] font-black text-ruvo-yellow-dark">{discount} discount applied</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Inventory */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)}>
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
                </View>
                <Text className="text-sm font-black text-gray-900 uppercase tracking-widest">Inventory</Text>
              </View>

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
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
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
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

