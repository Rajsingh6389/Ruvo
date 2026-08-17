import axios from 'axios';

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
    .map(value => value.trim())
    .filter(Boolean)
    .join(', ');
}

async function callNominatim(lat: number, lon: number): Promise<GeocodedAddress | null> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'RuVoMobileApp' }, timeout: 8000 },
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

async function callGoogleGeocoding(lat: number, lon: number): Promise<GeocodedAddress | null> {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`,
      { timeout: 8000 },
    );

    if (!response.data?.results?.[0]) return await callNominatim(lat, lon);

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
    return await callNominatim(lat, lon);
  }
}

export async function geocodeDetails(lat: number, lon: number): Promise<GeocodedAddress> {
  const result = await callGoogleGeocoding(lat, lon);
  return result ?? {
    ...emptyAddress(),
    fullAddress: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    shortAddress: 'Current location',
  };
}

/** Converts a recipient-entered delivery address to coordinates for serviceability checks. */
export async function geocodeAddress(address: string): Promise<GeocodedCoordinates | null> {
  const query = address.trim();
  if (!query) return null;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      { params: { address: query, key: GOOGLE_MAPS_API_KEY }, timeout: 8000 },
    );
    const point = response.data?.results?.[0]?.geometry?.location;
    if (Number.isFinite(point?.lat) && Number.isFinite(point?.lng)) {
      return { latitude: point.lat, longitude: point.lng };
    }
  } catch { /* Fall through to the public geocoder. */ }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'in' },
      headers: { 'User-Agent': 'RuVoMobileApp' },
      timeout: 8000,
    });
    const place = response.data?.[0];
    const latitude = Number(place?.lat);
    const longitude = Number(place?.lon);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null;
  } catch {
    return null;
  }
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
