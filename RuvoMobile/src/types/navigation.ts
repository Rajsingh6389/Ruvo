import type { NavigatorScreenParams } from '@react-navigation/native';
import { ROUTES } from '../constants/routes';

export type MainTabParamList = {
  [ROUTES.HOME]: undefined;
  [ROUTES.MARKET]: undefined;
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
  ProductDetails: { productId: number };
  [ROUTES.REGISTER_SHOP]: undefined;
  [ROUTES.MY_SHOPS]: undefined;
  [ROUTES.ADD_PRODUCT]: { shopId: number };
  [ROUTES.ADMIN_DASHBOARD]: undefined;
  EditProfile: undefined;
};
