// Hero Banner Assets
// Used in HomeScreen hero carousel and promotional sections

export const RUVO_BANNERS = {
  // Main hero banners for home screen
  fastDelivery: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637144/scootywithruvogrocessory.jpg',
  freshProduce: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/freshproducebasket.jpg',
  dailyEssentials: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/grocessoriesbasket.jpg',
  qualityGuaranteed: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1787637143/freshgrocesssory.jpg',
  shopOnboard: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1788799375/ChatGPT_Image_Sep_7_2026_10_11_59_PM.png',
  partnerOnboard: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1788799444/4ebac18d-5a03-4c16-bce2-4d6992e86c07.png',
  firstOrderOffer: 'https://res.cloudinary.com/qbm45y5k/image/upload/v1788799268/CouponCode100rdAbove299.png',
} as const;

export const getOnboardBanners = () => [
  {
    image: RUVO_BANNERS.shopOnboard,
   
  },
  {
    image: RUVO_BANNERS.partnerOnboard,
   
  },
];

export const getFirstOrderBanners = () => [
  {
    image: RUVO_BANNERS.firstOrderOffer,
  }
];

export const getStandardBanners = () => [
  {
    image: RUVO_BANNERS.fastDelivery,
    title: 'Lightning Delivery',
    subtitle: 'Groceries at your door in 10 minutes flat.',
  },
  {
    image: RUVO_BANNERS.freshProduce,
    title: 'Farm Fresh Produce',
    subtitle: 'Handpicked daily for absolute perfection.',
  },
  {
    image: RUVO_BANNERS.dailyEssentials,
    title: 'Everyday Essentials',
    subtitle: 'Restock your pantry with premium selections.',
  },
  {
    image: RUVO_BANNERS.qualityGuaranteed,
    title: 'RuVo Quality Select',
    subtitle: '100% satisfaction guaranteed on all items.',
  },
];
