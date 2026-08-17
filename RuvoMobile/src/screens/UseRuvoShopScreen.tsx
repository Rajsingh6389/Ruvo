import React from 'react';
import { Alert, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Customer-app handoff. Shop registration and management live only in Ruvo Shop. */
export const UseRuvoShopScreen = () => {
  const openShopApp = async () => {
    try {
      const url = 'ruvo-shop://register';
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    } catch { /* Show the installation guidance below. */ }
    Alert.alert('Use Ruvo Shop', 'Install or open the Ruvo Shop app to register and manage your shop.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.icon}><Ionicons name="storefront" size={48} color="#2E7D32" /></View>
        <Text style={styles.title}>Register your shop in Ruvo Shop</Text>
        <Text style={styles.description}>
          Shop registration, products, orders and shop management are available in the dedicated Ruvo Shop app.
        </Text>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={openShopApp}>
          <Text style={styles.buttonText}>OPEN RUVO SHOP</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  icon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { color: '#1F2937', fontSize: 24, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
  description: { color: '#6B7280', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 14, marginBottom: 30 },
  button: { backgroundColor: '#2E7D32', borderRadius: 10, minWidth: 220, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
