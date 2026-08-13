import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../constants/routes';

const OrderSuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // orderId and total would be passed from CheckoutScreen navigation params
  const orderId = route.params?.orderId || 'RUVO_NEW';
  const total = route.params?.total || 0;

  useEffect(() => {
    // Auto-navigate to home after 4 seconds
    const timer = setTimeout(() => {
      navigation.navigate(ROUTES.MAIN_TABS);
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#2E7D32" />
        </View>
        <Text style={styles.title}>Order Successful!</Text>
        <Text style={styles.orderNumber}>Order #{orderId}</Text>
        <Text style={styles.totalText}>Total: ₹{total}</Text>
        
        <Text style={styles.subtitle}>
          Your order has been placed successfully. The shop will confirm your order shortly.
        </Text>

        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => navigation.navigate(ROUTES.MAIN_TABS)}
        >
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  totalText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  homeButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  }
});

export default OrderSuccessScreen;
