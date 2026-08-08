import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from 'react-native-geolocation-service';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';
import { getShortAddress } from '../../utils/locationUtils';

// ── RuVo design tokens ──────────────────────────────────────
const PRIMARY = '#2E7D32';
const LIGHT_GREEN = '#E8F5E9';
const BG = '#F7F8FA';
const TEXT_DARK = '#1A1A1A';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';

type Service = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  bg: string;
  textColor: string;
};

// Only current, working features — unchanged navigation/routes.
const APP_SERVICES: Service[] = [
  {
    id: 'groceries',
    title: 'Groceries & Accessories',
    subtitle: 'Fresh products from local shops near you',
    icon: '🛒',
    route: ROUTES.GROCERIES,
    bg: LIGHT_GREEN,
    textColor: '#1B5E20',
  },
  {
    id: 'jobs',
    title: 'Local Jobs',
    subtitle: 'Find work opportunities in your area',
    icon: '💼',
    route: ROUTES.JOBS,
    bg: '#E3F2FD',
    textColor: '#0D47A1',
  },
];

const WHY_RUVO = [
  {
    id: 'cod',
    icon: '💵',
    title: 'Cash on Delivery',
    desc: 'Pay when your order arrives.',
  },
  {
    id: 'local',
    icon: '🏪',
    title: 'Shop Local',
    desc: 'Discover and support shops around you.',
  },
  {
    id: 'commission',
    icon: '🎉',
    title: '0% Commission',
    desc: 'Zero commission for shopkeepers during our starting phase.',
    tag: 'STARTING PHASE',
  },
];

const COMING_SOON = [
  
  {
    id: 'jobs-soon',
    icon: '💼',
    title: 'Local Jobs',
    desc: 'Discover job and work opportunities around your area.',
  },
  {
    id: 'upi',
    icon: '📱',
    title: 'UPI Payments',
    desc: 'Pay for your RuVo orders quickly and easily with UPI.',
  },
];

const FETCHING_LABEL = 'Fetching location...';

