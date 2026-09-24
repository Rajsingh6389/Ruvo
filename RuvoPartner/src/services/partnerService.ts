import { api, unwrap } from './api';

export type PartnerProfile = {
  userId: number; partnerId?: number; name: string; mobileNumber: string;
  verificationStatus: string; adminReason?: string | null;
  vehicle?: { vehicleType: string; vehicleNumber: string; vehicleModel?: string } | null;
  kyc?: { address?: string; city?: string; state?: string; pincode?: string } | null;
};
export type OrderItem = { id?: number; productName: string; quantity: number; priceAtOrder?: number; productImageUrl?: string };
export type Delivery = { 
  id: number; 
  orderId: number; 
  status: string; 
  pickupLocation: string; 
  deliveryLocation: string; 
  deliveryFee: number; 
  deliveredAt?: string;
  totalAmount?: number;
  paymentMethod?: string;
  shopName?: string;
  shopAddress?: string;
  productName?: string;
  productImageUrl?: string;
  quantity?: number;
  items?: OrderItem[];
};
export type DeliveryRequest = { 
  requestId: number; 
  orderId: number; 
  distanceKm: number; 
  expiresAt: string; 
  status: string; 
  deliveryAddress?: string; 
  shopName?: string;
  shopAddress?: string;
  totalAmount?: number; 
  paymentMethod?: string; 
  deliveryFee?: number;
  productName?: string;
  productImageUrl?: string;
  quantity?: number;
  items?: OrderItem[];
};
export type Earnings = { todayEarnings: number; totalEarnings: number; walletBalance: number; shopDues?: number };

export const partnerService = {
  profile: async (token: string) => unwrap<PartnerProfile>(await api('/api/partner/profile', token, { headers: { 'X-Skip-Global-401': 'true' } })),
  account: async (token: string) => unwrap<{ isAvailable?: boolean; status?: string }>(await api('/api/partner/auth/me', token, { headers: { 'X-Skip-Global-401': 'true' } })),
  verification: async (token: string) => unwrap<{ profileStatus: string; adminReason?: string }>(await api('/api/partner/verification/status', token)),
  availability: (token: string, available: boolean, lat?: number, lng?: number, locationName?: string) => {
    let url = `/api/partner/availability?available=${available}`;
    if (lat !== undefined && lng !== undefined) {
      url += `&latitude=${lat}&longitude=${lng}`;
    }
    if (locationName) {
      url += `&locationName=${encodeURIComponent(locationName)}`;
    }
    return api(url, token, { method: 'PUT' });
  },
  updateLocation: (token: string, lat: number, lng: number, locationName?: string) => {
    let url = `/api/partner/location?latitude=${lat}&longitude=${lng}`;
    if (locationName) {
      url += `&locationName=${encodeURIComponent(locationName)}`;
    }
    return api(url, token, { method: 'PUT' });
  },
  activeDeliveries: (token: string) => api<Delivery[]>('/api/partner/deliveries', token),
  delivery: (token: string, id: number) => api<Delivery>(`/api/partner/deliveries/${id}`, token),
  earnings: (token: string) => api<Earnings>('/api/partner/earnings', token),
  history: (token: string) => api<Delivery[]>('/api/partner/history', token),
  requests: (token: string) => api<DeliveryRequest[]>('/api/delivery/requests', token),
  acceptRequest: (token: string, id: number) => api<void>(`/api/delivery/requests/${id}/accept`, token, { method: 'POST' }),
  rejectRequest: (token: string, id: number) => api<void>(`/api/delivery/requests/${id}/reject`, token, { method: 'POST' }),
  pickup: (token: string, id: number, otp?: string) => api<any>(`/api/partner/deliveries/${id}/pickup${otp ? `?otp=${encodeURIComponent(otp)}` : ''}`, token, { method: 'PUT' }),
  startDelivery: (token: string, id: number) => api<any>(`/api/partner/deliveries/${id}/out-for-delivery`, token, { method: 'PUT' }),
  completeLegacy: (token: string, id: number) => api<any>(`/api/partner/deliveries/${id}/delivered`, token, { method: 'PUT' }),
  settlementSummary: (token: string, date?: string, partnerId?: number | string) => {
    let query = partnerId ? `?partnerId=${partnerId}` : '';
    if (date) query += query ? `&date=${encodeURIComponent(date)}` : `?date=${encodeURIComponent(date)}`;
    return api<any>(`/api/settlements/partner${query}`, token);
  },
  generateHandoverOtp: (token: string, orderId: number) => api<any>(`/api/partner/settlements/${orderId}/generate-handover-otp`, token, { method: 'POST' }),
  notifications: (token: string) => api<any[]>('/api/notifications/mine', token),
  markNotificationRead: (token: string, id: number) => api(`/api/notifications/${id}/read`, token, { method: 'PATCH' }),
  
  // Bank Account
  getBankStatus: (token: string, partnerId: number | string) => api<any>(`/api/partner/razorpay/bank/status?partnerId=${partnerId}`, token),
  changeBankAccount: (token: string, body: any) => api<any>('/api/partner/razorpay/bank/change', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),

  // Shop Preferences
  getShopPreferences: (token: string) => api<any>('/api/partner/shop-preferences', token),
  updateShopPreferences: (token: string, shopIds: number[]) => api<any>('/api/partner/shop-preferences', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shopIds) }),

  // Vehicle Details
  getVehicleDetails: (token: string) => api<any>('/api/partner/vehicle', token),
  updateVehicleDetails: (token: string, vehicle: any) => api<any>('/api/partner/vehicle', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vehicle) }),

  // Onboarding
  getOnboardingFee: () => api<any>('/api/onboarding/fee?type=PARTNER'),
  submitVerification: (token: string, body: any) => api<any>('/api/partner/verification', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  
  // Shops
  getNearbyShops: (token: string, lat?: number, lng?: number) => {
    const params = lat != null ? `?lat=${lat}&lng=${lng}&radius=5` : '';
    return api<any>(`/api/partner/nearby-shops${params}`, token);
  },
  getAllShops: (token: string) => api<any>('/api/shops', token),
};
