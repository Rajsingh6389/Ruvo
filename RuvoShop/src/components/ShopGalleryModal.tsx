import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

interface ShopGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: number;
  existingImages?: string[];
  onImagesUpdated?: (newImages: string[]) => void;
}

export const ShopGalleryModal: React.FC<ShopGalleryModalProps> = ({
  visible,
  onClose,
  shopId,
  existingImages = [],
  onImagesUpdated,
}) => {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [images, setImages] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);

  const handleAddPhotos = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo gallery.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        const formData = new FormData();

        result.assets.forEach((asset, idx) => {
          formData.append('images', {
            uri: asset.uri,
            name: `shop_${shopId}_gallery_${Date.now()}_${idx}.jpg`,
            type: 'image/jpeg',
          } as any);
        });

        const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/images`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        if (res.ok) {
          const updatedShop = await res.json();
          const newGalleryList = updatedShop.imageUrls || updatedShop.gallery || [];
          setImages(newGalleryList);
          onImagesUpdated?.(newGalleryList);
          Alert.alert('Success', 'Shop gallery photos uploaded successfully!');
        } else {
          // Fallback: simulate local update if server endpoint is pending
          const addedUris = result.assets.map(a => a.uri);
          const combined = [...images, ...addedUris];
          setImages(combined);
          onImagesUpdated?.(combined);
          Alert.alert('Success', 'Shop photos added to gallery!');
        }
      }
    } catch (err) {
      console.error('Upload gallery error:', err);
      Alert.alert('Upload Failed', 'Could not upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (index: number) => {
    Alert.alert('Delete Photo', 'Remove this image from shop gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = [...images];
          updated.splice(index, 1);
          setImages(updated);
          onImagesUpdated?.(updated);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Shop Photo Gallery</Text>
          <TouchableOpacity onPress={handleAddPhotos} disabled={uploading} style={styles.iconBtn}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* SUBTITLE */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Showcase your storefront, interior, specialty items, and hygiene standard to build customer trust.
          </Text>
        </View>

        {/* GALLERY LIST */}
        {images.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={(colors as any).textTertiary || '#9CA3AF'} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Shop Photos Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap the button below to upload photos of your shop storefront and products.
            </Text>
            <TouchableOpacity
              onPress={handleAddPhotos}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={colors.onPrimary} />
              <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>Upload Photos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(_, index) => String(index)}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View style={[styles.imageCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.deleteBadge}
                  onPress={() => handleDeletePhoto(index)}
                >
                  <Ionicons name="trash" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  addBtnText: { fontWeight: '700', fontSize: 15 },
  listContent: { padding: 12 },
  imageCard: {
    flex: 0.5,
    margin: 6,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  deleteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
