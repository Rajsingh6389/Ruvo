/**
 * Shared category list for RuVo — single source of truth.
 *
 * IMPORTANT: These strings are stored in the DB as-is.
 * Never change the spelling without also migrating existing DB rows.
 * Filtering in NearbyShopsScreen depends on exact case-sensitive match
 * between the shop's `category` column and these values.
 */

export const PRODUCT_CATEGORIES: string[] = [
  'Grocery',
  'Fruits & Vegetables',
  'Snacks',
  'Personal Care',
  'Household',
  'Stationery',
  'Pharmacy',
  'Electronics',
  'Cafe',
  'General Store',
  'Other',
];

/**
 * Shop-level categories used in RegisterShopScreen.
 * Must be a subset / superset of PRODUCT_CATEGORIES where the
 * spelling is identical — this is what's stored in shops.category.
 *
 * RuvoMobile's category filter (NearbyShopsScreen) calls
 * GET /api/shops/category/{categoryName} using these exact strings.
 */
export const SHOP_CATEGORIES: string[] = PRODUCT_CATEGORIES;
