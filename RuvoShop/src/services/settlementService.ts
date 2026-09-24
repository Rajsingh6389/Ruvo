import { API_BASE_URL } from '../config/api';

async function parseOrThrow(res: Response) {
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || `API error (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export async function getPlatformFeeSummary(shopId: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/settlements/shopkeeper/platform-fee-summary?shopId=${shopId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseOrThrow(res);
}

export async function payPlatformFee(shopId: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/settlements/shopkeeper/pay-platform-fee?shopId=${shopId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseOrThrow(res);
}
