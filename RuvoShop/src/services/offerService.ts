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
