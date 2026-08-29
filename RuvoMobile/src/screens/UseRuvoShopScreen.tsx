import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width: SW } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'receipt-outline' as const,
    title: 'Manage Orders',
    desc: 'Track and manage all incoming orders in real time',
    color: '#7C3AED',
  },
  {
    icon: 'cube-outline' as const,
    title: 'Add Products',
    desc: 'Add and manage your products with images & pricing',
    color: '#2563EB',
  },
  {
    icon: 'bar-chart-outline' as const,
    title: 'Track Earnings',
    desc: 'Monitor your earnings and view detailed sales reports',
    color: '#059669',
  },
  {
    icon: 'people-outline' as const,
    title: 'Grow Your Business',
    desc: 'Reach more customers and grow your business with RuVo',
    color: '#D97706',
  },
];

/** Animated mock phone "screen" inside the promo hero */
const MockPhone: React.FC = () => {
  const { colors, typography } = useTheme();
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, [floatAnim]);

  return (
    <Animated.View
      style={[
        styles.phone,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ translateY: floatAnim }],
        },
      ]}
    >
      {/* Status bar mock */}
      <View style={[styles.phoneStatus, { backgroundColor: colors.surfaceSunken }]}>
        <View style={[styles.phoneNotch, { backgroundColor: colors.border }]} />
      </View>

      {/* App header */}
      <View style={[styles.phoneHeader, { backgroundColor: '#F5B700' }]}>
        <Text style={styles.phoneAppName}>RuVo Shop</Text>
        <Ionicons name="search-outline" size={16} color="#231C10" />
      </View>

      {/* Stats */}
      <View style={styles.phoneBody}>
        <Text style={[styles.phoneGreeting, { color: colors.textSecondary }]}>Total Sales</Text>
        <Text style={[styles.phoneAmount, { color: colors.textPrimary }]}>₹48,650</Text>
        <View style={[styles.phoneTrendRow, { backgroundColor: '#E8F5E9', borderRadius: 6, padding: 4, marginTop: 4 }]}>
          <Ionicons name="trending-up" size={12} color="#16A34A" />
          <Text style={{ color: '#16A34A', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>+24.5%</Text>
        </View>

        <View style={[styles.phoneDivider, { backgroundColor: colors.border }]} />

        <Text style={[styles.phoneGreeting, { color: colors.textSecondary }]}>Today's Orders</Text>
        <Text style={[styles.phoneOrderCount, { color: colors.textPrimary }]}>28</Text>

        {/* Mini product rows */}
        {[
          { name: 'Basmati Rice 1kg', price: '₹120', sold: '142 Sold' },
          { name: 'Sunflower Oil 1L', price: '₹135', sold: '98 Sold' },
        ].map((item, i) => (
          <View key={i} style={[styles.phoneProdRow, { borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}>
            <View style={[styles.phoneProdImg, { backgroundColor: colors.surfaceSunken, borderRadius: 6 }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ color: '#F5B700', fontSize: 10, fontWeight: '700' }}>{item.price}</Text>
            </View>
            <Text style={{ color: colors.textHint, fontSize: 9 }}>{item.sold}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

/** Premium "Open a Shop on RuVo" promo screen */
export const UseRuvoShopScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, typography, radius, shadows, spacing } = useTheme();

  // Entrance animations
  const heroAnim   = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [heroAnim, contentAnim]);

  const openShopApp = async () => {
    const deepLink = 'ruvo-shop://register';
    const playStore = 'https://play.google.com/store/search?q=ruvo+shop&c=apps';
    try {
      if (await Linking.canOpenURL(deepLink)) {
        await Linking.openURL(deepLink);
      } else {
        await Linking.openURL(playStore);
      }
    } catch {
      Alert.alert(
        'Install RuVo Shop',
        'Download RuVo Shop from Google Play to register and manage your shop.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Play Store', onPress: () => Linking.openURL(playStore) },
        ],
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Back */}
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.card, borderRadius: radius.pill, borderColor: colors.border }, shadows.sm]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── HERO ─────────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: heroAnim }}>
          <LinearGradient
            colors={['#FFF7E3', colors.background]}
            style={styles.hero}
          >
            {/* Badge */}
            <View style={[styles.heroBadge, { backgroundColor: colors.primarySoft, borderRadius: radius.pill }]}>
              <Ionicons name="storefront-outline" size={14} color={colors.primaryDark} />
              <Text style={[typography.overline, { color: colors.primaryDark, fontSize: 11, marginLeft: 5 }]}>
                Open Your Shop
              </Text>
            </View>

            {/* Left text */}
            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Download{'\n'}
                <Text style={{ color: colors.primary }}>Ruvo Shop</Text>
              </Text>
              <Text style={[typography.headingM, { color: colors.textSecondary, marginTop: 4 }]}>
                Manage. Grow. Succeed.
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 10, lineHeight: 20 }]}>
                Everything you need to run your shop and grow your business with RuVo.
              </Text>
            </View>

            {/* Mock phone */}
            <MockPhone />
          </LinearGradient>
        </Animated.View>

        {/* ── FEATURES ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.featuresSection,
            { paddingHorizontal: spacing.gutter, opacity: contentAnim },
          ]}
        >
          {FEATURES.map((f, i) => (
            <View
              key={i}
              style={[
                styles.featureRow,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.card,
                  borderColor: colors.border,
                },
                shadows.sm,
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: f.color + '18', borderRadius: radius.sm }]}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{f.title}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, lineHeight: 17 }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* ── GET APP ROW ───────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.getAppSection,
            { paddingHorizontal: spacing.gutter, opacity: contentAnim },
          ]}
        >
          <View style={[styles.getAppCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }, shadows.md]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headingM, { color: colors.textPrimary }]}>Get RuVo Shop App Now</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Available on Google Play Store</Text>
            </View>
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: '#1C1C1C', borderRadius: radius.button }]}
              onPress={openShopApp}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google-playstore" size={18} color="#FFFFFF" />
              <View>
                <Text style={{ color: '#A5A5A5', fontSize: 9, fontWeight: '600' }}>GET IT ON</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Google Play</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Trust row */}
          <View style={styles.trustRow}>
            {[
              { icon: 'checkmark-circle-outline' as const, label: '100% Free', sub: 'No hidden charges' },
              { icon: 'flash-outline' as const, label: 'Easy to Use', sub: 'Simple & Powerful' },
              { icon: 'shield-checkmark-outline' as const, label: 'Secure & Reliable', sub: 'Your business is safe' },
            ].map((t, i) => (
              <View key={i} style={styles.trustItem}>
                <Ionicons name={t.icon} size={18} color={colors.primary} />
                <Text style={[typography.overline, { color: colors.textPrimary, fontSize: 10, marginTop: 4, textAlign: 'center' }]}>{t.label}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, textAlign: 'center' }]}>{t.sub}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 54,
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Hero ──────────────────────────────────────────────────────────
  hero: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: '100%',
    alignSelf: 'flex-start',
  },
  heroContent: {
    flex: 1,
    minWidth: 160,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    letterSpacing: -0.5,
  },

  // ── Mock phone ────────────────────────────────────────────────────
  phone: {
    width: 155,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  phoneStatus: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneNotch: {
    width: 50,
    height: 6,
    borderRadius: 3,
  },
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  phoneAppName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#231C10',
  },
  phoneBody: {
    padding: 10,
  },
  phoneGreeting: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  phoneAmount: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  phoneTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  phoneDivider: {
    height: 1,
    marginVertical: 8,
  },
  phoneOrderCount: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 8,
  },
  phoneProdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
  },
  phoneProdImg: {
    width: 28,
    height: 28,
  },

  // ── Features ──────────────────────────────────────────────────────
  featuresSection: {
    marginTop: 8,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Get App ───────────────────────────────────────────────────────
  getAppSection: {
    marginTop: 20,
    gap: 16,
  },
  getAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
});
