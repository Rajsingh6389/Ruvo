import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../services/productService';
import { useToast } from './ToastContext';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextData {
  cartItems: CartItem[];
  cartShopId: number | null;
  addToCart: (product: Product, quantity?: number, options?: { silent?: boolean }) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  getQuantity: (productId?: number) => number;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { showToast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartShopId, setCartShopId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem('@ruvo_cart');
        const savedShop = await AsyncStorage.getItem('@ruvo_cart_shop');
        if (mounted) {
          if (savedCart) setCartItems(JSON.parse(savedCart));
          if (savedShop) setCartShopId(JSON.parse(savedShop));
        }
      } catch (e) {
        console.warn('Failed to load cart', e);
      } finally {
        if (mounted) setIsInitialized(true);
      }
    };
    loadCart();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem('@ruvo_cart', JSON.stringify(cartItems)).catch(() => {});
    AsyncStorage.setItem('@ruvo_cart_shop', JSON.stringify(cartShopId)).catch(() => {});
  }, [cartItems, cartShopId, isInitialized]);

  const addToCart = (product: Product, quantity = 1, options?: { silent?: boolean }) => {
    if (!product.id) {
      if (!options?.silent) showToast('This product cannot be added yet', 'error');
      return;
    }

    const switchedShop = cartShopId !== null && cartShopId !== product.shopId;

    setCartItems(prev => {
      const source = switchedShop ? [] : prev;
      const existing = source.find(item => item.product.id === product.id);
      if (existing) {
        return source.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...source, { product, quantity }];
    });
    setCartShopId(product.shopId);

    if (options?.silent) return;

    if (switchedShop) {
      showToast(`Switched shop · ${product.name} added`);
    } else {
      showToast(`${product.name} added to cart`);
    }
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
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const getQuantity = (productId?: number) => {
    if (!productId) return 0;
    return cartItems.find(item => item.product.id === productId)?.quantity ?? 0;
  };

  const clearCart = () => {
    setCartItems([]);
    setCartShopId(null);
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => {
      const price = Number(item.product.sellingPrice ?? (item.product as any).price ?? 0);
      const qty = Number(item.quantity ?? 1);
      return sum + (isNaN(price) ? 0 : price) * (isNaN(qty) ? 1 : qty);
    },
    0,
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
        getQuantity,
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
