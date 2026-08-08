export const ROUTES = {
  // Root
  SPLASH: 'Splash',
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  MAIN_TABS: 'MainTabs',

  // Bottom Tabs
  HOME: 'Home',
  MARKET: 'Market',
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',

  // Home Stack – services
  GROCERIES: 'Groceries',
  JOBS: 'Jobs',

  // Marketplace Stack
  NEARBY_SHOPS: 'NearbyShops',
  SHOP_DETAILS: 'ShopDetails',
  PRODUCT_DETAILS: 'ProductDetails',
  REGISTER_SHOP: 'RegisterShop',
  MY_SHOPS: 'MyShops',
  ADD_PRODUCT: 'AddProduct',
  
  // Admin
  ADMIN_DASHBOARD: 'AdminDashboard',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteName = (typeof ROUTES)[RouteKey];
