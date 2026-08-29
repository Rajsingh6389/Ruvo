const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const REQUEST_TIMEOUT_MS = 15000;

export const request = async (path, token, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 — token expired or invalid
    if (response.status === 401) {
      localStorage.removeItem('ruvo_admin_token');
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.message || body?.error || `API Request failed (${response.status})`);
    }

    return body?.data ?? body;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw e;
  }
};
