import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';
import { partnerService, PartnerProfile } from '../services/partnerService';

export type User = {
  userId: number;
  name: string;
  mobileNumber: string;
  verificationStatus: string;
  adminReason?: string | null;
  vehicle?: PartnerProfile['vehicle'];
  isAvailable?: boolean;
};

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  refreshTokenStr: string | null;
  userId: string | null;
  user: User | null;
  verificationStatus: string;
  login: (accessToken: string, refreshToken: string | null, userId: string, role: string, verificationStatus: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setVerificationStatus: (status: string) => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenStr, setRefreshTokenStr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [verificationStatus, setVerificationStatusState] = useState<string>('NEW');

  const setVerificationStatus = async (status: string) => {
    setVerificationStatusState(status);
    await AsyncStorage.setItem('verificationStatus', status);
  };

  const fetchProfile = async (authToken: string) => {
    try {
      const profile = await partnerService.profile(authToken);
      let isAvailable: boolean | undefined;
      try { isAvailable = (await partnerService.account(authToken)).isAvailable; } catch { /* Central OTP sessions do not use legacy account sessions. */ }
      setUser({ ...profile, isAvailable });
      if (profile.verificationStatus) {
        setVerificationStatusState(profile.verificationStatus);
        await AsyncStorage.setItem('verificationStatus', profile.verificationStatus);
      }
    } catch { /* Retain the cached session state when offline. */ }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        let storedToken = await SecureStore.getItemAsync('authToken');
        let storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
        // One-time migration for sessions created by older app versions.
        if (!storedToken) {
          storedToken = await AsyncStorage.getItem('authToken');
          storedRefreshToken = await AsyncStorage.getItem('refreshToken');
          if (storedToken) {
            await SecureStore.setItemAsync('authToken', storedToken);
            if (storedRefreshToken) await SecureStore.setItemAsync('refreshToken', storedRefreshToken);
            await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
          }
        }
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedRole = await AsyncStorage.getItem('userRole');
        const storedStatus = await AsyncStorage.getItem('verificationStatus');

        if (storedToken && storedRole === 'DELIVERY_PARTNER') {
          setToken(storedToken);
          setRefreshTokenStr(storedRefreshToken);
          setUserId(storedUserId);
          if (storedStatus) {
            setVerificationStatusState(storedStatus);
          }
          setIsAuthenticated(true);
          fetchProfile(storedToken);
        }
      } catch {
        // Auth initialization failed silently
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (accessToken: string, newRefreshToken: string | null, newUserId: string, role: string, status: string) => {
    if (role !== 'DELIVERY_PARTNER') {
      throw new Error('This mobile number is registered as a customer account. Sign in with a delivery-partner mobile number or ask Ruvo support to convert your account.');
    }
    await SecureStore.setItemAsync('authToken', accessToken);
    if (newRefreshToken) await SecureStore.setItemAsync('refreshToken', newRefreshToken);
    else await SecureStore.deleteItemAsync('refreshToken');
    await AsyncStorage.setItem('userId', newUserId);
    await AsyncStorage.setItem('userRole', role);
    await AsyncStorage.setItem('verificationStatus', status);
    
    setToken(accessToken);
    setRefreshTokenStr(newRefreshToken);
    setUserId(newUserId);
    setVerificationStatusState(status);
    setIsAuthenticated(true);
    await fetchProfile(accessToken);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/partner/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch { /* Local session cleanup must still complete. */ }

    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('verificationStatus');

    setToken(null);
    setRefreshTokenStr(null);
    setUserId(null);
    setUser(null);
    setVerificationStatusState('NEW');
    setIsAuthenticated(false);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  // Helper to handle Token Expiry & Silent Refresh
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let headers: any = options.headers || {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    options.headers = headers;

    let res = await fetch(url, options);

    // If 401 Unauthorized, token might have expired, try refreshing
    if (res.status === 401 && refreshTokenStr) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/partner/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: refreshTokenStr }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.data.accessToken;
          const newRefreshToken = refreshData.data.refreshToken;

          // Save new tokens
          await SecureStore.setItemAsync('authToken', newAccessToken);
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);
          setToken(newAccessToken);
          setRefreshTokenStr(newRefreshToken);

          // Retry request with new token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          options.headers = headers;
          res = await fetch(url, options);
        } else {
          // Refresh token expired or invalid, force logout
          await logout();
        }
      } catch (err) {
        await logout();
      }
    }

    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        refreshTokenStr,
        userId,
        user,
        verificationStatus,
        login,
        logout,
        refreshProfile,
        setVerificationStatus,
        authenticatedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
