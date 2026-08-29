/**
 * Banner & Hero Images
 */

import { cloudinary, transforms } from './index';

export const BANNERS = {
  // Home page hero banners
  homeHero1: cloudinary('v1/ruvo/banners/home-hero-1', transforms.hero),
  homeHero2: cloudinary('v1/ruvo/banners/home-hero-2', transforms.hero),
  homeHero3: cloudinary('v1/ruvo/banners/home-hero-3', transforms.hero),
  
  // Promotional banners
  promoGrocery: cloudinary('v1/ruvo/banners/promo-grocery', transforms.large),
  promoDelivery: cloudinary('v1/ruvo/banners/promo-delivery', transforms.large),
  promoShops: cloudinary('v1/ruvo/banners/promo-shops', transforms.large),
  
  // Shop banners (default/placeholder)
  shopDefault: cloudinary('v1/ruvo/banners/shop-default', transforms.large),
  shopGrocery: cloudinary('v1/ruvo/banners/shop-grocery', transforms.large),
  shopRestaurant: cloudinary('v1/ruvo/banners/shop-restaurant', transforms.large),
  shopPharmacy: cloudinary('v1/ruvo/banners/shop-pharmacy', transforms.large),
  
  // Onboarding banners
  onboardingCustomer1: cloudinary('v1/ruvo/banners/onboarding-customer-1', transforms.hero),
  onboardingCustomer2: cloudinary('v1/ruvo/banners/onboarding-customer-2', transforms.hero),
  onboardingCustomer3: cloudinary('v1/ruvo/banners/onboarding-customer-3', transforms.hero),
  
  onboardingShop1: cloudinary('v1/ruvo/banners/onboarding-shop-1', transforms.hero),
  onboardingShop2: cloudinary('v1/ruvo/banners/onboarding-shop-2', transforms.hero),
  onboardingShop3: cloudinary('v1/ruvo/banners/onboarding-shop-3', transforms.hero),
  
  onboardingPartner1: cloudinary('v1/ruvo/banners/onboarding-partner-1', transforms.hero),
  onboardingPartner2: cloudinary('v1/ruvo/banners/onboarding-partner-2', transforms.hero),
  onboardingPartner3: cloudinary('v1/ruvo/banners/onboarding-partner-3', transforms.hero),
  
  // Empty state banners
  emptyCart: cloudinary('v1/ruvo/banners/empty-cart', transforms.medium),
  emptyOrders: cloudinary('v1/ruvo/banners/empty-orders', transforms.medium),
  emptyProducts: cloudinary('v1/ruvo/banners/empty-products', transforms.medium),
  emptyDeliveries: cloudinary('v1/ruvo/banners/empty-deliveries', transforms.medium),
} as const;
