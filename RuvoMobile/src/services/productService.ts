import { API_BASE_URL } from '../config/api';

export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  shopId: number;
}

async function parseOrThrow(res: Response) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.message ?? (typeof body === 'string' ? body : 'Request failed');
    throw new Error(message);
  }
  return body;
}

export async function getProductsByShop(shopId: number | string): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/api/products/shop/${shopId}`);
  return parseOrThrow(res);
}

export async function addProduct(product: Product, token: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });
  return parseOrThrow(res);
}

export async function deleteProduct(productId: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
     const body = await res.json().catch(() => null);
     const message = body?.message ?? 'Request failed';
     throw new Error(message);
  }
}
