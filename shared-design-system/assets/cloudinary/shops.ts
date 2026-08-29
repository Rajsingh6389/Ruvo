/**
 * Shop & Store Images
 */

import { cloudinary, transforms } from './index';

export const SHOPS = {
  // Default shop images
  logoDefault: cloudinary('v1/ruvo/shops/logo-default', transforms.avatar),
  bannerDefault: cloudinary('v1/ruvo/shops/banner-default', transforms.large),
  
  // Shop category images
  groceryIcon: cloudinary('v1/ruvo/shops/category-grocery', transforms.small),
  restaurantIcon: cloudinary('v1/ruvo/shops/category-restaurant', transforms.small),
  pharmacyIcon: cloudinary('v1/ruvo/shops/category-pharmacy', transforms.small),
  electronicsIcon: cloudinary('v1/ruvo/shops/category-electronics', transforms.small),
  fashionIcon: cloudinary('v1/ruvo/shops/category-fashion', transforms.small),
  homeIcon: cloudinary('v1/ruvo/shops/category-home', transforms.small),
  beautyIcon: cloudinary('v1/ruvo/shops/category-beauty', transforms.small),
  sportsIcon: cloudinary('v1/ruvo/shops/category-sports', transforms.small),
  
  // Shop illustrations
  shopSetup: cloudinary('v1/ruvo/shops/illustration-setup', transforms.medium),
  shopDashboard: cloudinary('v1/ruvo/shops/illustration-dashboard', transforms.medium),
  shopOrders: cloudinary('v1/ruvo/shops/illustration-orders', transforms.medium),
  shopProducts: cloudinary('v1/ruvo/shops/illustration-products', transforms.medium),
  shopAnalytics: cloudinary('v1/ruvo/shops/illustration-analytics', transforms.medium),
} as const;
