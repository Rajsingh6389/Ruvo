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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from 'react-native-geolocation-service';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';
import { getShortAddress } from '../../utils/locationUtils';

const PRIMARY = '#2E7D32';
const ORANGE = '#FF6B00';

type Service = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  bg: string;
  textColor: string;
};

const APP_SERVICES: Service[] = [
  {
    id: 'groceries',
    title: 'Groceries & Accessories',
    subtitle: 'Fresh products from local shops near you',
    icon: '🛒',
    route: ROUTES.GROCERIES,
    bg: '#E8F5E9',
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

export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [locationText, setLocationText] = useState('Fetching location...');
  const [searchText, setSearchText] = useState('');

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

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />

      {/* ── Green Header ─────────────────────────── */}
      <View style={styles.headerBg}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.locationRow}>
            <Ionicons name="location" size={18} color={ORANGE} />
            <View style={styles.locationTextBox}>
              <Text style={styles.deliverTo}>Deliver to</Text>
              <View style={styles.locationValueRow}>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {locationText}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9E9E9E" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search for services or shops..."
            placeholderTextColor="#9E9E9E"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* Greeting */}
        <View style={styles.greetRow}>
          <Text style={styles.greetText}>
            Hello,{' '}
            <Text style={styles.greetName}>
              {user?.name?.split(' ')[0] ?? 'there'} 👋
            </Text>
          </Text>
          <Text style={styles.greetSub}>What do you need today?</Text>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTag}>🌿 Support Local</Text>
            <Text style={styles.heroTitle}>{'Support Local.\nShop Local.'}</Text>
            <Text style={styles.heroSub}>{'Choose local shops,\nGrow together.'}</Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => navigation.navigate(ROUTES.GROCERIES as never)}
            >
              <Text style={styles.heroBtnText}>Explore Now</Text>
              <Ionicons name="arrow-forward" size={14} color={PRIMARY} />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroEmoji}>🏪</Text>
        </View>

        {/* Our Services */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Services</Text>
        </View>

        <View style={styles.serviceGrid}>
          {APP_SERVICES.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, { backgroundColor: service.bg }]}
              onPress={() => navigation.navigate(service.route as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <Text style={[styles.serviceTitle, { color: service.textColor }]}>
                {service.title}
              </Text>
              <Text style={[styles.serviceSub, { color: service.textColor + 'CC' }]}>
                {service.subtitle}
              </Text>
              <View
                style={[
                  styles.serviceArrow,
                  { backgroundColor: service.textColor + '22' },
                ]}
              >
                <Ionicons name="arrow-forward" size={16} color={service.textColor} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nearby Shops Quick Link */}
        <TouchableOpacity
          style={styles.nearbyBanner}
          onPress={() => navigation.navigate(ROUTES.NEARBY_SHOPS as never)}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.nearbyTitle}>🗺️ Nearby Shops</Text>
            <Text style={styles.nearbySub}>Find shops within 5 km</Text>
          </View>
          <View style={styles.nearbyBtn}>
            <Text style={styles.nearbyBtnText}>See All</Text>
            <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  headerBg: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locationTextBox: { marginLeft: 6, flex: 1 },
  deliverTo: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    maxWidth: 200,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    padding: 0,
  },
  scroll: { flex: 1 },
  greetRow: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  greetText: { fontSize: 16, color: '#757575' },
  greetName: { fontWeight: '700', color: '#212121' },
  greetSub: { fontSize: 13, color: '#9E9E9E', marginTop: 2 },
  heroBanner: {
    backgroundColor: PRIMARY,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroContent: { flex: 1 },
  heroTag: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  heroBtnText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  heroEmoji: { fontSize: 64, marginLeft: 8 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#212121' },
  serviceGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  serviceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  serviceIcon: { fontSize: 40, marginBottom: 10 },
  serviceTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  serviceSub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  serviceArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  nearbyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  nearbyTitle: { fontSize: 15, fontWeight: '700', color: '#212121' },
  nearbySub: { fontSize: 12, color: '#757575', marginTop: 2 },
  nearbyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  nearbyBtnText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
});
