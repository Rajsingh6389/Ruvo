import axios from 'axios';
import * as Location from 'expo-location';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDUhMspUQnPIjzOzzDNimx5vCP1-8HRGxQ';

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
    const house = [
      p.streetNumber,
      p.name && p.name !== p.street && p.name !== p.district ? p.name : '',
    ].filter(Boolean).join(' ');

    const street = p.street || p.subregion || '';
    const area = p.district || p.subregion || p.name || '';
    const city = p.city || p.subregion || p.region || '';
    const state = p.region || '';
    const pincode = p.postalCode || '';
    const landmark = p.name && p.name !== p.street && p.name !== house && p.name !== area ? p.name : '';

    const details = { house, street, area, city, state, pincode, landmark };
    const composed = composeFullAddress(details);
    const fallbackParts = [p.name, p.streetNumber, p.street, p.district, p.city, p.region, p.postalCode].filter(Boolean).join(', ');
    
    // Header short label: Priority to Building/House/Street or Area
    const short = [house || street || area, city].filter(Boolean).join(', ') || fallbackParts || 'Current location';

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
    const house = [
      address.house_number,
      address.building,
      address.house,
      address.apartment,
      address.office,
      address.complex,
    ].filter(Boolean).join(' ') || address.amenity || address.shop || '';

    const street = address.road || address.pedestrian || address.neighbourhood || address.residential || '';
    const area = address.suburb || address.village || address.hamlet || address.quarter || '';
    const city = address.city || address.town || address.county || address.municipality || '';
    const state = address.state || '';
    const pincode = address.postcode || '';
    const landmark = address.amenity || address.shop || address.historic || '';

    const details = { house, street, area, city, state, pincode, landmark };
    const composed = composeFullAddress(details);
    const shortAddress = [house || street || area, city].filter(Boolean).join(', ');

    return {
      ...details,
      fullAddress: data.display_name || composed,
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

export type LocationSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  details: GeocodedAddress;
};

/** Searches location suggestions live using Nominatim & Expo Geocoding APIs */
export async function searchLocationSuggestions(query: string): Promise<LocationSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const results: LocationSearchResult[] = [];

  // 1. Try Nominatim Search API
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: trimmed, format: 'json', limit: 5, addressdetails: 1, countrycodes: 'in' },
      headers: { 'User-Agent': 'RuVoMobileApp' },
      timeout: 5000,
    });

    if (Array.isArray(response.data)) {
      for (const item of response.data) {
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        const addr = item.address || {};
        const house = addr.house_number || addr.building || addr.amenity || addr.shop || '';
        const street = addr.road || addr.pedestrian || addr.suburb || '';
        const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.district || '';
        const city = addr.city || addr.town || addr.county || addr.state_district || '';
        const state = addr.state || '';
        const pincode = addr.postcode || '';
        const landmark = addr.amenity || addr.shop || addr.historic || '';

        const title = item.display_name.split(',')[0]?.trim() || area || city || 'Location Result';
        const subtitle = item.display_name.split(',').slice(1).join(', ').trim();

        results.push({
          id: item.place_id ? String(item.place_id) : `nom-${lat}-${lon}`,
          title,
          subtitle,
          latitude: lat,
          longitude: lon,
          details: {
            house,
            street,
            area,
            city,
            state,
            pincode,
            landmark,
            fullAddress: item.display_name,
            shortAddress: [title, city].filter(Boolean).join(', '),
          },
        });
      }
    }
  } catch {
    /* Fall through */
  }

  // 2. Expo Geocoding Fallback if Nominatim yields < 2 results
  if (results.length < 2) {
    try {
      const geoResults = await Location.geocodeAsync(trimmed);
      if (geoResults && geoResults.length > 0) {
        for (let i = 0; i < Math.min(geoResults.length, 3); i++) {
          const g = geoResults[i];
          const lat = g.latitude;
          const lon = g.longitude;

          // Perform reverse lookup for details
          const rev = await callExpoReverseGeocode(lat, lon);
          const title = rev?.shortAddress || trimmed;
          const subtitle = rev?.fullAddress || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

          results.push({
            id: `expo-${i}-${lat}-${lon}`,
            title,
            subtitle,
            latitude: lat,
            longitude: lon,
            details: rev || {
              ...emptyAddress(),
              fullAddress: subtitle,
              shortAddress: title,
              city: trimmed,
            },
          });
        }
      }
    } catch {
      /* Safe fallback */
    }
  }

  return results;
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

