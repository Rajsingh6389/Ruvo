export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  image?: string;
  variant?: string;
  category?: string;
  inStock?: boolean;
  shopId?: number;
  shopName?: string;
}
