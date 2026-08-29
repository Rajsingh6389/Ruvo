/**
 * General Illustrations & Graphics
 */

import { cloudinary, transforms } from './index';

export const ILLUSTRATIONS = {
  // Authentication
  welcome: cloudinary('v1/ruvo/illustrations/welcome', transforms.large),
  login: cloudinary('v1/ruvo/illustrations/login', transforms.large),
  register: cloudinary('v1/ruvo/illustrations/register', transforms.large),
  otp: cloudinary('v1/ruvo/illustrations/otp', transforms.medium),
  success: cloudinary('v1/ruvo/illustrations/success', transforms.medium),
  verified: cloudinary('v1/ruvo/illustrations/verified', transforms.medium),
  
  // Empty states
  emptyBox: cloudinary('v1/ruvo/illustrations/empty-box', transforms.medium),
  noData: cloudinary('v1/ruvo/illustrations/no-data', transforms.medium),
  noResults: cloudinary('v1/ruvo/illustrations/no-results', transforms.medium),
  noConnection: cloudinary('v1/ruvo/illustrations/no-connection', transforms.medium),
  
  // Error states
  error404: cloudinary('v1/ruvo/illustrations/error-404', transforms.large),
  error500: cloudinary('v1/ruvo/illustrations/error-500', transforms.large),
  errorGeneric: cloudinary('v1/ruvo/illustrations/error-generic', transforms.medium),
  maintenance: cloudinary('v1/ruvo/illustrations/maintenance', transforms.large),
  
  // Success states
  orderSuccess: cloudinary('v1/ruvo/illustrations/order-success', transforms.large),
  paymentSuccess: cloudinary('v1/ruvo/illustrations/payment-success', transforms.medium),
  deliverySuccess: cloudinary('v1/ruvo/illustrations/delivery-success', transforms.medium),
  
  // Loading states
  loading: cloudinary('v1/ruvo/illustrations/loading', transforms.medium),
  processing: cloudinary('v1/ruvo/illustrations/processing', transforms.medium),
  
  // Features
  location: cloudinary('v1/ruvo/illustrations/location', transforms.medium),
  map: cloudinary('v1/ruvo/illustrations/map', transforms.medium),
  tracking: cloudinary('v1/ruvo/illustrations/tracking', transforms.medium),
  notification: cloudinary('v1/ruvo/illustrations/notification', transforms.medium),
  search: cloudinary('v1/ruvo/illustrations/search', transforms.medium),
  filter: cloudinary('v1/ruvo/illustrations/filter', transforms.medium),
  
  // Commerce
  shopping: cloudinary('v1/ruvo/illustrations/shopping', transforms.large),
  cart: cloudinary('v1/ruvo/illustrations/cart', transforms.medium),
  checkout: cloudinary('v1/ruvo/illustrations/checkout', transforms.medium),
  payment: cloudinary('v1/ruvo/illustrations/payment', transforms.medium),
  delivery: cloudinary('v1/ruvo/illustrations/delivery', transforms.medium),
  
  // Business
  analytics: cloudinary('v1/ruvo/illustrations/analytics', transforms.large),
  growth: cloudinary('v1/ruvo/illustrations/growth', transforms.medium),
  revenue: cloudinary('v1/ruvo/illustrations/revenue', transforms.medium),
  report: cloudinary('v1/ruvo/illustrations/report', transforms.medium),
  
  // Social
  profile: cloudinary('v1/ruvo/illustrations/profile', transforms.medium),
  community: cloudinary('v1/ruvo/illustrations/community', transforms.medium),
  support: cloudinary('v1/ruvo/illustrations/support', transforms.medium),
  help: cloudinary('v1/ruvo/illustrations/help', transforms.medium),
} as const;
