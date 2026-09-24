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
    console.error(`[helpService] API Error ${res.status}:`, text);
    throw new Error(body?.message || body?.error || `Server error (${res.status}): ${text || res.statusText}`);
  }
  return body || { success: res.ok };
}

export async function submitHelpFeedback(feedback: {
  userId: string;
  userType: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
}, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/help`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(feedback),
  });
  return parseOrThrow(res);
}