export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [locationText, setLocationText] = useState(FETCHING_LABEL);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationText('Select Location');
          return;
        }
      }
      Geolocation.getCurrentPosition(
        async position => {
          const shortAddr = await getShortAddress(
            position.coords.latitude,
            position.coords.longitude
          );
          setLocationText(shortAddr ?? 'Location found');
        },
        () => setLocationText('Select Location'),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
      );
    };
    fetchLocation();
  }, []);

  const isFetchingLocation = locationText === FETCHING_LABEL;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />

      {/* ── Header: location + notifications + search ───────── */}
      <View style={styles.headerBg}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.locationRow}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Change delivery location"
          >
            <Ionicons name="location" size={16} color={WHITE} />
            <View style={styles.locationTextBox}>
              <Text style={styles.deliverTo}>Delivering to</Text>
              <View style={styles.locationValueRow}>
                {isFetchingLocation && (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.locationSpinner} />
                )}
                <Text style={styles.locationValue} numberOfLines={1}>
                  {locationText}
                </Text>
                <Ionicons name="chevron-down" size={13} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View
          style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
        >
          <Ionicons name="search" size={18} color={TEXT_SECONDARY} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search products, shops & services"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            accessibilityLabel="Search products, shops & services"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color="#BDBDBD" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.greetRow}>
          <Text style={styles.greetText}>
            Hello, <Text style={styles.greetName}>{firstName} 👋</Text>
          </Text>
          <Text style={styles.greetSub}>What do you need today?</Text>
        </View>

        {/* ── Main Banner ─────────────────────────────────── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Your Local Market,{'\n'}One Tap Away</Text>
            <Text style={styles.heroSub}>
              Shop local. Discover nearby. Get what you need.
            </Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => navigation.navigate(ROUTES.GROCERIES as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Explore nearby shops"
            >
              <Text style={styles.heroBtnText}>Explore Nearby</Text>
              <Ionicons name="arrow-forward" size={14} color={WHITE} />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroEmoji}>🏪</Text>
        </View>

        {/* ── What are you looking for? ───────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What are you looking for?</Text>
        </View>
        <View style={styles.categoryGrid}>
          {APP_SERVICES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryChip}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(cat.route as never)}
              accessibilityRole="button"
              accessibilityLabel={cat.title}
            >
              <View style={[styles.categoryIconWrap, { backgroundColor: cat.bg }]}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>
                {cat.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Our Services ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Services</Text>
        </View>

        <View style={styles.serviceGrid}>
          {APP_SERVICES.map(service => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => navigation.navigate(service.route as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={service.title}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: service.bg }]}>
                <Text style={styles.serviceIcon}>{service.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceTitle} numberOfLines={1}>
                  {service.title}
                </Text>
                <Text style={styles.serviceSub} numberOfLines={2}>
                  {service.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Why RuVo ─────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Why RuVo?</Text>
        </View>
        <View style={styles.whyGrid}>
          {WHY_RUVO.map(item => (
            <View key={item.id} style={styles.whyCard}>
              {item.tag && (
                <View style={styles.whyTag}>
                  <Text style={styles.whyTagText}>{item.tag}</Text>
                </View>
              )}
              <Text style={styles.whyIcon}>{item.icon}</Text>
              <Text style={styles.whyTitle}>{item.title}</Text>
              <Text style={styles.whyDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── Coming Soon ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>More Coming to RuVo</Text>
            <Text style={styles.sectionSub}>RuVo is growing with your neighborhood.</Text>
          </View>
        </View>
        <View style={styles.comingSoonList}>
          {COMING_SOON.map(item => (
            <View key={item.id} style={styles.comingSoonCard}>
              <View style={styles.comingSoonIconWrap}>
                <Text style={styles.comingSoonIcon}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.comingSoonTitleRow}>
                  <Text style={styles.comingSoonTitle}>{item.title}</Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                  </View>
                </View>
                <Text style={styles.comingSoonDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Future Vision Card ──────────────────────────── */}
        <View style={styles.visionCard}>
          <Text style={styles.visionTitle}>More than a marketplace.</Text>
          <Text style={styles.visionDesc}>
            RuVo is being built to connect people with the shops, products, services
            and opportunities around them.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  headerBg: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locationTextBox: { marginLeft: 6, flex: 1 },
  deliverTo: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationSpinner: { marginRight: 2 },
  locationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    maxWidth: 200,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: PRIMARY,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_DARK,
    padding: 0,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  greetRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  greetText: { fontSize: 15, color: TEXT_SECONDARY },
  greetName: { fontWeight: '700', color: TEXT_DARK },
  greetSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  // Hero
  heroBanner: {
    backgroundColor: WHITE,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroContent: { flex: 1 },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_DARK,
    lineHeight: 26,
  },
  heroSub: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  heroBtnText: { fontSize: 13, fontWeight: '700', color: WHITE },
  heroEmoji: { fontSize: 48, marginLeft: 8 },

  // Section header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT_DARK },

  // Categories
  categoryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryIcon: { fontSize: 26 },
  categoryLabel: { fontSize: 12.5, color: TEXT_DARK, fontWeight: '600', textAlign: 'center' },

  // Services list
  serviceGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 4,
  },
  serviceIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceIcon: { fontSize: 26 },
  serviceTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  serviceSub: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 16 },

  sectionSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },

  // Why RuVo
  whyGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  whyCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  whyTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  whyTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: 0.3,
  },
  whyIcon: { fontSize: 24, marginBottom: 8 },
  whyTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  whyDesc: { fontSize: 11.5, color: TEXT_SECONDARY, lineHeight: 16 },

  // Coming soon
  comingSoonList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  comingSoonCard: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    marginBottom: 4,
    opacity: 0.85,
  },
  comingSoonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  comingSoonIcon: { fontSize: 20 },
  comingSoonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 3,
  },
  comingSoonTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  comingSoonBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comingSoonBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.3,
  },
  comingSoonDesc: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 17 },

  // Future vision
  visionCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 14,
    padding: 18,
  },
  visionTitle: { fontSize: 14, fontWeight: '700', color: '#1B5E20', marginBottom: 4 },
  visionDesc: { fontSize: 12.5, color: '#2E4E30', lineHeight: 18 },
});