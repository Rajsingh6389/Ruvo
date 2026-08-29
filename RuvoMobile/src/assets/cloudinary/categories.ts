// Category Image Assets — correct images per category
// All sourced from Cloudinary

export const CATEGORY_IMAGES = {
  // Grocery / fresh produce
  grocery:    'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessorybag.jpg',
  vegetables: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/freshproducebasket.jpg',
  fruits:     'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/freshproducebasket.jpg',
  cafe:       'https://res.cloudinary.com/qbm45y5k/image/upload/v1787828141/0858b8b6-7274-4c08-9d69-5256a5d3ce9b.png',
  dairy:      'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/dailygrocessories.jpg',
  grains:     'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg',
  snacks:     'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/dailygrocessories.jpg',
  beverages:  'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg',
  household:  'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessorybag.jpg',

  // Fashion
  fashion:    'https://res.cloudinary.com/qbm45y5k/image/upload/v1787658265/2edf3092-007f-4ba8-9d48-fa225c845713.png',

  // Electronics — use the provided URL
  electronics: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787657146/ce1254b8-af09-41a6-b5a7-003d3db58941.png',

  // More / General
  more:       'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg',
} as const;

// Home screen category list — shown in the horizontal carousel
export const CATEGORIES = [
  {
    id: 'grocery',
    label: 'Grocery',
    image: CATEGORY_IMAGES.grocery,
  },
  {
    id: 'fashion',
    label: 'Fashion',
    image: CATEGORY_IMAGES.fashion,
  },
  {
    id: 'electronics',
    label: 'Electronics',
    image: CATEGORY_IMAGES.electronics,
  },
    {
    id: 'fruits',
    label: 'Fruits',
    image: CATEGORY_IMAGES.fruits,
  },
  { id: 'cafe',
    label: 'Cafe',
    image: CATEGORY_IMAGES.cafe,
  },

  {
    id: 'more',
    label: 'More',
    image: CATEGORY_IMAGES.more,
  },
] as const;

// Helper: given a category string from the backend shop,
// return the best matching image URL (case-insensitive substring match)
export function getCategoryImage(category: string): string | null {
  if (!category) return null;
  const lower = category.toLowerCase();

  const exactMatch = Object.entries(CATEGORY_IMAGES).find(
    ([key]) => lower === key,
  );
  if (exactMatch) return exactMatch[1];

  const partialMatch = Object.entries(CATEGORY_IMAGES).find(
    ([key]) => lower.includes(key) || key.includes(lower),
  );
  if (partialMatch) return partialMatch[1];

  return null;
}
