import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
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
  if (Platform.OS !== 'android') return true;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location permission',
      message: 'RuVo uses your location to fill delivery address and nearby shops.',
      buttonNeutral: 'Ask me later',
      buttonNegative: 'Cancel',
      buttonPositive: 'Allow',
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function getCurrentPosition(): Promise<Geolocation.GeoPosition> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 8000,
    });
  });
}

export const DeliveryLocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
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

      const position = await getCurrentPosition();
      await applyGps(position.coords.latitude, position.coords.longitude, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch your location.');
    } finally {
      setIsLoading(false);
    }
  }, [applyGps]);

  const stopTracking = useCallback(() => {
    if (watchId.current != null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
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

    watchId.current = Geolocation.watchPosition(
      position => {
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
      err => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 12,
        interval: 4000,
        fastestInterval: 2000,
      },
    );
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
    // Load once on mount, then keep a live GPS watch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
