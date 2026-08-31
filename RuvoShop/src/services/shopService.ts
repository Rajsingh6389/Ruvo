  import axios from 'axios';
  import { API_BASE_URL } from '../config/api';

  export interface Shop {
    id: number;
    name: string;
    category: string;
    bannerUrl?: string;
    logoUrl?: string;
    imageUrl?: string;
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

  export async function uploadShop(
    shopInput: any,
    logo: any,
    banner: any,
    token: string,
    galleryImages?: any[],
  ): Promise<Shop> {
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

    // Append each gallery photo as a separate "images" field — the backend
    // reads MultipartFile[] images and uploads them all to Cloudinary.
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach((img, index) => {
        formData.append('images', {
          uri: img.uri,
          name: img.fileName || `gallery_${Date.now()}_${index}.jpg`,
          type: img.type || 'image/jpeg',
        } as any);
      });
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

  export async function updateShop(
    shopId: number | string,
    shopInput: any,
    logo: any,
    banner: any,
    token: string,
    galleryImages?: any[],
  ): Promise<Shop> {
    if (logo || banner || (galleryImages && galleryImages.length > 0)) {
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
      if (galleryImages && galleryImages.length > 0) {
        galleryImages.forEach((img, index) => {
          formData.append('images', {
            uri: img.uri,
            name: img.fileName || `gallery_${Date.now()}_${index}.jpg`,
            type: img.type || 'image/jpeg',
          } as any);
        });
      }

      try {
        const res = await axios.put(`${API_BASE_URL}/api/shops/upload/${shopId}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        return res.data;
      } catch (error: any) {
        throw new Error(error.response?.data || error.message || 'Shop update failed');
      }
    } else {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(shopInput),
      });
      return parseOrThrow(res);
    }
  }

  export async function getMyShops(ownerId: string, token: string): Promise<Shop[]> {
    const res = await fetch(
      `${API_BASE_URL}/api/shops/mine?ownerId=${encodeURIComponent(ownerId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return parseOrThrow(res);
  }

  /** Returns true if the user already owns at least one APPROVED shop.
   *  Used by AuthContext.login() to skip onboarding for returning users. */
  export async function checkHasShop(ownerId: string, token: string): Promise<boolean> {
    try {
      const shops = await getMyShops(ownerId, token);
      return Array.isArray(shops) && shops.some(s => (s as any).approved === true || (s as any).isApproved === true || (s as any).status === 'APPROVED');
    } catch {
      // If the request fails (network error, cold-start), assume no shop so
      // onboarding can be shown — safer than accidentally sending new users to main app.
      return false;
    }
  }


  /**
   * Determines the correct OnboardingStatus from the backend on login.
   * - APPROVED         → user has an approved shop, go straight to main app
   * - PENDING_APPROVAL → user has a shop awaiting admin review
   * - NEW              → no shop found, start onboarding from Step 1
   */
  export async function checkShopApprovalStatus(
    ownerId: string,
    token: string,
  ): Promise<'APPROVED' | 'PENDING_APPROVAL' | 'NEW'> {
    try {
      const shops = await getMyShops(ownerId, token);
      if (!Array.isArray(shops) || shops.length === 0) return 'NEW';
      const hasApproved = shops.some(
        s => (s as any).approved === true || (s as any).isApproved === true || (s as any).status === 'APPROVED',
      );
      return hasApproved ? 'APPROVED' : 'PENDING_APPROVAL';
    } catch {
      return 'NEW';
    }
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
