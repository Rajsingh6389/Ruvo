import { API_BASE_URL } from '../config/api';

async function parseOrThrow(res: Response) {
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || `API error (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export async function getDeliveryPartnersByShop(shopId: number, token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/api/delivery-partners/shop/${shopId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseOrThrow(res);
}

export async function getShopDeliveryPartners(shopId: number, token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/api/orders/shop/${shopId}/delivery-partners`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseOrThrow(res);
}
