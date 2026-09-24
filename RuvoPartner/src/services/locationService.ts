export const locationService = {
  reverseGeocode: async (lat: number, lng: number) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'RuvoApp/1.0' },
    });
    if (!res.ok) throw new Error('Failed to retrieve location');
    return res.json();
  }
};
