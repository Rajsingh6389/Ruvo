/**
 * Custom Icon Assets
 * For cases where Ionicons isn't sufficient
 */

import { cloudinary, transforms } from './index';

export const ICONS = {
  // Brand
  ruvoLogo: cloudinary('v1/ruvo/icons/ruvo-logo', 'c_scale,w_200'),
  ruvoLogoSmall: cloudinary('v1/ruvo/icons/ruvo-logo-small', 'c_scale,w_100'),
  ruvoIcon: cloudinary('v1/ruvo/icons/ruvo-icon', 'c_scale,w_100'),
  ruvoSymbol: cloudinary('v1/ruvo/icons/ruvo-symbol', 'c_scale,w_80'),
  
  // App icons
  ruvoMobileIcon: cloudinary('v1/ruvo/icons/ruvo-mobile', 'c_scale,w_120'),
  ruvoShopIcon: cloudinary('v1/ruvo/icons/ruvo-shop', 'c_scale,w_120'),
  ruvoPartnerIcon: cloudinary('v1/ruvo/icons/ruvo-partner', 'c_scale,w_120'),
  
  // Payment methods
  upi: cloudinary('v1/ruvo/icons/payment-upi', 'c_scale,w_80'),
  card: cloudinary('v1/ruvo/icons/payment-card', 'c_scale,w_80'),
  cash: cloudinary('v1/ruvo/icons/payment-cash', 'c_scale,w_80'),
  wallet: cloudinary('v1/ruvo/icons/payment-wallet', 'c_scale,w_80'),
  
  // Social
  whatsapp: cloudinary('v1/ruvo/icons/social-whatsapp', 'c_scale,w_60'),
  telegram: cloudinary('v1/ruvo/icons/social-telegram', 'c_scale,w_60'),
  facebook: cloudinary('v1/ruvo/icons/social-facebook', 'c_scale,w_60'),
  instagram: cloudinary('v1/ruvo/icons/social-instagram', 'c_scale,w_60'),
  twitter: cloudinary('v1/ruvo/icons/social-twitter', 'c_scale,w_60'),
  
  // Verification
  verifiedBadge: cloudinary('v1/ruvo/icons/verified-badge', 'c_scale,w_60'),
  premiumBadge: cloudinary('v1/ruvo/icons/premium-badge', 'c_scale,w_60'),
  trustBadge: cloudinary('v1/ruvo/icons/trust-badge', 'c_scale,w_60'),
} as const;
