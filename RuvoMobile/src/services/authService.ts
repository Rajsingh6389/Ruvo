import { API_BASE_URL } from '../config/api';

export async function sendOtp(mobileNumber: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber }),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

export async function verifyOtp(mobileNumber: string, otpCode: string, extraPayload: Record<string, any> = {}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber, otpCode, ...extraPayload }),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}
