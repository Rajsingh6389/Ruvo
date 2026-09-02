export type Shop = {
  id: number;
  name: string;
  category: string;
  description?: string;
  minOrderAmount?: number;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  image?: string;
  imageUrl?: string;
  logoUrl?: string;
  bannerUrl?: string;
  verified?: boolean;
  deliveryAvailable?: boolean;
  deliveryTime?: string;
  status?: string;
  approved?: boolean;
  ownerId?: string;
};

export type ShopInput = {
  name: string;
  category: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  rating?: number;
  // optional fields matching backend model
  bannerUrl?: string;
  logoUrl?: string;
  owner?: string;
  ownerId?: string;
  deliveryAvailable?: boolean;
  openingTime?: string; // ISO time string
  closingTime?: string;
  upiId?: string;
};
