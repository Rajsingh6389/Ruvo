/**
 * Partner / Delivery Images
 */

import { cloudinary, transforms } from './index';

export const PARTNER = {
  // Partner illustrations
  deliveryScooter: cloudinary('v1/ruvo/partner/delivery-scooter', transforms.large),
  deliveryBike: cloudinary('v1/ruvo/partner/delivery-bike', transforms.large),
  deliveryMotorcycle: cloudinary('v1/ruvo/partner/delivery-motorcycle', transforms.large),
  deliveryCar: cloudinary('v1/ruvo/partner/delivery-car', transforms.large),
  
  // Partner hero images
  partnerHero: cloudinary('v1/ruvo/partner/hero', transforms.hero),
  earningsHero: cloudinary('v1/ruvo/partner/earnings-hero', transforms.large),
  deliveryHero: cloudinary('v1/ruvo/partner/delivery-hero', transforms.large),
  
  // Partner onboarding
  onboardingVehicle: cloudinary('v1/ruvo/partner/onboarding-vehicle', transforms.large),
  onboardingDocuments: cloudinary('v1/ruvo/partner/onboarding-documents', transforms.large),
  onboardingReady: cloudinary('v1/ruvo/partner/onboarding-ready', transforms.large),
  
  // Partner empty states
  noDeliveries: cloudinary('v1/ruvo/partner/no-deliveries', transforms.medium),
  noEarnings: cloudinary('v1/ruvo/partner/no-earnings', transforms.medium),
  offline: cloudinary('v1/ruvo/partner/offline', transforms.medium),
  
  // Partner success states
  deliverySuccess: cloudinary('v1/ruvo/partner/delivery-success', transforms.medium),
  earnedReward: cloudinary('v1/ruvo/partner/earned-reward', transforms.medium),
  levelUp: cloudinary('v1/ruvo/partner/level-up', transforms.medium),
  
  // Vehicle types
  vehicleScooter: cloudinary('v1/ruvo/partner/vehicle-scooter', transforms.small),
  vehicleBike: cloudinary('v1/ruvo/partner/vehicle-bike', transforms.small),
  vehicleMotorcycle: cloudinary('v1/ruvo/partner/vehicle-motorcycle', transforms.small),
  vehicleCar: cloudinary('v1/ruvo/partner/vehicle-car', transforms.small),
} as const;
