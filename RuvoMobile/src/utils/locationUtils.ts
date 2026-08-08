import axios from 'axios';

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { 'User-Agent': 'RuVoApp/1.0 (contact@ruvo.app)', 'Accept-Language': 'en-US,en;q=0.9' } }
    );
    if (response.data && response.data.display_name) {
      return response.data.display_name;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function getShortAddress(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { 'User-Agent': 'RuVoApp/1.0 (contact@ruvo.app)', 'Accept-Language': 'en-US,en;q=0.9' } }
    );
    if (response.data && response.data.display_name) {
      const parts = response.data.display_name.split(',').map((p: string) => p.trim());
      return parts.slice(0, 2).join(', ');
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
