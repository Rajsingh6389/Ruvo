import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect
} from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/api';
import { useToast } from './ToastContext';

type OrderModalContextData = {
  showOrderModal: (order: any) => void;
  hideOrderModal: () => void;
};

const OrderModalContext = createContext<OrderModalContextData>({
  showOrderModal: () => {},
  hideOrderModal: () => {},
});

export const OrderModalProvider = ({ children }: { children: ReactNode }) => {
  const [incomingOrder, setIncomingOrder] = useState<any>(null);
  const { token } = useAuth();
  const { showToast } = useToast();
  const [countdown, setCountdown] = useState<string>('');

  const showOrderModal = (order: any) => {
    setIncomingOrder(order);
  };

  const hideOrderModal = () => {
    setIncomingOrder(null);
  };

  // Timer for the modal
  useEffect(() => {
    if (!incomingOrder || !incomingOrder.shopResponseDeadline) return;
    
    const timer = setInterval(() => {
      const diff = new Date(incomingOrder.shopResponseDeadline).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('EXPIRED');
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')} left`);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [incomingOrder]);

  const handleAccept = async (orderId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('✅ Order Accepted!', 'success');
      } else {
        showToast('❌ Failed to accept order.', 'error');
      }
    } catch (e) {
      showToast('❌ Network error', 'error');
    }
  };

  const handleReject = async (orderId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Order Rejected.', 'info');
      } else {
        showToast('Failed to reject order', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  return (
    <OrderModalContext.Provider value={{ showOrderModal, hideOrderModal }}>
      {children}
      
      {/* Incoming Order Half-Screen Modal */}
      <Modal
        visible={!!incomingOrder}
        transparent
        animationType="slide"
        onRequestClose={hideOrderModal}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <TouchableOpacity className="flex-1" onPress={hideOrderModal} />
          
          <Animated.View entering={FadeInDown.duration(400)} className="bg-white rounded-t-[32px] overflow-hidden shadow-2xl">
            {/* Urgency Header */}
            <View className="bg-amber-500 px-xl py-4 flex-row items-center justify-between shadow-sm">
              <View className="flex-row items-center gap-2">
                 <Ionicons name="notifications" size={24} color="#FFFFFF" />
                 <Text className="text-lg font-black text-white uppercase tracking-widest mt-0.5">New Order Alert</Text>
              </View>
              {countdown ? (
                 <View className="bg-red-600 px-3 py-1 rounded-full border border-red-400">
                   <Text className="text-sm font-black text-white tabular-nums">
                     {countdown}
                   </Text>
                 </View>
              ) : null}
            </View>

            <View className="p-xl">
              <View className="flex-row items-center justify-between mb-sm">
                <Text className="text-gray-500 font-bold tracking-wide">ORDER ID #{incomingOrder?.id}</Text>
                <View className="bg-amber-100 px-2 py-1 rounded">
                  <Text className="text-amber-800 text-xs font-bold">Awaiting Response</Text>
                </View>
              </View>

              <Text className="text-2xl font-black text-gray-900 mb-xs" numberOfLines={2}>
                {incomingOrder?.productName || 'Multiple Items Selected'}
              </Text>
              {incomingOrder?.items && incomingOrder.items.length > 0 && (
                <Text className="text-sm font-bold text-gray-500 mb-md">
                  + {incomingOrder.items.length - 1} additional item{incomingOrder.items.length > 2 ? 's' : ''}
                </Text>
              )}

              {/* Order Data Bento Box */}
              <View className="bg-gray-50 rounded-2xl p-lg border border-gray-100 flex-row gap-lg mb-md">
                <View className="flex-1 border-r border-gray-200">
                   <Text className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Total Value</Text>
                   <Text className="text-2xl font-black text-emerald-600">₹{incomingOrder?.totalAmount}</Text>
                </View>
                <View className="flex-1 pl-sm">
                   <Text className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Payment</Text>
                   <View className="flex-row items-center gap-xs mt-1">
                     <Ionicons name={incomingOrder?.paymentMethod === 'COD' ? 'timer-outline' : 'checkmark-circle'} size={18} color={incomingOrder?.paymentMethod === 'COD' ? '#EA580C' : '#16A34A'} />
                     <Text className="text-base font-black text-gray-900 pt-0.5">
                       {incomingOrder?.paymentMethod || 'Online'}
                     </Text>
                   </View>
                </View>
              </View>

              {/* Delivery Data */}
              <View className="flex-row items-start gap-md mb-xl bg-blue-50/50 p-md rounded-2xl border border-blue-100/50">
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                  <Ionicons name="location" size={20} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-blue-600 font-black mb-0.5 uppercase tracking-wider">Delivery To</Text>
                  <Text className="text-sm font-bold text-gray-800" numberOfLines={2}>{incomingOrder?.deliveryAddress || 'Customer Address'}</Text>
                  <Text className="text-xs font-semibold text-gray-500 mt-1">{incomingOrder?.customerName || 'Customer'}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-md pb-md">
                <TouchableOpacity 
                   activeOpacity={0.8}
                   onPress={() => {
                      if (incomingOrder?.id) handleReject(incomingOrder.id);
                      hideOrderModal();
                   }} 
                   className="flex-1 bg-white border-2 border-rose-500 py-4 rounded-2xl items-center justify-center shadow-sm"
                >
                  <Text className="text-rose-600 font-black text-base uppercase tracking-wider">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   activeOpacity={0.8}
                   onPress={() => {
                      if (incomingOrder?.id) handleAccept(incomingOrder.id);
                      hideOrderModal();
                   }} 
                   className="flex-[2] bg-emerald-500 border border-emerald-600 py-4 rounded-2xl items-center justify-center shadow-md shadow-emerald-500/20"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    <Text className="text-white font-black text-base uppercase tracking-widest mt-0.5">Accept Order</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </OrderModalContext.Provider>
  );
};

export const useOrderModal = () => useContext(OrderModalContext);
