import type { NavigatorScreenParams } from '@react-navigation/native';
import { ROUTES } from '../constants/routes';

export type MainTabParamList = {
  [ROUTES.HOME]: undefined;
  [ROUTES.MARKET]: undefined;
  [ROUTES.CART]: undefined;
  [ROUTES.PROFILE]: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Groceries: undefined;
  Jobs: undefined;
  NearbyShops: undefined;
  ShopDetails: { shopId: number };
  ProductDetails: { product: Product };
  Checkout: { product?: Product; quantity?: number; fromCart?: boolean };
  OrderHistory: undefined;
  [ROUTES.REGISTER_SHOP]: undefined;
  [ROUTES.ADMIN_DASHBOARD]: undefined;
  EditProfile: undefined;
  Cart: undefined;
  OrderSuccess: { orderId: number };
  CustomerTracking: { orderId: number };
};
