import { API_BASE_URL } from '../config/api';
import { Order } from '../types/order';

async function parseOrThrow(res: Response) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message || 'Request failed');
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
  paymentMethod: 'COD' | 'ONLINE';
  deliveryAddress: string;
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

