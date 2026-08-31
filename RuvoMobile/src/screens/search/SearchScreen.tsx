import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { API_BASE_URL } from '../../config/api';
import { sw, sh, sf } from '../../utils/responsive';

export const SearchScreen = () => {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { location } = useDeliveryLocation();
  const navigation = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ products: [], shops: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery);
      }, 500); // Debounce search
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults({ products: [], shops: [] });
      setHasSearched(false);
    }
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        query: query.trim(),
        limit: '20',
      });

      if (location?.latitude && location?.longitude) {
        params.append('latitude', location.latitude.toString());
        params.append('longitude', location.longitude.toString());
      }

      const res = await fetch(`${API_BASE_URL}/api/search?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSearchResults({
          products: data.products || [],
          shops: data.shops || [],
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => (navigation.navigate as any)('ProductDetails', { product: item })}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImagePlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.productCategory, { color: colors.textSecondary }]}>
          {item.category}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.productPrice, { color: colors.primary }]}>
            ₹{item.sellingPrice}
          </Text>
          {item.mrp > item.sellingPrice && (
            <Text style={[styles.productMrp, { color: colors.textSecondary }]}>
              ₹{item.mrp}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderShop = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => (navigation.navigate as any)('ShopDetails', { shopId: item.id })}
    >
      {item.logoUrl ? (
        <Image source={{ uri: item.logoUrl }} style={styles.shopLogo} />
      ) : (
        <View style={[styles.shopLogoPlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="storefront" size={28} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.shopInfo}>
        <Text style={[styles.shopName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.shopCategory, { color: colors.textSecondary }]}>
          {item.category}
        </Text>
        <View style={styles.shopMeta}>
          {item.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFC107" />
              <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          )}
          <Text style={[styles.shopAddress, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Search</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search products, shops..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Searching...
          </Text>
        </View>
      ) : hasSearched ? (
        <FlatList
          data={[]}
          keyExtractor={() => 'dummy'}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {/* Products Section */}
              {searchResults.products.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Products ({searchResults.products.length})
                  </Text>
                  <View style={styles.productsGrid}>
                    {searchResults.products.map((product: any) => (
                      <View key={product.id} style={styles.productWrapper}>
                        {renderProduct({ item: product })}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Shops Section */}
              {searchResults.shops.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Shops ({searchResults.shops.length})
                  </Text>
                  {searchResults.shops.map((shop: any) => (
                    <View key={shop.id}>{renderShop({ item: shop })}</View>
                  ))}
                </View>
              )}

              {/* No Results */}
              {searchResults.products.length === 0 && searchResults.shops.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
                  <Text style={[styles.noResultsText, { color: colors.textPrimary }]}>
                    No results found
                  </Text>
                  <Text style={[styles.noResultsSubtext, { color: colors.textSecondary }]}>
                    Try a different search term
                  </Text>
                </View>
              )}
            </>
          }
        />
      ) : (
        <View style={styles.suggestions}>
          <Ionicons name="bulb-outline" size={48} color={colors.primary} />
          <Text style={[styles.suggestionsTitle, { color: colors.textPrimary }]}>
            Search Tips
          </Text>
          <Text style={[styles.suggestionsText, { color: colors.textSecondary }]}>
            • Search for products by name or category{'\n'}
            • Find shops by name or location{'\n'}
            • Results update as you type
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(16),
    paddingVertical: sh(12),
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: sf(18), fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: sw(16),
    paddingHorizontal: sw(12),
    borderRadius: sw(12),
    gap: sw(8),
  },
  searchInput: { flex: 1, fontSize: sf(16), paddingVertical: sh(10) },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: sh(12), fontSize: sf(14) },
  section: { marginBottom: sh(20) },
  sectionTitle: {
    fontSize: sf(18),
    fontWeight: '700',
    paddingHorizontal: sw(16),
    marginBottom: sh(12),
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: sw(12),
    gap: sw(8),
  },
  productWrapper: { width: '48%' },
  productCard: {
    borderWidth: 1,
    borderRadius: sw(12),
    overflow: 'hidden',
    marginBottom: sh(8),
  },
  productImage: { width: '100%', height: sh(120), resizeMode: 'cover' },
  productImagePlaceholder: {
    width: '100%',
    height: sh(120),
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { padding: sw(10) },
  productName: { fontSize: sf(14), fontWeight: '600', marginBottom: sh(4) },
  productCategory: { fontSize: sf(12), marginBottom: sh(6) },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: sw(6) },
  productPrice: { fontSize: sf(16), fontWeight: '700' },
  productMrp: { fontSize: sf(12), textDecorationLine: 'line-through' },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: sw(16),
    marginBottom: sh(10),
    padding: sw(12),
    borderRadius: sw(12),
    gap: sw(12),
  },
  shopLogo: { width: sw(50), height: sw(50), borderRadius: sw(25) },
  shopLogoPlaceholder: {
    width: sw(50),
    height: sw(50),
    borderRadius: sw(25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopInfo: { flex: 1 },
  shopName: { fontSize: sf(16), fontWeight: '600', marginBottom: sh(2) },
  shopCategory: { fontSize: sf(12), marginBottom: sh(4) },
  shopMeta: { flexDirection: 'row', alignItems: 'center', gap: sw(8) },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: sw(2) },
  ratingText: { fontSize: sf(12), fontWeight: '600' },
  shopAddress: { fontSize: sf(11), flex: 1 },
  noResults: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: sh(80) },
  noResultsText: { fontSize: sf(18), fontWeight: '700', marginTop: sh(16) },
  noResultsSubtext: { fontSize: sf(14), marginTop: sh(8) },
  suggestions: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: sw(32) },
  suggestionsTitle: { fontSize: sf(18), fontWeight: '700', marginTop: sh(16), marginBottom: sh(12) },
  suggestionsText: { fontSize: sf(14), lineHeight: sh(22), textAlign: 'center' },
});
