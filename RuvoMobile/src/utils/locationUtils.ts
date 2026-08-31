import axios from 'axios';
import * as Location from 'expo-location';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBDZpXzgOnYwCbVvWnvrorVmlqi5cbIXRY';

export type GeocodedAddress = {
  fullAddress: string;
  shortAddress: string;
  house: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
};

export type GeocodedCoordinates = {
  latitude: number;
  longitude: number;
};

function emptyAddress(): GeocodedAddress {
  return {
    fullAddress: '',
    shortAddress: '',
    house: '',
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  };
}

function composeFullAddress(parts: Omit<GeocodedAddress, 'fullAddress' | 'shortAddress'>): string {
  return [
    parts.house,
    parts.street,
    parts.landmark ? `Near ${parts.landmark}` : '',
    parts.area,
    parts.city,
    parts.state,
    parts.pincode,
  ]
    .map(value => (value || '').trim())
    .filter(Boolean)
    .join(', ');
}

/** 1. Primary reverse geocoder: Device native geocoding via Expo Location */
async function callExpoReverseGeocode(lat: number, lon: number): Promise<GeocodedAddress | null> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (!places || places.length === 0) return null;

    const p = places[0];
    const house = [p.streetNumber, p.name && p.name !== p.street ? p.name : ''].filter(Boolean).join(' ');
    const street = p.street || p.subregion || '';
    const area = p.district || p.subregion || p.name || '';
    const city = p.city || p.subregion || p.region || '';
    const state = p.region || '';
    const pincode = p.postalCode || '';
    const landmark = p.name && p.name !== p.street && p.name !== house ? p.name : '';

    const details = { house, street, area, city, state, pincode, landmark };
    const composed = composeFullAddress(details);
    const fallbackParts = [p.name, p.street, p.subregion, p.city, p.region, p.postalCode].filter(Boolean).join(', ');
    const short = [area || city, state].filter(Boolean).join(', ') || p.city || 'Current location';

    return {
      ...details,
      fullAddress: composed || fallbackParts || 'Current location',
      shortAddress: short,
    };
  } catch {
    return null;
  }
}

/** 2. Fallback reverse geocoder: OpenStreetMap Nominatim */
async function callNominatim(lat: number, lon: number): Promise<GeocodedAddress | null> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'RuVoMobileApp' }, timeout: 6000 },
    );

    const data = response.data;
    if (!data || !data.address) return null;

    const address = data.address;
    const house = [address.house_number, address.building].filter(Boolean).join(' ');
    const street = address.road || address.pedestrian || address.neighbourhood || '';
    const area = address.suburb || address.village || address.hamlet || '';
    const city = address.city || address.town || address.county || '';
    const state = address.state || '';
    const pincode = address.postcode || '';
    const landmark = address.amenity || address.shop || '';
    const shortAddress = [area || city, state].filter(Boolean).join(', ');

    const details = { house, street, area, city, state, pincode, landmark };
    return {
      ...details,
      fullAddress: data.display_name || composeFullAddress(details),
      shortAddress: shortAddress || data.display_name.split(',').slice(0, 2).join(', '),
    };
  } catch {
    return null;
  }
}

/** 3. Optional reverse geocoder: Google Maps API (silent failure handling) */
async function callGoogleGeocoding(lat: number, lon: number): Promise<GeocodedAddress | null> {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`,
      { timeout: 6000 },
    );
    if (response.data?.status !== 'OK' || !response.data?.results?.[0]) return null;

    const result = response.data.results[0];
    const components: any[] = result.address_components || [];
    const get = (type: string) =>
      components.find((c: any) => c.types.includes(type))?.long_name ?? '';

    const house = get('street_number') || get('premise');
    const street = get('route') || get('sublocality_level_2');
    const area = get('sublocality_level_1') || get('neighborhood');
    const city = get('locality') || get('administrative_area_level_2');
    const state = get('administrative_area_level_1');
    const pincode = get('postal_code');
    const landmark = get('point_of_interest') || get('establishment');
    const details = { house, street, area, city, state, pincode, landmark };

    return {
      ...details,
      fullAddress: result.formatted_address as string,
      shortAddress: [area || city, state].filter(Boolean).join(', ') ||
        (result.formatted_address as string).split(',').slice(0, 2).join(', '),
    };
  } catch {
    return null;
  }
}

/** Resolves coordinates to a structured address using native geocoding -> Nominatim -> Google fallback. */
export async function geocodeDetails(lat: number, lon: number): Promise<GeocodedAddress> {
  // 1. Try Expo native reverse geocoding
  const expoResult = await callExpoReverseGeocode(lat, lon);
  if (expoResult) return expoResult;

  // 2. Fallback to OpenStreetMap Nominatim
  const nominatimResult = await callNominatim(lat, lon);
  if (nominatimResult) return nominatimResult;

  // 3. Optional fallback to Google Geocoding
  const googleResult = await callGoogleGeocoding(lat, lon);
  if (googleResult) return googleResult;

  // 4. Safe fallback using coordinates
  return {
    ...emptyAddress(),
    fullAddress: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    shortAddress: 'Current location',
  };
}

/** Converts a recipient-entered delivery address to coordinates for serviceability checks. */
export async function geocodeAddress(address: string): Promise<GeocodedCoordinates | null> {
  const query = address.trim();
  if (!query) return null;

  // 1. Try Expo native forward geocoding
  try {
    const results = await Location.geocodeAsync(query);
    if (results && results.length > 0) {
      const { latitude, longitude } = results[0];
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch {
    /* Fall through to secondary geocoders */
  }

  // 2. Try OpenStreetMap Nominatim search
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'in' },
      headers: { 'User-Agent': 'RuVoMobileApp' },
      timeout: 6000,
    });
    const place = response.data?.[0];
    const latitude = Number(place?.lat);
    const longitude = Number(place?.lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  } catch {
    /* Fall through to Google */
  }

  // 3. Try Google Maps API (silently handles errors)
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      { params: { address: query, key: GOOGLE_MAPS_API_KEY }, timeout: 6000 },
    );
    if (response.data?.status === 'OK') {
      const point = response.data?.results?.[0]?.geometry?.location;
      if (Number.isFinite(point?.lat) && Number.isFinite(point?.lng)) {
        return { latitude: point.lat, longitude: point.lng };
      }
    }
  } catch {
    /* Ignore errors */
  }

  return null;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const result = await geocodeDetails(lat, lon);
  return result.fullAddress || null;
}

export async function getShortAddress(lat: number, lon: number): Promise<string | null> {
  const result = await geocodeDetails(lat, lon);
  return result.shortAddress || null;
}

export async function getPincode(lat: number, lon: number): Promise<string | null> {
  const result = await geocodeDetails(lat, lon);
  return result.pincode || null;
}

export { composeFullAddress, emptyAddress };
