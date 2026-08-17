import { API_BASE_URL } from '../config/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const api = async <T>(path: string, token?: string | null, init: RequestInit = {}): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
    const raw = await response.text();
    let body: any = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
    if (!response.ok) {
      const message = body?.message || body?.error || (typeof body === 'string' && body) ||
        (response.status === 401 ? 'Your session has expired. Please sign in again.' :
          response.status === 403 ? 'You do not have permission to perform this action.' :
          response.status === 409 ? 'This delivery is no longer available.' : 'The request could not be completed.');
      throw new ApiError(response.status, message);
    }
    return body as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new ApiError(408, 'The request timed out. Check your connection and try again.');
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'You are offline or the Ruvo service is unreachable.');
  } finally { clearTimeout(timeout); }
};

export const unwrap = <T,>(response: any): T => response?.data ?? response;
