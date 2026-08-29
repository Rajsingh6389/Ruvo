// Cloudinary Image URLs for RuVo Mobile App
// Organized by category for easy management

export const CLOUDINARY_URLS = {
  // ── Hero Banners ──────────────────────────────────────────────────────────
  heroBanners: {
    fastDelivery: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637144/scootywithruvogrocessory.jpg',
    freshProduce: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/freshproducebasket.jpg',
    dailyEssentials: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg',
    qualityGuaranteed: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/freshgrocesssory.jpg',
  },

  // ── Grocery Images ────────────────────────────────────────────────────────
  grocery: {
    groceryBag: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessorybag.jpg',
    groceriesInBag: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesinbag.jpg',
    dailyGroceries: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/dailygrocessories.jpg',
    groceriesBasket: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg',
    groceriesInBag2: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoresinbag.jpg',
  },

  // ── Placeholder for future categories ─────────────────────────────────────
  // categories: {
  //   fruits: 'https://res.cloudinary.com/qbm45y5k/image/upload/...',
  //   vegetables: 'https://res.cloudinary.com/qbm45y5k/image/upload/...',
  //   dairy: 'https://res.cloudinary.com/qbm45y5k/image/upload/...',
  // },

  // ── Shop Banners ──────────────────────────────────────────────────────────
  // shopBanners: {
  //   bikanerWallah: 'https://res.cloudinary.com/qbm45y5k/image/upload/...',
  // },
};

// Helper function to get all hero banner URLs as an array
export const getHeroBannerUrls = () => [
  {
    image: CLOUDINARY_URLS.heroBanners.fastDelivery,
    title: 'Fast Delivery',
    subtitle: 'Get groceries delivered in minutes',
  },
  {
    image: CLOUDINARY_URLS.heroBanners.freshProduce,
    title: 'Fresh Produce',
    subtitle: 'Farm fresh fruits & vegetables',
  },
  {
    image: CLOUDINARY_URLS.heroBanners.dailyEssentials,
    title: 'Daily Essentials',
    subtitle: 'Everything you need, every day',
  },
  {
    image: CLOUDINARY_URLS.heroBanners.qualityGuaranteed,
    title: 'Quality Guaranteed',
    subtitle: 'Best quality products selected',
  },
];
