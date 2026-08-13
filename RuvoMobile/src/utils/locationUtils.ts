import axios from 'axios';

// Google Maps API key (same key used for react-native-maps in AndroidManifest)
const GOOGLE_MAPS_API_KEY = 'AIzaSyBDZpXzgOnYwCbVvWnvrorVmlqi5cbIXRY';

interface GeocodedAddress {
  fullAddress: string;    // Complete address with pincode
  shortAddress: string;   // Locality + district only
  pincode: string | null;
}

async function callNominatim(lat: number, lon: number): Promise<GeocodedAddress | null> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'RuVoMobileApp' }, timeout: 8000 }
    );
    const data = response.data;
    if (!data || !data.address) return null;

    const address = data.address;
    const pincode = address.postcode || null;
    const locality = address.city || address.town || address.village || address.suburb || null;
    const district = address.county || address.state_district || null;
    
    // Build short address
    const shortParts = [locality, district].filter(Boolean);
    const shortAddress = shortParts.length > 0
      ? shortParts.join(', ')
      : data.display_name.split(',').slice(0, 2).join(', ');

    return { 
      fullAddress: data.display_name, 
      shortAddress, 
      pincode 
    };
  } catch (err) {
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
      components.find((c: any) => c.types.includes(type))?.long_name ?? null;

    const pincode = get('postal_code');
    const locality = get('locality') || get('sublocality_level_1');
    const district = get('administrative_area_level_2');
    const state = get('administrative_area_level_1');

    const fullAddress = result.formatted_address as string;

    const shortParts = [locality, district].filter(Boolean);
    const shortAddress = shortParts.length > 0
      ? shortParts.join(', ')
      : fullAddress.split(',').slice(0, 2).join(', ');

    return { fullAddress, shortAddress, pincode };
  } catch (error) {
    // If Google fails (network error, CORS, 403 quota), fallback
    return await callNominatim(lat, lon);
  }
}

/** Returns the full formatted address including pincode */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const result = await callGoogleGeocoding(lat, lon);
    return result?.fullAddress ?? null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/** Returns a short "Locality, District" style address */
export async function getShortAddress(lat: number, lon: number): Promise<string | null> {
  try {
    const result = await callGoogleGeocoding(lat, lon);
    return result?.shortAddress ?? null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/** Returns pincode only */
export async function getPincode(lat: number, lon: number): Promise<string | null> {
  try {
    const result = await callGoogleGeocoding(lat, lon);
    return result?.pincode ?? null;
  } catch (error) {
    console.error('Pincode lookup error:', error);
    return null;
  }
}
