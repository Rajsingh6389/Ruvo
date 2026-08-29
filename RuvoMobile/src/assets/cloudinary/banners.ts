// Hero Banner Assets
// Used in HomeScreen hero carousel and promotional sections

export const RUVO_BANNERS = {
  // Main hero banners for home screen
  fastDelivery: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637144/scootywithruvogrocessory.jpg',
  freshProduce: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/freshproducebasket.jpg',
  dailyEssentials: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg',
  qualityGuaranteed: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/freshgrocesssory.jpg',
} as const;

// Helper function to get all hero banners with metadata
export const getHeroBanners = () => [
  {
    image: RUVO_BANNERS.fastDelivery,
    title: 'Fast Delivery',
    subtitle: 'Get groceries delivered in minutes',
  },
  {
    image: RUVO_BANNERS.freshProduce,
    title: 'Fresh Produce',
    subtitle: 'Farm fresh fruits & vegetables',
  },
  {
    image: RUVO_BANNERS.dailyEssentials,
    title: 'Daily Essentials',
    subtitle: 'Everything you need, every day',
  },
  {
    image: RUVO_BANNERS.qualityGuaranteed,
    title: 'Quality Guaranteed',
    subtitle: 'Best quality products selected',
  },
];
