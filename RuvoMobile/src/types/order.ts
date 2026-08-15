export interface Order {
  id?: number;
  userId: string;
  shopId: number;
  productId: number;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
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
  createdAt?: string;
  updatedAt?: string;
}
