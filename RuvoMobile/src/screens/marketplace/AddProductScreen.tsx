import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { addProduct } from '../../services/productService';

export const AddProductScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { token } = useAuth();
  const shopId = route.params?.shopId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddProduct = async () => {
    if (!name || !price || !category) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (!shopId) {
      Alert.alert('Error', 'No Shop ID found');
      return;
    }
    setLoading(true);
    try {
      if (!token) throw new Error('Not authenticated');
      await addProduct({
        name,
        description,
        price: parseFloat(price),
        category,
        shopId: parseInt(shopId, 10)
      }, token);
      Alert.alert('Success', 'Product added successfully');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Add New Product</Text>
      
      <TextInput
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Product Name"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, styles.textArea, { color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Description"
        placeholderTextColor={colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Price ($)"
        placeholderTextColor={colors.textSecondary}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      <TextInput
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Category"
        placeholderTextColor={colors.textSecondary}
        value={category}
        onChangeText={setCategory}
      />

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={handleAddProduct}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Submit Product</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
