/**
 * Centralized API configuration.
 * 
 * - For Physical Android Phone plugged via USB: 'http://localhost:8080' (via 'adb reverse tcp:8080 tcp:8080')
 * - For Android Emulator:                       'http://10.0.2.2:8080' or 'http://localhost:8080' with adb reverse
 */
export const API_BASE_URL = "http://172.18.6.198:8080";
