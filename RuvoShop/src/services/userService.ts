import { API_BASE_URL } from '../config/api';

export interface User {
  id: number;
  name: string;
  email: string;
  mobileNumber: string;
  role: string;
  status: string;
  walletBalance: number;
}

export async function getUserProfile(token: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || 'Failed to fetch user profile');
  return body.data as User;
}

export interface UpdateProfileInput {
  name?: string;
  mobileNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  bio?: string;
  gender?: string;
}

export async function updateUserProfile(token: string, updates: UpdateProfileInput): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || 'Failed to update profile');
  return body.data as User;
}
