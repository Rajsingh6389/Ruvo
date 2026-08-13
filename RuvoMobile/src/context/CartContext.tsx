import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import { Product } from '../services/productService';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextData {
  cartItems: CartItem[];
  cartShopId: number | null;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartShopId, setCartShopId] = useState<number | null>(null);

  const addToCart = (product: Product, quantity: number) => {
    if (cartShopId !== null && cartShopId !== product.shopId) {
      Alert.alert(
        'Different Shop',
        'Your cart already has items from a different shop. Clear cart and add this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Cart',
            style: 'destructive',
            onPress: () => {
              setCartItems([{ product, quantity }]);
              setCartShopId(product.shopId);
            },
          },
        ]
      );
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setCartShopId(product.shopId);
  };

  const removeFromCart = (productId: number) => {
    setCartItems(prev => {
      const newItems = prev.filter(item => item.product.id !== productId);
      if (newItems.length === 0) setCartShopId(null);
      return newItems;
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setCartShopId(null);
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartShopId,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
