export interface OrderItem {
  id?: number;
  productId: number;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  price?: number;
  unit?: string;
}

export interface Order {
  id?: number;
  userId: string;
  shopId: number;
  productId: number;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  items?: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  couponDiscount?: number;
  distanceKm?: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus?: string;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryPartnerId?: number | null;
  deliveryOtpHash?: string;
  deliveryOtpVerified?: boolean;
  shopResponseDeadline?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  shopName?: string;
  shopLogoUrl?: string;
  shopLatitude?: number;
  shopLongitude?: number;
  createdAt?: string;
  updatedAt?: string;
}
