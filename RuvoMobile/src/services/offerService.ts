import { API_BASE_URL } from '../config/api';

export interface Offer {
  id: number;
  shopId: number;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  active: boolean;
  createdAt?: string;
  expiresAt?: string;
}

export async function createOffer(offerData: Partial<Offer>, token: string): Promise<Offer> {
  const res = await fetch(`${API_BASE_URL}/api/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(offerData),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message || 'Failed to create offer');
  return body as Offer;
}

export async function getShopOffers(shopId: number, token?: string): Promise<Offer[]> {
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE_URL}/api/offers/shop/${shopId}`, { headers });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message || 'Failed to fetch offers');
  return body as Offer[];
}

export async function toggleOffer(id: number, active: boolean, token: string): Promise<Offer> {
  const res = await fetch(`${API_BASE_URL}/api/offers/${id}/status?active=${active}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message || 'Failed to toggle offer');
  return body as Offer;
}

export async function deleteOffer(id: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete offer');
}

export interface ValidateCouponResponse {
  valid: boolean;
  code?: string;
  discountAmount?: number;
  message?: string;
}

export async function validateCoupon(
  code: string,
  shopId: number,
  cartTotal: number,
  token?: string
): Promise<ValidateCouponResponse> {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    // NOTE: backend expects "cartValue" (not "cartTotal") — do not rename this field
    const res = await fetch(`${API_BASE_URL}/api/offers/validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, shopId, cartValue: cartTotal }),
    });

    const body = await res.json();

    if (!res.ok) {
      return { valid: false, message: body?.message || 'Invalid coupon' };
    }

    // Normalize discountAmount — Spring BigDecimal can arrive as string in some configs
    return {
      ...body,
      valid: body.valid === true,
      discountAmount: body.discountAmount !== undefined ? Number(body.discountAmount) : undefined,
    } as ValidateCouponResponse;
  } catch (error: any) {
    return { valid: false, message: error.message || 'Failed to validate coupon' };
  }
}
