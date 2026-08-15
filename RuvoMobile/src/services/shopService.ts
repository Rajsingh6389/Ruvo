import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export interface Shop {
  id: number;
  name: string;
  category: string;
  bannerUrl?: string;
  logoUrl?: string;
  address: string;
  owner?: string;
  ownerId: string;
  phone: string;
  rating?: number;
  deliveryAvailable?: boolean;
  latitude?: number;
  longitude?: number;
  openingTime?: string;
  closingTime?: string;
  approved: boolean;
}

export interface NewShopInput {
  name: string;
  category: string;
  address: string;
  phone: string;
  ownerId: string;
}

async function parseOrThrow(res: Response) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.message ?? (typeof body === 'string' ? body : 'Request failed');
    throw new Error(message);
  }
  return body;
}

export async function registerShop(input: NewShopInput, token: string): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL}/api/shops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  return parseOrThrow(res);
}

export async function uploadShop(shopInput: any, logo: any, banner: any, token: string): Promise<Shop> {
  const formData = new FormData();
  
  formData.append('shop', JSON.stringify(shopInput));
  
  if (logo) {
    formData.append('logo', {
      uri: logo.uri,
      name: logo.fileName || `logo_${Date.now()}.jpg`,
      type: logo.type || 'image/jpeg',
    } as any);
  }

  if (banner) {
    formData.append('banner', {
      uri: banner.uri,
      name: banner.fileName || `banner_${Date.now()}.jpg`,
      type: banner.type || 'image/jpeg',
    } as any);
  }

  try {
    const res = await axios.post(`${API_BASE_URL}/api/shops/upload`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data || error.message || 'Axios upload failed');
  }
}

export async function getMyShops(ownerId: string, token: string): Promise<Shop[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return parseOrThrow(res);
}

export async function getApprovedShops(): Promise<Shop[]> {
  const res = await fetch(`${API_BASE_URL}/api/shops`);
  return parseOrThrow(res);
}

export async function getShops(): Promise<Shop[]> {
  return getApprovedShops();
}

export async function getShopById(id: number | string): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL}/api/shops/${id}`);
  return parseOrThrow(res);
}

export async function getNearbyShops(
  latitude: number,
  longitude: number,
  radius: number = 5.0,
): Promise<Shop[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/shops/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
  );
  const body = await parseOrThrow(res);
  if (Array.isArray(body)) return body;
  if (body?.shops && Array.isArray(body.shops)) return body.shops;
  return [];
}

// ─── ADMIN ENDPOINTS ──────────────────────────────────────────

export async function getPendingShops(token: string): Promise<Shop[]> {
  const res = await fetch(`${API_BASE_URL}/api/shops/pending`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseOrThrow(res);
}

export async function approveShop(shopId: number, token: string): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseOrThrow(res);
}

export async function rejectShop(shopId: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/reject`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  // Expect empty response or message, parseOrThrow will handle bad status
  return parseOrThrow(res);
}