import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../services/productService';
import { useToast } from './ToastContext';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface PendingAdd {
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

  // Shop Switch Alert Modal State
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);
  const [switchModalVisible, setSwitchModalVisible] = useState(false);

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

  const executeAdd = (product: Product, quantity: number, options?: { silent?: boolean }, clearPrevious = false) => {
    const existing = (!clearPrevious) ? cartItems.find(item => item.product.id === product.id) : null;
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + quantity > product.stockQuantity) {
      if (!options?.silent) {
        showToast(`Limit reached. Only ${product.stockQuantity} in stock.`, 'error');
      }
      return;
    }

    setCartItems(prev => {
      const source = clearPrevious ? [] : prev;
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

    if (clearPrevious) {
      showToast(`Cart updated with ${product.name}`);
    } else {
      showToast(`${product.name} added to cart`);
    }
  };

  const addToCart = (product: Product, quantity = 1, options?: { silent?: boolean }) => {
    if (!product.id) {
      if (!options?.silent) showToast('This product cannot be added yet', 'error');
      return;
    }

    // Check if item belongs to a different shop and cart is not empty
    if (cartShopId !== null && cartShopId !== product.shopId && cartItems.length > 0) {
      setPendingAdd({ product, quantity });
      setSwitchModalVisible(true);
      return;
    }

    executeAdd(product, quantity, options, false);
  };

  const handleConfirmSwitch = () => {
    if (pendingAdd) {
      executeAdd(pendingAdd.product, pendingAdd.quantity, undefined, true);
      setPendingAdd(null);
    }
    setSwitchModalVisible(false);
  };

  const handleCancelSwitch = () => {
    setPendingAdd(null);
    setSwitchModalVisible(false);
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
    
    const existing = cartItems.find(item => item.product.id === productId);
    if (existing && quantity > existing.product.stockQuantity) {
      showToast(`Cannot exceed stock limit of ${existing.product.stockQuantity}`, 'error');
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

      {/* ── Shop Switch Warning Modal ───────────────────────── */}
      <Modal
        visible={switchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelSwitch}
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.iconBadge}>
              <Ionicons name="warning" size={28} color="#FF8A00" />
            </View>
            <Text style={modalStyles.title}>Replace cart items?</Text>
            <Text style={modalStyles.message}>
              Your cart contains items from another store. Would you like to clear the cart and add items from this store instead?
            </Text>

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={handleCancelSwitch}>
                <Text style={modalStyles.cancelText}>No, Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.confirmBtn} onPress={handleConfirmSwitch}>
                <Text style={modalStyles.confirmText}>Replace & Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CartContext.Provider>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#171A1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#55514A',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FF8A00',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export const useCart = () => useContext(CartContext);
