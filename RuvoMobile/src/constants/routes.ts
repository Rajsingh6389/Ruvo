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
  CHECKOUT: 'Checkout',
  ORDER_HISTORY: 'OrderHistory',

  // Admin
  ADMIN_DASHBOARD: 'AdminDashboard',

  // Cart
  CART: 'Cart',
  ORDER_SUCCESS: 'OrderSuccess',
  CUSTOMER_TRACKING: 'CustomerTracking',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteName = (typeof ROUTES)[RouteKey];
