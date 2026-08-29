/**
 * Category Icons & Images
 */

import { cloudinary, transforms } from './index';

export const CATEGORIES = {
  // Main service categories
  groceries: cloudinary('v1/ruvo/categories/groceries', transforms.small),
  food: cloudinary('v1/ruvo/categories/food', transforms.small),
  pharmacy: cloudinary('v1/ruvo/categories/pharmacy', transforms.small),
  electronics: cloudinary('v1/ruvo/categories/electronics', transforms.small),
  fashion: cloudinary('v1/ruvo/categories/fashion', transforms.small),
  home: cloudinary('v1/ruvo/categories/home', transforms.small),
  beauty: cloudinary('v1/ruvo/categories/beauty', transforms.small),
  sports: cloudinary('v1/ruvo/categories/sports', transforms.small),
  books: cloudinary('v1/ruvo/categories/books', transforms.small),
  toys: cloudinary('v1/ruvo/categories/toys', transforms.small),
  
  // Grocery subcategories
  fruits: cloudinary('v1/ruvo/categories/fruits', transforms.small),
  vegetables: cloudinary('v1/ruvo/categories/vegetables', transforms.small),
  dairy: cloudinary('v1/ruvo/categories/dairy', transforms.small),
  bakery: cloudinary('v1/ruvo/categories/bakery', transforms.small),
  beverages: cloudinary('v1/ruvo/categories/beverages', transforms.small),
  snacks: cloudinary('v1/ruvo/categories/snacks', transforms.small),
  meat: cloudinary('v1/ruvo/categories/meat', transforms.small),
  seafood: cloudinary('v1/ruvo/categories/seafood', transforms.small),
  
  // Service categories
  localJobs: cloudinary('v1/ruvo/categories/local-jobs', transforms.small),
  delivery: cloudinary('v1/ruvo/categories/delivery', transforms.small),
  services: cloudinary('v1/ruvo/categories/services', transforms.small),
} as const;
