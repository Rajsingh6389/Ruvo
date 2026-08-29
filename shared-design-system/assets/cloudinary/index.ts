/**
 * RuVo Cloudinary Assets
 * 
 * Centralized image asset management for all RuVo apps
 * Replace placeholder URLs with actual Cloudinary URLs
 */

const CLOUDINARY_BASE = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload';

/**
 * Helper to construct Cloudinary URLs with transformations
 */
export const cloudinary = (path: string, transformations?: string) => {
  if (transformations) {
    return `${CLOUDINARY_BASE}/${transformations}/${path}`;
  }
  return `${CLOUDINARY_BASE}/${path}`;
};

/**
 * Common transformations
 */
export const transforms = {
  /** Thumbnail - 150x150 */
  thumb: 'c_thumb,w_150,h_150,g_face',
  /** Small - 300px width */
  small: 'c_scale,w_300',
  /** Medium - 600px width */
  medium: 'c_scale,w_600',
  /** Large - 1200px width */
  large: 'c_scale,w_1200',
  /** Avatar - 100x100 circular */
  avatar: 'c_thumb,w_100,h_100,g_face,r_max',
  /** Hero - 1600px width */
  hero: 'c_scale,w_1600,q_auto,f_auto',
  /** Card - 400x300 */
  card: 'c_fill,w_400,h_300,g_auto',
};

export * from './banners';
export * from './shops';
export * from './products';
export * from './categories';
export * from './partner';
export * from './illustrations';
export * from './icons';
