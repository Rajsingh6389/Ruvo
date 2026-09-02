/**
 * Centralized API configuration.
 *
 * Set the production API URL via:
 *   - app.json  →  expo.extra.apiBaseUrl
 *   - EAS Update environment variable: EXPO_PUBLIC_API_BASE_URL
 *
 * For local development:
 *   - Physical Android Phone (USB):  'http://localhost:8080' (with adb reverse tcp:8080 tcp:8080)
 *   - Android Emulator:              'http://10.0.2.2:8080'
 *   - Same Wi-Fi as backend:         'http://<your-lan-ip>:8080'
 */
import Constants from 'expo-constants';

const EXTRA = Constants.expoConfig?.extra ?? (Constants as any).__config__?.extra;

const ENV_URL =
  typeof (globalThis as any).process !== 'undefined'
    ? (globalThis as any).process.env?.EXPO_PUBLIC_API_BASE_URL
    : undefined;

/** Change this to your development machine's LAN IP when running the backend locally. */
// const DEV_FALLBACK = 'http://192.168.1.10:8080';
// const DEV_FALLBACK = 'http://10.12.231.159:8080';


const DEV_FALLBACK = 'http://192.168.1.6:8080';

export const API_BASE_URL: string = __DEV__
  ? (ENV_URL || DEV_FALLBACK)
  : (ENV_URL || EXTRA?.apiBaseUrl || '');

if (!API_BASE_URL) {
  console.error(
    'RuVo: API_BASE_URL is not configured for production. ' +
    'Set expo.extra.apiBaseUrl in app.json or EXPO_PUBLIC_API_BASE_URL environment variable.'
  );
}
console.log('[RuVoShop] API_BASE_URL:', API_BASE_URL);
