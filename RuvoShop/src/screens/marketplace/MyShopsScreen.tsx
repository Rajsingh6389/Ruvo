import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyShops, Shop } from '../../services/shopService';
import { API_BASE_URL } from '../../config/api';
import { ROUTES } from '../../constants/routes';
import { sw, sh, sf } from '../../utils/responsive';

export const MyShopsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, userId, token } = useAuth();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShops = async (isRefresh = false) => {
    const ownerId = userId || user?.id;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    if (ownerId && token) {
      try {
        setShops(await getMyShops(String(ownerId), token));
      } catch (err: any) {
        setError(err.message || 'Failed to load your shops');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    } else {
      setError('User not authenticated properly (id or token missing)');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, [userId, user, token]);

  /* -------------------------------------------------------
     LOADING
  ------------------------------------------------------- */

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.loadingIcon,
            { backgroundColor: colors.primary },
          ]}
        >
          <Ionicons
            name="storefront"
            size={30}
            color="#FFFFFF"
          />
        </View>

        <Text
          style={[
            styles.loadingTitle,
            { color: colors.textPrimary },
          ]}
        >
          Loading your shops
        </Text>

        <Text
          style={[
            styles.loadingSubtitle,
            { color: colors.textSecondary },
          ]}
        >
          Please wait...
        </Text>

        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  /* -------------------------------------------------------
     SHOP CARD
  ------------------------------------------------------- */

  const renderShop = ({ item }: { item: Shop }) => {
    /*
      Safely read optional fields.
      This keeps the screen compatible even if your current
      Shop interface doesn't contain every detail yet.
    */
    const shopData = item as Shop & {
      category?: string;
      address?: string;
      phone?: string;
      mobile?: string;
      contactNumber?: string;
      description?: string;
    };

    const category = shopData.category;
    const address = shopData.address;

    const phone =
      shopData.phone ||
      shopData.mobile ||
      shopData.contactNumber;

    const approved = Boolean(item.approved);

    return (
      <View
        style={[
          styles.shopCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* LEFT GREEN ACCENT */}

        <View
          style={[
            styles.shopAccent,
            {
              backgroundColor: approved
                ? colors.primary
                : '#F59E0B',
            },
          ]}
        />

        {/* ------------------------------------------------
            SHOP HEADER
        ------------------------------------------------ */}

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() =>
            navigation.navigate(
              ROUTES.SHOP_DETAILS,
              { shopId: item.id },
            )
          }
        >
          <View style={styles.shopHeader}>
            {/* Shop Icon */}

            {(() => {
              const logoUri = item.logoUrl || item.imageUrl || item.bannerUrl;
              const formattedUri = logoUri ? (logoUri.startsWith('http') ? logoUri : `${API_BASE_URL}${logoUri.startsWith('/') ? '' : '/'}${logoUri}`) : null;

              return formattedUri ? (
                <Image source={{ uri: formattedUri }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
              ) : (
                <View
                  style={[
                    styles.shopIcon,
                    {
                      backgroundColor: approved
                        ? '#E8F5E9'
                        : '#FFF7E6',
                    },
                  ]}
                >
                  <Ionicons
                    name="storefront"
                    size={28}
                    color={
                      approved
                        ? colors.primary
                        : '#F59E0B'
                    }
                  />
                </View>
              );
            })()}

            {/* Main Shop Information */}

            <View style={styles.shopMainInfo}>
              <Text
                style={[
                  styles.shopName,
                  { color: colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {category ? (
                <Text
                  style={[
                    styles.shopCategory,
                    { color: colors.primary },
                  ]}
                  numberOfLines={1}
                >
                  {category}
                </Text>
              ) : null}

              {/* Status */}

              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: approved
                        ? '#E8F5E9'
                        : '#FFF7E6',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: approved
                          ? colors.primary
                          : '#F59E0B',
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: approved
                          ? colors.primary
                          : '#D97706',
                      },
                    ]}
                  >
                    {approved
                      ? 'Approved'
                      : 'Pending Approval'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Open Shop */}

            <View
              style={[
                styles.shopArrow,
                {
                  backgroundColor: '#F1F8F2',
                },
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={19}
                color={colors.primary}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* ------------------------------------------------
            SHOP DETAILS
        ------------------------------------------------ */}

        <View
          style={[
            styles.detailsContainer,
            { borderTopColor: colors.border },
          ]}
        >
          {/* Address */}

          {address ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="location-outline"
                  size={15}
                  color={colors.primary}
                />
              </View>

              <Text
                style={[
                  styles.detailText,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {address}
              </Text>
            </View>
          ) : null}

          {/* Phone */}

          {phone ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="call-outline"
                  size={15}
                  color={colors.primary}
                />
              </View>

              <Text
                style={[
                  styles.detailText,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {phone}
              </Text>
            </View>
          ) : null}

          {/* Shop ID */}

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="pricetag-outline"
                size={15}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.detailText,
                { color: colors.textSecondary },
              ]}
            >
              Shop ID: #{item.id}
            </Text>
          </View>
        </View>

        {/* ------------------------------------------------
            MANAGEMENT SECTION
        ------------------------------------------------ */}

        <View style={styles.managementRow}>
          <View
            style={[
              styles.managementIcon,
              { backgroundColor: '#E8F5E9' },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={18}
              color={colors.primary}
            />
          </View>

          <View style={styles.managementText}>
            <Text
              style={[
                styles.managementTitle,
                { color: colors.textPrimary },
              ]}
            >
              Manage your products
            </Text>

            <Text
              style={[
                styles.managementSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Add, edit and manage products
            </Text>
          </View>
        </View>

        {/* ------------------------------------------------
            ACTION BUTTONS
        ------------------------------------------------ */}

        <View style={styles.actionRow}>
          {/* MY PRODUCTS */}

          <TouchableOpacity
            activeOpacity={0.78}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() =>
              navigation.navigate(
                ROUTES.MY_PRODUCTS,
                {
                  shopId: item.id,
                },
              )
            }
          >
            <Ionicons
              name="cube-outline"
              size={17}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              My Products
            </Text>
          </TouchableOpacity>

          {/* SHOP ORDERS (NEW) */}
          <TouchableOpacity
            activeOpacity={0.78}
            style={[
              styles.secondaryButton,
              {
                borderColor: '#10B981',
                backgroundColor: '#ECFDF5',
                marginLeft: 10,
              },
            ]}
            onPress={() =>
              navigation.navigate(
                ROUTES.SHOPKEEPER_DASHBOARD,
                {
                  shopId: item.id,
                  shopName: item.name,
                },
              )
            }
          >
            <Ionicons
              name="receipt-outline"
              size={18}
              color="#059669"
            />
            <Text
              style={[
                styles.secondaryButtonText,
                { color: '#059669', fontSize: 13 },
              ]}
            >
              DashBoard
            </Text>
          </TouchableOpacity>

          {/* ADD PRODUCT */}

          <TouchableOpacity
            activeOpacity={0.78}
            style={[
              styles.secondaryButton,
              {
                borderColor: colors.primary,
                backgroundColor: '#FFFFFF',
                marginLeft: 10,
              },
            ]}
            onPress={() =>
              navigation.navigate(
                ROUTES.ADD_PRODUCT,
                {
                  shopId: item.id,
                },
              )
            }
          >
            <Ionicons
              name="add"
              size={19}
              color={colors.primary}
            />

            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.primary, fontSize: 13 },
              ]}
            >
              Add
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            backgroundColor: '#8B5CF6',
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            borderRadius: 8,
            gap: 8,
          }}
          onPress={() =>
            navigation.navigate(
              ROUTES.SHOP_ORDERS,
              {
                shopId: item.id,
                shopName: item.name,
              },
            )
          }
        >
          <Ionicons
            name="receipt-outline"
            size={18}
            color="#FFFFFF"
          />
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
            Manage Shop Orders
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  /* -------------------------------------------------------
     EMPTY STATE
  ------------------------------------------------------- */

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: '#E8F5E9' },
        ]}
      >
        <Ionicons
          name="storefront-outline"
          size={44}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.emptyTitle,
          { color: colors.textPrimary },
        ]}
      >
        No shops yet
      </Text>

      <Text
        style={[
          styles.emptySubtitle,
          { color: colors.textSecondary },
        ]}
      >
        Register your local shop on RuVo and start
        managing your products.
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.registerButton,
          { backgroundColor: colors.primary },
        ]}
        onPress={() =>
          navigation.navigate(
            ROUTES.REGISTER_SHOP,
          )
        }
      >
        <Ionicons
          name="storefront-outline"
          size={19}
          color="#FFFFFF"
        />

        <Text style={styles.registerButtonText}>
          Register a Shop
        </Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );

  /* -------------------------------------------------------
     MAIN SCREEN
  ------------------------------------------------------- */

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <FlatList
        data={shops}
        keyExtractor={item =>
          item.id?.toString() ??
          Math.random().toString()
        }
        renderItem={renderShop}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadShops(true)} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* HEADER */}

            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text
                  style={[
                    styles.title,
                    { color: colors.textPrimary },
                  ]}
                >
                  My Shops
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Manage your RuVo shops and products
                </Text>
              </View>

              {/* SHOP COUNT */}

              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: '#E8F5E9',
                  },
                ]}
              >
                <Ionicons
                  name="storefront-outline"
                  size={15}
                  color={colors.primary}
                />

                <Text
                  style={[
                    styles.countText,
                    { color: colors.primary },
                  ]}
                >
                  {shops.length}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => loadShops(true)}
                style={[styles.refreshButton, { borderColor: colors.primary }]}
                disabled={refreshing}
              >
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={[styles.refreshButtonText, { color: colors.primary }]}>{refreshing ? 'Refreshing' : 'Refresh'}</Text>
              </TouchableOpacity>
            </View>

            {/* ERROR */}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#DC2626"
                />

                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* INFO CARD */}

            {shops.length > 0 ? (
              <View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: '#F1F8F2',
                    borderColor: '#D5EAD7',
                  },
                ]}
              >
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: '#E8F5E9' },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text
                    style={[
                      styles.infoTitle,
                      { color: colors.primary },
                    ]}
                  >
                    Your shop dashboard
                  </Text>

                  <Text
                    style={[
                      styles.infoText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Manage your products and keep your
                    local store updated.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* SECTION */}

            {shops.length > 0 ? (
              <View style={styles.sectionHeader}>
                <View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Your Shops
                  </Text>

                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Select a shop to manage it
                  </Text>
                </View>

                <Text
                  style={[
                    styles.shopCountText,
                    { color: colors.primary },
                  ]}
                >
                  {shops.length}{' '}
                  {shops.length === 1
                    ? 'Shop'
                    : 'Shops'}
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* SCREEN */

  container: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 15,
    paddingTop: 48,
    paddingBottom: 35,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  headerText: {
    flex: 1,
    paddingRight: 10,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  countBadge: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  countText: {
    fontSize: 14,
    fontWeight: '800',
  },
  refreshButton: {
    height: 36,
    marginLeft: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  refreshButtonText: { fontSize: 12, fontWeight: '700' },

  /* INFO CARD */

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
  },

  infoText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
  },

  sectionSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },

  shopCountText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* SHOP CARD */

  shopCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 15,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  shopAccent: {
    position: 'absolute',
    left: 0,
    top: 15,
    bottom: 15,
    width: 3,
    borderRadius: 4,
  },

  /* SHOP HEADER */

  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 3,
  },

  shopIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  shopMainInfo: {
    flex: 1,
    minWidth: 0,
  },

  shopName: {
    fontSize: 18,
    fontWeight: '800',
  },

  shopCategory: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  statusRow: {
    flexDirection: 'row',
    marginTop: 7,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  shopArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  /* DETAILS */

  detailsContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  detailIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },

  /* MANAGEMENT */

  managementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },

  managementIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  managementText: {
    flex: 1,
  },

  managementTitle: {
    fontSize: 12,
    fontWeight: '800',
  },

  managementSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },

  /* BUTTONS */

  actionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },

  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  secondaryButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* ERROR */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 13,
    backgroundColor: '#FEF2F2',
    marginBottom: 15,
    gap: 8,
  },

  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 11,
    lineHeight: 16,
  },

  /* EMPTY */

  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 45,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
  },

  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 290,
  },

  registerButton: {
    marginTop: 20,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 16,
  },

  loadingSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default MyShopsScreen;
