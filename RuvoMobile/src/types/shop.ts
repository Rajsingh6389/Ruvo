export type Shop = {
  id: number;
  name: string;
  category: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  logoUrl?: string;
  bannerUrl?: string;
  deliveryAvailable?: boolean;
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
  deliveryAvailable?: boolean;
  openingTime?: string; // ISO time string
  closingTime?: string;
};
