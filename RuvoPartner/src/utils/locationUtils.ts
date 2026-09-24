import Constants from 'expo-constants';

const MAPS_API_KEY: string =
  (Constants.expoConfig?.extra as any)?.googleMapsApiKey ||
  'AIzaSyDUhMspUQnPIjzOzzDNimx5vCP1-8HRGxQ';

export async function googleReverseGeocode(lat: number, lng: number) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_API_KEY}&language=en`;
    const res  = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK' || !json.results?.length) return null;
    const best = json.results[0];
    const comps: Record<string, string> = {};
    for (const c of best.address_components ?? []) {
      for (const t of c.types) comps[t] = c.long_name;
    }
    const streetParts = [
      comps['street_number'],
      comps['route'],
      comps['sublocality_level_2'],
      comps['sublocality_level_1'] || comps['sublocality'],
      comps['neighborhood'],
    ].filter(Boolean);
    return {
      address : streetParts.join(', ') || comps['premise'] || '',
      city    : comps['locality'] || comps['administrative_area_level_2'] || '',
      state   : comps['administrative_area_level_1'] || '',
      pincode : comps['postal_code'] || '',
    };
  } catch { return null; }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const enc = encodeURIComponent(`${address}, India`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${enc}&key=${MAPS_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' && json.results?.length > 0) {
      return json.results[0].geometry.location; // { lat, lng }
    }
  } catch (err) {}
  return null;
}
