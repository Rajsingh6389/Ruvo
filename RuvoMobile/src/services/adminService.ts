import { API_BASE_URL } from '../config/api';

async function parseOrThrow(res: Response) {
  const text = await res.text().catch(() => '');
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  if (!res.ok) {
    console.error(`[adminService] API Error ${res.status}:`, text);
    throw new Error(body?.message || body?.error || `Server error (${res.status}): ${text || res.statusText}`);
  }
  return body || { success: res.ok };
}

export async function getPendingPartners(token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/admin/partners/pending`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseOrThrow(res);
}

export async function approvePartner(partnerId: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/admin/partners/${partnerId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
  return parseOrThrow(res);
}

export async function rejectPartner(partnerId: number, reason: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/admin/partners/${partnerId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
  return parseOrThrow(res);
}
