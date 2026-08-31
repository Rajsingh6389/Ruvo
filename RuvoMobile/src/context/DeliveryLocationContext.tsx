import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  composeFullAddress,
  geocodeAddress,
  geocodeDetails,
} from '../utils/locationUtils';

const STORAGE_KEY = '@ruvo_delivery_location';

export type AddressDetails = {
  house: string;
  street: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  receiverName: string;
  phone: string;
};

export type DeliveryLocation = {
  latitude: number;
  longitude: number;
  shortLabel: string;
  fullAddress: string;
  isCustomAddress: boolean;
  details: AddressDetails;
};

/** A precise, concise address for headers; never fall back to only the city. */
export const getDeliveryLocationLabel = (location: DeliveryLocation | null): string => {
  if (!location) return 'Set delivery location';
  const details = location.details;
  const preciseParts = [details.house, details.street, details.landmark && `Near ${details.landmark}`, details.area]
    .filter(Boolean);
  return preciseParts.join(', ') || location.fullAddress || location.shortLabel;
};

type DeliveryLocationContextData = {
  location: DeliveryLocation | null;
  isLoading: boolean;
  isTracking: boolean;
  error: string | null;
  refreshFromGps: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  saveAddress: (details: AddressDetails) => Promise<boolean>;
};

const emptyDetails = (): AddressDetails => ({
  house: '',
  street: '',
  landmark: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
  receiverName: '',
  phone: '',
});

const DeliveryLocationContext = createContext<DeliveryLocationContextData>(
  {} as DeliveryLocationContextData,
);

async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  } catch {
    return false;
  }
}

async function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
  if (!servicesEnabled) {
    throw new Error('Location services (GPS) are disabled on your device.');
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
  };
}

export const DeliveryLocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRef = useRef<DeliveryLocation | null>(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const persistLocation = useCallback(async (next: DeliveryLocation) => {
    setLocation(next);
    locationRef.current = next;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* Safe storage handling */
    }
  }, []);

  const applyGps = useCallback(
    async (latitude: number, longitude: number, keepManualFields = true) => {
      const geo = await geocodeDetails(latitude, longitude);
      const previous = locationRef.current;
      const previousDetails = previous?.details ?? emptyDetails();

      const details: AddressDetails = {
        house: keepManualFields ? previousDetails.house : geo.house,
        street: geo.street || previousDetails.street,
        landmark: keepManualFields ? previousDetails.landmark : geo.landmark,
        area: geo.area || previousDetails.area,
        city: geo.city || previousDetails.city,
        state: geo.state || previousDetails.state,
        pincode: geo.pincode || previousDetails.pincode,
        receiverName: previousDetails.receiverName,
        phone: previousDetails.phone,
      };

      const fullAddress = composeFullAddress(details) || geo.fullAddress;

      await persistLocation({
        latitude,
        longitude,
        shortLabel: geo.shortAddress || details.area || details.city || 'Current location',
        fullAddress,
        isCustomAddress: keepManualFields ? previous?.isCustomAddress ?? false : false,
        details,
      });
    },
    [persistLocation],
  );

  const refreshFromGps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const permitted = await requestLocationPermission();
      if (!permitted) {
        setError('Location permission is required to detect your address.');
        return;
      }

      const coords = await getCurrentPosition();
      await applyGps(coords.latitude, coords.longitude, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch your location.');
    } finally {
      setIsLoading(false);
    }
  }, [applyGps]);

  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (geocodeTimer.current) {
      clearTimeout(geocodeTimer.current);
      geocodeTimer.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(async () => {
    // If user saved a custom recipient address, do not track device movement
    if (locationRef.current?.isCustomAddress) {
      stopTracking();
      return;
    }

    const permitted = await requestLocationPermission();
    if (!permitted) {
      setError('Location permission is required to track your location.');
      return;
    }

    stopTracking();
    setIsTracking(true);
    setError(null);

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 15,
          timeInterval: 5000,
        },
        (position: Location.LocationObject) => {
          if (locationRef.current?.isCustomAddress) return;
          const { latitude, longitude } = position.coords;

          setLocation(prev =>
            prev
              ? { ...prev, latitude, longitude }
              : prev,
          );

          if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
          geocodeTimer.current = setTimeout(() => {
            if (!locationRef.current?.isCustomAddress) {
              applyGps(latitude, longitude, true).catch(() => {});
            }
          }, 1500);
        },
      );
      locationSubscription.current = sub;
    } catch (err: any) {
      setError(err?.message || 'Error tracking location');
    }
  }, [applyGps, stopTracking]);

  const saveAddress = useCallback(
    async (details: AddressDetails) => {
      const required = [details.house, details.area, details.city, details.pincode, details.phone];
      if (required.some(value => !value.trim())) {
        setError('Please fill house, area, city, pincode and phone.');
        return false;
      }

      if (details.phone.trim().length < 10) {
        setError('Please enter a valid 10-digit phone number.');
        return false;
      }

      if (details.pincode.trim().length < 6) {
        setError('Please enter a valid 6-digit pincode.');
        return false;
      }

      const fullAddress = composeFullAddress(details);
      const coordinates = await geocodeAddress(fullAddress);
      
      let finalLat: number;
      let finalLng: number;

      if (coordinates) {
        finalLat = coordinates.latitude;
        finalLng = coordinates.longitude;
      } else if (locationRef.current?.latitude && locationRef.current?.longitude) {
        // Fallback to current device coordinates if address forward-geocoding couldn't pinpoint exact building
        finalLat = locationRef.current.latitude;
        finalLng = locationRef.current.longitude;
      } else {
        setError('Could not locate this address. Please check city and pincode, then try again.');
        return false;
      }

      await persistLocation({
        latitude: finalLat,
        longitude: finalLng,
        shortLabel: [details.house, details.street, details.area].filter(Boolean).join(', ') || details.city,
        fullAddress,
        isCustomAddress: true,
        details,
      });

      stopTracking();
      setError(null);
      return true;
    },
    [persistLocation, stopTracking],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSavedLocation = async () => {
      let shouldRefreshCurrentLocation = true;

      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DeliveryLocation;
          if (!parsed.details) {
            parsed.details = emptyDetails();
          }
          shouldRefreshCurrentLocation = !parsed.isCustomAddress;
          if (!cancelled) {
            setLocation(parsed);
            setIsLoading(false);
          }
        } else {
          shouldRefreshCurrentLocation = true;
        }
      } catch {
        shouldRefreshCurrentLocation = true;
      }

      if (!cancelled && shouldRefreshCurrentLocation) {
        await refreshFromGps();
      }

      if (!cancelled && !shouldRefreshCurrentLocation) {
        setIsLoading(false);
      } else if (!cancelled) {
        startTracking();
      }
    };

    loadSavedLocation();
    return () => {
      cancelled = true;
      stopTracking();
    };
  }, []);

  return (
    <DeliveryLocationContext.Provider
      value={{
        location,
        isLoading,
        isTracking,
        error,
        refreshFromGps,
        startTracking,
        stopTracking,
        saveAddress,
      }}
    >
      {children}
    </DeliveryLocationContext.Provider>
  );
};

export const useDeliveryLocation = () => useContext(DeliveryLocationContext);
