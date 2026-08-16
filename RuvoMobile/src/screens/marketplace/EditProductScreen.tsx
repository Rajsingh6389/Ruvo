import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { CategoryDropdown } from '../../components/CategoryDropdown';
import { updateProduct, updateProductWithImage } from '../../services/productService';
import type { Product } from '../../services/productService';

const PRIMARY = '#2E7D32';
const PRIMARY_LIGHT = '#E8F5E9';
const BG = '#F7F8FA';
const TEXT = '#1A1A1A';
const SUBTEXT = '#6B7280';
const BORDER = '#E0E0E0';
const ERROR = '#E53935';
const CARD = '#FFFFFF';

interface FormErrors {
  name?: string;
  category?: string;
  actualPrice?: string;
  sellingPrice?: string;
  stockQuantity?: string;
}

export const EditProductScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { token } = useAuth();
  const product: Product = route.params?.product;

  // ── Form State (pre-filled) ──
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [brandName, setBrandName] = useState(product?.brandName ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [actualPrice, setActualPrice] = useState(product?.actualPrice?.toString() ?? '');
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice?.toString() ?? '');
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity?.toString() ?? '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);

  // Image state
  const [imageUri, setImageUri] = useState<string | null>(null); // null = no new image
  const [existingImageUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [imageType, setImageType] = useState('image/jpeg');
  const [imageName, setImageName] = useState('product.jpg');

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // ── Auto-calculated discount ──
  const computedDiscount = useCallback((): string | null => {
    const ap = parseFloat(actualPrice);
    const sp = parseFloat(sellingPrice);
    if (!isNaN(ap) && !isNaN(sp) && ap > 0 && sp >= 0 && sp <= ap) {
      const disc = ((ap - sp) / ap) * 100;
      return disc === 0 ? null : `${Math.round(disc * 100) / 100}% OFF`;
    }
    return null;
  }, [actualPrice, sellingPrice]);

  // ── Image Picker ──
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri ?? null);
        setImageType(asset.mimeType ?? 'image/jpeg');
        setImageName(asset.fileName ?? 'product.jpg');
      }
    } catch (e) {
      console.warn('Image pick cancelled or failed', e);
    }
  };

  // ── Validation ──
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!category) newErrors.category = 'Category is required';
    const ap = parseFloat(actualPrice);
    const sp = parseFloat(sellingPrice);
    if (!actualPrice.trim() || isNaN(ap) || ap <= 0) {
      newErrors.actualPrice = 'Enter a valid actual price';
    }
    if (!sellingPrice.trim() || isNaN(sp) || sp < 0) {
      newErrors.sellingPrice = 'Enter a valid selling price';
    } else if (ap && sp > ap) {
      newErrors.sellingPrice = 'Selling price cannot be greater than actual price';
    }
    const sq = parseInt(stockQuantity, 10);
    if (!stockQuantity.trim() || isNaN(sq) || sq < 0) {
      newErrors.stockQuantity = 'Enter a valid stock quantity (0 or more)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validate()) return;
    if (!token || product?.id == null) {
      Alert.alert('Error', 'Something went wrong');
      return;
    }

    setLoading(true);
    try {
      const ap = parseFloat(actualPrice);
      const sp = parseFloat(sellingPrice);
      const sq = parseInt(stockQuantity, 10);
      const disc = ap > 0 ? Math.round(((ap - sp) / ap) * 100 * 100) / 100 : 0;

      if (imageUri) {
        // New image selected — use multipart
        const formData = new FormData();
        const productData = JSON.stringify({
          name: name.trim(),
          category,
          brandName: brandName.trim() || null,
          description: description.trim() || null,
          actualPrice: ap,
          sellingPrice: sp,
          discount: disc,
          stockQuantity: sq,
          unit: unit.trim() || null,
          isAvailable,
        });
        formData.append('product', productData);
        (formData as any).append('image', {
          uri: imageUri,
          type: imageType,
          name: imageName,
        });
        await updateProductWithImage(product.id!, formData, token);
      } else {
        // No new image — JSON update
        await updateProduct(
          product.id!,
          {
            name: name.trim(),
            category,
            brandName: brandName.trim() || undefined,
            description: description.trim() || undefined,
            actualPrice: ap,
            sellingPrice: sp,
            discount: disc,
            stockQuantity: sq,
            unit: unit.trim() || undefined,
            isAvailable,
          },
          token,
        );
      }

      Alert.alert('Success', 'Product updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const discount = computedDiscount();
  const spNum = parseFloat(sellingPrice);
  const apNum = parseFloat(actualPrice);
  const priceError =
    !isNaN(spNum) && !isNaN(apNum) && spNum > apNum
      ? 'Selling price cannot be greater than actual price'
      : null;

  const displayImageUri = imageUri ?? existingImageUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── PRODUCT IMAGE ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>PRODUCT IMAGE</Text>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {displayImageUri ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: displayImageUri }} style={styles.imagePreview} />
                  <View style={styles.changeOverlay}>
                    <Ionicons name="camera" size={20} color="#FFF" />
                    <Text style={styles.changeText}>Change Photo</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={36} color={SUBTEXT} />
                  <Text style={styles.imagePlaceholderText}>Add Product Photo</Text>
                  <Text style={styles.imagePlaceholderSub}>Tap to select from gallery</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── BASIC INFORMATION ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>

            <Text style={styles.fieldLabel}>
              Product Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              placeholder="e.g. Aashirvaad Atta"
              placeholderTextColor={SUBTEXT}
              value={name}
              onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: undefined })); }}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

            <CategoryDropdown
              value={category}
              onChange={c => { setCategory(c); setErrors(e => ({ ...e, category: undefined })); }}
              error={errors.category}
              required
            />

            <Text style={styles.fieldLabel}>Brand Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Aashirvaad (optional)"
              placeholderTextColor={SUBTEXT}
              value={brandName}
              onChangeText={setBrandName}
            />
          </View>

          {/* ── PRICING ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>PRICING</Text>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>
                  Actual Price / MRP <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.priceInput, errors.actualPrice ? styles.inputError : null]}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    placeholder="0.00"
                    placeholderTextColor={SUBTEXT}
                    keyboardType="decimal-pad"
                    value={actualPrice}
                    onChangeText={t => {
                      setActualPrice(t);
                      setErrors(e => ({ ...e, actualPrice: undefined, sellingPrice: undefined }));
                    }}
                  />
                </View>
                {errors.actualPrice ? <Text style={styles.errorText}>{errors.actualPrice}</Text> : null}
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fieldLabel}>
                  Selling Price <Text style={styles.required}>*</Text>
                </Text>
                <View
                  style={[styles.priceInput, (errors.sellingPrice || priceError) ? styles.inputError : null]}
                >
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    placeholder="0.00"
                    placeholderTextColor={SUBTEXT}
                    keyboardType="decimal-pad"
                    value={sellingPrice}
                    onChangeText={t => {
                      setSellingPrice(t);
                      setErrors(e => ({ ...e, sellingPrice: undefined }));
                    }}
                  />
                </View>
                {errors.sellingPrice ? <Text style={styles.errorText}>{errors.sellingPrice}</Text> : null}
              </View>
            </View>

            {priceError && !errors.sellingPrice ? (
              <Text style={[styles.errorText, { marginTop: 4 }]}>{priceError}</Text>
            ) : null}

            {discount ? (
              <View style={styles.discountBadge}>
                <Ionicons name="pricetag" size={14} color={PRIMARY} />
                <Text style={styles.discountText}>{discount}</Text>
                <Text style={styles.discountNote}>auto-calculated</Text>
              </View>
            ) : null}
          </View>

          {/* ── INVENTORY ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>INVENTORY</Text>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>
                  Stock Quantity <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.stockQuantity ? styles.inputError : null]}
                  placeholder="0"
                  placeholderTextColor={SUBTEXT}
                  keyboardType="number-pad"
                  value={stockQuantity}
                  onChangeText={t => {
                    setStockQuantity(t);
                    setErrors(e => ({ ...e, stockQuantity: undefined }));
                  }}
                />
                {errors.stockQuantity ? (
                  <Text style={styles.errorText}>{errors.stockQuantity}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. kg, piece, litre"
                  placeholderTextColor={SUBTEXT}
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>
          </View>

          {/* ── DESCRIPTION ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Product description (max 500 characters)..."
              placeholderTextColor={SUBTEXT}
              multiline
              numberOfLines={4}
              maxLength={500}
              value={description}
              onChangeText={setDescription}
            />
            <Text style={styles.charCounter}>{description.length}/500</Text>
          </View>

          {/* ── AVAILABILITY ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>AVAILABILITY</Text>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Product Availability</Text>
                <Text style={styles.toggleSub}>
                  {isAvailable
                    ? '🟢 Customers can order this product'
                    : '🔴 Product is unavailable for ordering'}
                </Text>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={setIsAvailable}
                trackColor={{ false: '#E0E0E0', true: PRIMARY_LIGHT }}
                thumbColor={isAvailable ? PRIMARY : '#BDBDBD'}
              />
            </View>
          </View>

          {/* ── SUBMIT ── */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFF" />
                <Text style={styles.submitBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT },

  scrollContent: { padding: 16, paddingBottom: 40, backgroundColor: BG },

  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: SUBTEXT,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14,
  },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  required: { color: ERROR },

  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
    marginBottom: 14,
  },
  inputError: { borderColor: ERROR },
  errorText: { fontSize: 12, color: ERROR, marginTop: -10, marginBottom: 10, marginLeft: 2 },

  row: { flexDirection: 'row' },

  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  currencySymbol: { fontSize: 16, fontWeight: '700', color: TEXT, marginRight: 4 },
  priceTextInput: { flex: 1, fontSize: 15, color: TEXT, paddingVertical: 12 },

  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  discountText: { fontSize: 15, fontWeight: '800', color: PRIMARY },
  discountNote: { fontSize: 11, color: SUBTEXT, fontStyle: 'italic' },

  textArea: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: TEXT,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCounter: { fontSize: 11, color: SUBTEXT, textAlign: 'right', marginTop: 4 },

  imagePicker: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: BORDER, borderStyle: 'dashed',
  },
  imagePlaceholder: { alignItems: 'center', paddingVertical: 32, backgroundColor: BG },
  imagePlaceholderText: { fontSize: 15, fontWeight: '600', color: TEXT, marginTop: 10 },
  imagePlaceholderSub: { fontSize: 12, color: SUBTEXT, marginTop: 3 },
  imagePreviewWrapper: { position: 'relative' },
  imagePreview: { width: '100%', height: 200 },
  changeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 10,
  },
  changeText: { color: '#FFF', fontWeight: '600', fontSize: 13 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 3 },
  toggleSub: { fontSize: 12, color: SUBTEXT },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 16,
    marginTop: 4, elevation: 3, shadowColor: PRIMARY,
    shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
});
