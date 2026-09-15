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
import { uploadProduct, addProduct } from '../../services/productService';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL } from '../../config/api';

const MAX_IMAGES = 8;

interface ProductImage { uri: string; type: string; fileName: string; }
interface FormErrors {
  name?: string; category?: string; actualPrice?: string;
  sellingPrice?: string; stockQuantity?: string;
}

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

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center gap-4 shadow-sm z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-gray-50 rounded-full border border-gray-100 items-center justify-center active:opacity-70">
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-black text-gray-900 tracking-tight">Add New Product</Text>
          <Text className="text-[11px] text-[#FF7A00] font-black uppercase tracking-widest mt-0.5">Grow Your Catalog</Text>
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 250 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Photos */}
          <Animated.View entering={FadeInUp.duration(500)}>
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
                  </TouchableOpacity>
                </View>
              )}

              {images.length > 1 && (
                <View className="flex-row flex-wrap gap-3 mb-4">
                  {images.slice(1).map((img, idx) => (
                    <View key={idx} className="relative w-[72px] h-[72px]">
                      <Image source={{ uri: img.uri }} className="w-[72px] h-[72px] rounded-xl border border-gray-200" resizeMode="cover" />
                      <TouchableOpacity onPress={() => removeImage(idx + 1)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center shadow-md active:scale-95 border-2 border-white">
                        <Ionicons name="close" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                onPress={pickImages}
                className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl py-8 items-center justify-center gap-2 active:bg-gray-100"
              >
                <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                <Text className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  {images.length === 0 ? 'Upload Photos' : 'Add more photos'}
                </Text>
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
                  <Text className="text-base font-black text-white uppercase tracking-widest">Add Product</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
