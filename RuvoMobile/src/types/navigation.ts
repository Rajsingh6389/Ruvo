import { ROUTES } from '../constants/routes';

export type MainTabParamList = {
  [ROUTES.HOME]: undefined;
  [ROUTES.NEARBY_SHOPS]: { category?: string } | undefined;
  [ROUTES.CART]: undefined;
  [ROUTES.LOCAL_JOBS]: undefined;
  [ROUTES.PROFILE]: undefined;
};

export type RootStackParamList = {
  // Auth
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  // Tabs root
  MainTabs: undefined;
  // Tab screens (also navigable as stack for deep links)
  Home: undefined;
  NearbyShops: { category?: string } | undefined;
  Cart: undefined;
  LocalJobs: undefined;
  Profile: undefined;
  // Stack screens
  Groceries: undefined;
  Jobs: undefined;
  Cafe: undefined;
  Nearbycafe: undefined;
  ShopDetails: { shopId: number };
  ProductDetails: { product: any };
  Checkout: { product?: any; quantity?: number; fromCart?: boolean };
  OrderHistory: undefined;
  RegisterShop: undefined;
  AdminDashboard: undefined;
  EditProfile: undefined;
  OrderSuccess: { orderId: number };
  CustomerTracking: { orderId: number };
  PaymentFailure: undefined;
  Market: undefined;
};
