import { API_BASE_URL } from '../config/api';

async function parseOrThrow(res: Response) {
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || `API error (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export async function getMyNotifications(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/api/notifications/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseOrThrow(res);
}
