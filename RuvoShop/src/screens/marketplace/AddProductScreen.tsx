import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { CategoryDropdown } from '../../components/CategoryDropdown';
import { uploadProduct, addProduct } from '../../services/productService';

const PRIMARY = '#2E7D32';
const PRIMARY_LIGHT = '#E8F5E9';
const BG = '#F8F1E7'; // warm ivory canvas
const TEXT = '#1A1A1A';
const SUBTEXT = '#6B7280';
const BORDER = '#E0E0E0';
const ERROR = '#E53935';
const CARD = '#FFFFFF';
const WHITE = '#FFFFFF';

const MAX_IMAGES = 8;

interface ProductImage {
  uri: string;
  type: string;
  fileName: string;
}

interface FormErrors {
  name?: string;
  category?: string;
  actualPrice?: string;
  sellingPrice?: string;
  stockQuantity?: string;
}

export const AddProductScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { token } = useAuth();
  const shopId: number = route.params?.shopId;

  // ── Form State ──
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [actualPrice, setActualPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // ── Multi-image State ──
  // images[0] is treated as the primary/cover image (sent as "image")
  // images[1..n] are sent as "images" gallery fields
  const [images, setImages] = useState<ProductImage[]>([]);

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
    } catch (e) {
      Alert.alert('Image error', 'Could not select images.');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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

    if (!token) {
      Alert.alert('Error', 'You are not logged in');
      return;
    }

    setLoading(true);

    try {
      const ap = parseFloat(actualPrice);
      const sp = parseFloat(sellingPrice);
      const sq = parseInt(stockQuantity, 10);
      const disc = ap > 0 ? Math.round(((ap - sp) / ap) * 100 * 100) / 100 : 0;

      if (images.length > 0) {
        const formData = new FormData();

        const productData = JSON.stringify({
          shopId,
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

        // First image → primary "image" field
        formData.append('image', {
          uri: images[0].uri,
          type: images[0].type,
          name: images[0].fileName,
        } as any);

        // Remaining images → "images" gallery array
        for (let i = 1; i < images.length; i++) {
          formData.append('images', {
            uri: images[i].uri,
            type: images[i].type,
            name: images[i].fileName,
          } as any);
        }

        await uploadProduct(formData, token);
      } else {
        await addProduct(
          {
            shopId,
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

      Alert.alert('Success', 'Product added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add product');
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
        <Text style={styles.headerTitle}>Add Product</Text>
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
          {/* ── PRODUCT PHOTOS ── */}
          <View style={styles.sectionCard}>
            <View style={styles.photoSectionHeader}>
              <Text style={styles.sectionLabel}>PRODUCT PHOTOS</Text>
              <Text style={styles.photoCount}>{images.length}/{MAX_IMAGES}</Text>
            </View>

            {/* Primary image large preview */}
            {images.length > 0 ? (
              <View style={styles.primaryImageWrapper}>
                <Image source={{ uri: images[0].uri }} style={styles.primaryImage} />
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Cover photo</Text>
                </View>
                <TouchableOpacity
                  style={styles.primaryRemoveBtn}
                  onPress={() => removeImage(0)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Ionicons name="close-circle" size={22} color={ERROR} />
                </TouchableOpacity>
              </View>
            ) : (
              // Empty state placeholder — tapping opens picker
              <TouchableOpacity
                style={styles.imagePlaceholder}
                onPress={pickImages}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={36} color={SUBTEXT} />
                <Text style={styles.imagePlaceholderText}>Add Product Photos</Text>
                <Text style={styles.imagePlaceholderSub}>
                  Select up to {MAX_IMAGES} photos · First photo is the cover
                </Text>
              </TouchableOpacity>
            )}

            {/* Thumbnail strip + add tile */}
            {images.length > 0 && (
              <View style={styles.thumbStrip}>
                {images.map((img, index) => (
                  <View key={`${img.uri}-${index}`} style={styles.thumbWrapper}>
                    <Image source={{ uri: img.uri }} style={styles.thumb} />
                    {index === 0 && (
                      <View style={styles.thumbCoverDot} />
                    )}
                    <TouchableOpacity
                      style={styles.thumbRemoveBtn}
                      onPress={() => removeImage(index)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Ionicons name="close-circle" size={18} color={ERROR} />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < MAX_IMAGES && (
                  <TouchableOpacity
                    style={styles.thumbAddBtn}
                    onPress={pickImages}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={22} color={PRIMARY} />
                    <Text style={styles.thumbAddText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {images.length > 0 && (
              <Text style={styles.photoHint}>
                Tap a photo's ✕ to remove it · First photo is shown as the cover
              </Text>
            )}
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
                {errors.actualPrice ? (
                  <Text style={styles.errorText}>{errors.actualPrice}</Text>
                ) : null}
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fieldLabel}>
                  Selling Price <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.priceInput, (errors.sellingPrice || priceError) ? styles.inputError : null]}>
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
                {errors.sellingPrice ? (
                  <Text style={styles.errorText}>{errors.sellingPrice}</Text>
                ) : null}
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
                  {isAvailable ? '🟢 Customers can order this product' : '🔴 Product is unavailable for ordering'}
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
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                <Text style={styles.submitBtnText}>Add Product</Text>
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
    fontSize: 11,
    fontWeight: '700',
    color: SUBTEXT,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // ── Photo section ──
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  photoCount: {
    fontSize: 11,
    fontWeight: '700',
    color: SUBTEXT,
  },

  imagePlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: { fontSize: 15, fontWeight: '600', color: TEXT, marginTop: 10 },
  imagePlaceholderSub: { fontSize: 12, color: SUBTEXT, marginTop: 3, textAlign: 'center', paddingHorizontal: 16 },

  primaryImageWrapper: {
    borderRadius: 14,
    overflow: 'visible',
    marginBottom: 12,
    position: 'relative',
  },
  primaryImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  primaryBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '700',
  },
  primaryRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: WHITE,
    borderRadius: 11,
  },

  thumbStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbWrapper: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'visible',
    position: 'relative',
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
  },
  thumbCoverDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  thumbRemoveBtn: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: WHITE,
    borderRadius: 9,
  },
  thumbAddBtn: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderStyle: 'dashed',
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbAddText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY,
    marginTop: 1,
  },
  photoHint: {
    fontSize: 11,
    color: SUBTEXT,
    marginTop: 10,
    textAlign: 'center',
  },

  // ── Form fields ──
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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 3 },
  toggleSub: { fontSize: 12, color: SUBTEXT },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
    elevation: 3,
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
});
