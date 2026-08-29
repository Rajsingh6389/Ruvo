import { API_BASE_URL } from '../config/api';

/**
 * Turns whatever the backend put in an image field into something `<Image>` can
 * actually load.
 *
 * The API returns a mix: absolute URLs for externally hosted media, and
 * server-relative paths like `/uploads/products/12.jpg` for anything uploaded
 * through it. Three screens had their own private copy of this helper
 * (`formatImageUrl` in ShopDetails, `formatProductImageUrl` in OrderHistory),
 * and the screens that lacked one silently failed to render relative paths.
 *
 * Returns `undefined` for a missing or blank value so callers can hand the
 * result straight to `SmartImage`, which renders its placeholder for that case.
 */
export const resolveImageUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('data:') || trimmed.startsWith('file:')) return trimmed;

  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

/** `{ uri }` for `SmartImage`/`Image`, or `undefined` when there is no image. */
export const imageSource = (url?: string | null): { uri: string } | undefined => {
  const resolved = resolveImageUrl(url);
  return resolved ? { uri: resolved } : undefined;
};
