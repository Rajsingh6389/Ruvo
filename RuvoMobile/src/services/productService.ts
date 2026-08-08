import { API_BASE_URL } from '../config/api';

// ──────────────────────────────────────────────────────────
// Product interface — matches the Spring Boot Product entity
// ──────────────────────────────────────────────────────────
export interface Product {
  id?: number;
  shopId: number;
  name: string;
  category: string;
  brandName?: string;
  description?: string;
  actualPrice: number;
  sellingPrice: number;
  discount?: number;
  stockQuantity: number;
  unit?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

async function parseOrThrow(res: Response) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body?.message ?? (typeof body === 'string' ? body : 'Request failed');
    throw new Error(message);
  }
  return body;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getProductsByShop(
  shopId: number | string,
  token: string,
): Promise<Product[]> {

  const url = `${API_BASE_URL}/api/products/shop/${shopId}`;

  console.log('PRODUCT API URL:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  console.log('PRODUCT API STATUS:', res.status);

  const data = await parseOrThrow(res);

  return Array.isArray(data) ? data : [];
}

// ──────────────────────────────────────────────────────────
// GET — all products for a shop (includes unavailable ones)
// ──────────────────────────────────────────────────────────
// ────────────────────────────────────────────────
// POST — add product (JSON, no image)
// ──────────────────────────────────────────────────────────
export async function addProduct(
  product: Product,
  token: string,
): Promise<Product> {

  const url = `${API_BASE_URL}/api/products`;

  console.log('1️⃣ ADD PRODUCT URL:', url);
  console.log('2️⃣ PRODUCT DATA:', product);
  console.log('3️⃣ TOKEN EXISTS:', !!token);

  try {
    console.log('4️⃣ Sending POST request...');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify(product),
    });

    console.log('5️⃣ RESPONSE STATUS:', res.status);
    console.log('6️⃣ RESPONSE OK:', res.ok);

    const data = await parseOrThrow(res);

    console.log('7️⃣ PRODUCT CREATED:', data);

    return data;
  } catch (error) {
    console.log('❌ ADD PRODUCT ERROR:', error);
    throw error;
  }
}

// ──────────────────────────────────────────────────────────
// POST — upload product with image (multipart)
// ──────────────────────────────────────────────────────────
// export async function uploadProduct(
//   formData: FormData,
//   token: string,
// ): Promise<Product> {
//   const res = await fetch(`${API_BASE_URL}/api/products/upload`, {
//     method: 'POST',
//     headers: authHeaders(token),
//     body: formData,
//   });
//   return parseOrThrow(res);
// }

export async function uploadProduct(
  formData: FormData,
  token: string,
): Promise<Product> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      'POST',
      `${API_BASE_URL}/api/products/upload`,
    );

    xhr.setRequestHeader(
      'Authorization',
      `Bearer ${token}`,
    );

    xhr.setRequestHeader(
      'Accept',
      'application/json',
    );

    xhr.onload = () => {
      console.log('UPLOAD STATUS:', xhr.status);
      console.log('UPLOAD RESPONSE:', xhr.responseText);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid server response'));
        }
      } else {
        reject(
          new Error(
            `Upload failed: ${xhr.status} ${xhr.responseText}`,
          ),
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading image'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Image upload timed out'));
    };

    xhr.timeout = 30000;

    xhr.send(formData);
  });
}
// ──────────────────────────────────────────────────────────
// PUT — update product (JSON, no image)
// ──────────────────────────────────────────────────────────
export async function updateProduct(
  productId: number,
  product: Partial<Product>,
  token: string,
): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(product),
  });
  return parseOrThrow(res);
}

// ──────────────────────────────────────────────────────────
// PUT — update product with new image (multipart)
// ──────────────────────────────────────────────────────────
export async function updateProductWithImage(
  productId: number,
  formData: FormData,
  token: string,
): Promise<Product> {
  const res = await fetch(
    `${API_BASE_URL}/api/products/upload/${productId}`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: formData,
    },
  );
  return parseOrThrow(res);
}

// ──────────────────────────────────────────────────────────
// PATCH — toggle availability
// ──────────────────────────────────────────────────────────
export async function updateAvailability(
  productId: number,
  available: boolean,
  token: string,
): Promise<Product> {
  const res = await fetch(
    `${API_BASE_URL}/api/products/${productId}/availability?available=${available}`,
    {
      method: 'PATCH',
      headers: authHeaders(token),
    },
  );
  return parseOrThrow(res);
}

// ──────────────────────────────────────────────────────────
// DELETE — permanently delete a product
// ──────────────────────────────────────────────────────────
export async function deleteProduct(
  productId: number,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? (typeof body === 'string' ? body : 'Request failed');
    throw new Error(message);
  }
}
