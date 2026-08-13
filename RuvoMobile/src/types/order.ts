export interface Order {
  id?: number;
  userId: string;
  shopId: number;
  productId: number;
  productName: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus?: string;
  deliveryAddress: string;
  createdAt?: string;
  updatedAt?: string;
}
