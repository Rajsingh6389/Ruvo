import { API_BASE_URL } from '../config/api';

export async function globalSearch(
  query: string,
  limit: number,
  token?: string | null,
  latitude?: number,
  longitude?: number,
) {
  const params = new URLSearchParams({
    query: query.trim(),
    limit: limit.toString(),
  });

  if (latitude && longitude) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }

  const res = await fetch(`${API_BASE_URL}/api/search?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Search failed');
  }

  return data;
}
