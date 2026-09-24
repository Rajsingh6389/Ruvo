import { API_BASE_URL } from '../config/api';

export async function checkCanReview(userId: string | number, orderId: string | number, token?: string | null) {
  const res = await fetch(
    `${API_BASE_URL}/api/reviews/can-review?userId=${userId}&orderId=${orderId}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  const data = await res.json();
  
  return { ok: res.ok, canReview: data.canReview };
}

export async function submitOrderReview(reviewData: any, token: string | null) {
  const res = await fetch(`${API_BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(reviewData),
  });
  const data = await res.json();
  
  return { ok: res.ok, data };
}
