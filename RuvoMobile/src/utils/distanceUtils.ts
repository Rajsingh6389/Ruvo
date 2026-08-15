import type { Shop } from '../types';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export const getDistanceInKm = (
  location: Coordinates,
  shop: Pick<Shop, 'latitude' | 'longitude'>,
): number | null => {
  const latitude = Number(shop.latitude);
  const longitude = Number(shop.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const latitudeDifference = toRadians(latitude - location.latitude);
  const longitudeDifference = toRadians(longitude - location.longitude);
  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(location.latitude)) *
      Math.cos(toRadians(latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    6371 * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation))
  );
};

export const formatDistance = (distanceKm: number | null): string | null => {
  if (distanceKm === null) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
};
