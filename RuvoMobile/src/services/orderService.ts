import { API_BASE_URL } from '../config/api';
import { Order } from '../types/order';

async function parseOrThrow(res: Response) {
  const text = await res.text().catch(() => '');
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  if (!res.ok) {
    console.error(`[orderService] API Error ${res.status}:`, text);
    throw new Error(body?.message || body?.error || `Server error (${res.status}): ${text || res.statusText}`);
  }
  return body;
}

export async function placeOrder(order: Order, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(order),
  });
  return parseOrThrow(res);
}

export async function initializeCheckout(checkoutData: {
  userId: string;
  shopId: number;
  productId: number;
  productName: string;
  quantity: number;
  items?: Array<{ productId: number; productName: string; quantity: number; price?: number }>;
  paymentMethod: 'COD' | 'ONLINE' | 'TEST_UPI' | 'UPI';
  deliveryAddress: string;
  userLatitude?: number;
  userLongitude?: number;
  customerName?: string;
  customerPhone?: string;
  couponCode?: string;
}, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/payments/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(checkoutData),
  });
  return parseOrThrow(res);
}

export async function initializeCashfreeCheckout(checkoutData: {
  userId: string;
  shopId: number;
  productId: number;
  productName: string;
  quantity: number;
  deliveryAddress: string;
  customerPhone?: string;
  customerEmail?: string;
  userLatitude?: number;
  userLongitude?: number;
  couponCode?: string;
}, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/payments/cashfree/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(checkoutData),
  });
  return parseOrThrow(res);
}

export async function verifyPayment(verifyData: {
  orderId: number;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(verifyData),
  });
  return parseOrThrow(res);
}

export async function failPayment(orderId: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/payments/fail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId }),
  });
  return parseOrThrow(res);
}

export async function getMyOrders(userId: string, token: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE_URL}/api/orders/my-orders?userId=${userId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseOrThrow(res);
}

export async function getOrder(orderId: number, token: string): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseOrThrow(res);
}

// ---------------------------------------------------------------------------
// Pricing — fetches delivery/platform fees from the backend based on distance
// ---------------------------------------------------------------------------

export interface PricingResult {
  subtotal?: number;
  distanceKm: number;
  deliveryFee: number;
  platformFee: number;
  gstOnPlatformFee: number;   // 18% GST on platform fee (shopkeeper owes to RuVo)
  grandTotal?: number;         // final amount customer pays
  isFreeDelivery: boolean;     // true when cart qualifies for free delivery
  riderPayout?: number;        // portion going to delivery partner
  shopPayout?: number;         // net shop revenue
  serviceable: boolean;
  note?: string;
}

/**
 * Fetch distance-based pricing for a specific shop.
 * Calls POST /api/checkout/quote
 */
export async function fetchPricing(
  shopId: number,
  userLat: number,
  userLng: number,
  token?: string,
  cartTotal?: number,
): Promise<PricingResult> {
  const res = await fetch(`${API_BASE_URL}/api/checkout/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Pass cartTotal so backend can apply cart-value modifier + free delivery check
    body: JSON.stringify({ shopId, latitude: userLat, longitude: userLng, cartTotal }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body?.code === 'SERVICE_UNAVAILABLE') {
      return { distanceKm: 0, deliveryFee: 0, platformFee: 0, gstOnPlatformFee: 0, isFreeDelivery: false, serviceable: false, note: body.message };
    }
    throw new Error(body?.message || 'Pricing fetch failed');
  }
  const data = await res.json();
  return {
    ...data,
    serviceable: true,
    gstOnPlatformFee: Number(data.gstOnPlatformFee ?? 0),
    isFreeDelivery: data.isFreeDelivery === true,
  };
}

/**
 * Check if delivery is available near the user's location.
 * Calls GET /api/shops/serviceable?latitude=&longitude=
 */
export async function checkServiceability(
  latitude: number,
  longitude: number,
): Promise<{ serviceable: boolean; nearbyShopCount: number }> {
  const res = await fetch(
    `${API_BASE_URL}/api/shops/serviceable?latitude=${latitude}&longitude=${longitude}`,
  );
  return parseOrThrow(res);
}
