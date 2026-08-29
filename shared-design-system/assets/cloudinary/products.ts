/**
 * Product Images
 */

import { cloudinary, transforms } from './index';

export const PRODUCTS = {
  // Placeholder products
  placeholderProduct: cloudinary('v1/ruvo/products/placeholder', transforms.card),
  placeholderGrocery: cloudinary('v1/ruvo/products/placeholder-grocery', transforms.card),
  placeholderFood: cloudinary('v1/ruvo/products/placeholder-food', transforms.card),
  placeholderElectronics: cloudinary('v1/ruvo/products/placeholder-electronics', transforms.card),
  
  // Product category headers
  groceryHeader: cloudinary('v1/ruvo/products/header-grocery', transforms.large),
  foodHeader: cloudinary('v1/ruvo/products/header-food', transforms.large),
  electronicsHeader: cloudinary('v1/ruvo/products/header-electronics', transforms.large),
  fashionHeader: cloudinary('v1/ruvo/products/header-fashion', transforms.large),
} as const;
