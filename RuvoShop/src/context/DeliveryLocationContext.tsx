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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

      const fullAddress =
        composeFullAddress(details) || geo.fullAddress;

      await persistLocation({
        latitude,
        longitude,
        shortLabel: geo.shortAddress || details.area || details.city || 'Current location',
        fullAddress,
        isCustomAddress: Boolean(details.house || details.landmark),
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
        setError('Location permission is needed to fill your address.');
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
    const permitted = await requestLocationPermission();
    if (!permitted) {
      setError('Location permission is needed to track your position.');
      return;
    }

    stopTracking();
    setIsTracking(true);
    setError(null);

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 12,
          timeInterval: 4000,
        },
        (position: Location.LocationObject) => {
          const { latitude, longitude } = position.coords;
          setLocation(prev =>
            prev
              ? { ...prev, latitude, longitude }
              : prev,
          );

          if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
          geocodeTimer.current = setTimeout(() => {
            applyGps(latitude, longitude, true).catch(() => {});
          }, 1200);
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

      const previous = locationRef.current;
      const fullAddress = composeFullAddress(details);
      await persistLocation({
        latitude: previous?.latitude ?? 0,
        longitude: previous?.longitude ?? 0,
        shortLabel: details.area || details.city || details.house,
        fullAddress,
        isCustomAddress: true,
        details,
      });
      setError(null);
      return true;
    },
    [persistLocation],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSavedLocation = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DeliveryLocation;
          if (!parsed.details) {
            parsed.details = emptyDetails();
          }
          if (!cancelled) {
            setLocation(parsed);
            setIsLoading(false);
          }
        } else {
          await refreshFromGps();
        }
      } catch {
        await refreshFromGps();
      }

      if (!cancelled) {
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
