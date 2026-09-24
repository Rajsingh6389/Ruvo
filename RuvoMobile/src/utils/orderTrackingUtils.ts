import { API_BASE_URL } from '../config/api';

export type TrackingMode = 'MAP' | 'PROMOTIONS';

export type PartnerLocation = {
  latitude: number;
  longitude: number;
};

export type PartnerInfo = {
  id?: number;
  name: string;
  phone: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
};

export const ACTIVE_STATUSES = [
  'SHOP_PENDING',
  'SHOP_ACCEPTED',
  'DELIVERY_ASSIGNMENT',
  'DELIVERY_ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
];

export const CANCELLED_STATUSES = [
  'SHOP_REJECTED',
  'CANCELLED',
  'SHOP_CANCELLED',
  'SHOP_TIMEOUT',
  'CANCELLED_SHOP_TIMEOUT',
  'CANCELLED_BY_SHOP',
  'CANCELLED_BY_USER',
  'CANCELLED_NO_PARTNER_FOUND',
  'FAILED',
  'PAYMENT_FAILED',
  'REJECTED',
];

export const TRACKING_STEPS = [
  {
    key: 'ORDER_PLACED',
    title: 'Order placed',
    description: 'We received your order',
    icon: 'receipt-outline',
  },
  {
    key: 'SHOP_ACCEPTED',
    title: 'Shop accepted',
    description: 'Your order is being prepared',
    icon: 'storefront-outline',
  },
  {
    key: 'DELIVERY_ASSIGNED',
    title: 'Partner assigned',
    description: 'A delivery partner is assigned',
    icon: 'person-outline',
  },
  {
    key: 'OUT_FOR_DELIVERY',
    title: 'Out for delivery',
    description: 'Your order is on the way',
    icon: 'bicycle-outline',
  },
  {
    key: 'DELIVERED',
    title: 'Delivered',
    description: 'Order delivered successfully',
    icon: 'checkmark-circle-outline',
  },
] as const;

export const PROMO_BANNERS = [
  {
    id: '1',
    title: 'Fresh groceries from local shops',
    subtitle: 'Get daily essentials delivered quickly.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: '2',
    title: 'Support local sellers',
    subtitle: 'Every order helps your neighborhood businesses.',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=1000',
  },
];

export function isCancelledStatus(status?: string) {
  return CANCELLED_STATUSES.includes(status || '');
}

export function getTrackingStage(status?: string) {
  switch (status) {
    case 'ORDER_PLACED':
    case 'SHOP_PENDING':
      return 0;

    case 'SHOP_ACCEPTED':
    case 'PREPARING':
    case 'READY':
      return 1;

    case 'DELIVERY_ASSIGNMENT':
    case 'DELIVERY_ASSIGNED':
      return 2;

    case 'PICKED_UP':
    case 'OUT_FOR_DELIVERY':
      return 3;

    case 'DELIVERED':
      return 4;

    default:
      return 0;
  }
}

export function isLiveStatus(status?: string) {
  return (
    status === 'PICKED_UP' ||
    status === 'OUT_FOR_DELIVERY'
  );
}

export function getStatusText(status?: string) {
  switch (status) {
    case 'ORDER_PLACED':
    case 'SHOP_PENDING':
      return {
        title: 'Order placed',
        subtitle: 'Waiting for the shop to accept your order',
        icon: 'receipt-outline',
      };

    case 'SHOP_ACCEPTED':
    case 'PREPARING':
    case 'READY':
      return {
        title: 'Preparing your order',
        subtitle: 'The shop is getting your items ready',
        icon: 'restaurant-outline',
      };

    case 'DELIVERY_ASSIGNMENT':
    case 'DELIVERY_ASSIGNED':
      return {
        title: 'Partner assigned',
        subtitle: 'Your delivery partner is getting ready',
        icon: 'person-outline',
      };

    case 'PICKED_UP':
    case 'OUT_FOR_DELIVERY':
      return {
        title: 'Out for delivery',
        subtitle: 'Your order is on the way',
        icon: 'bicycle-outline',
      };

    case 'DELIVERED':
      return {
        title: 'Delivered',
        subtitle: 'Your order was delivered successfully',
        icon: 'checkmark-circle-outline',
      };

    default:
      return {
        title: 'Processing order',
        subtitle: 'We are processing your order',
        icon: 'time-outline',
      };
  }
}

export function formatProductImageUrl(url?: string): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  return `${API_BASE_URL}${
    trimmed.startsWith('/') ? '' : '/'
  }${trimmed}`;
}
