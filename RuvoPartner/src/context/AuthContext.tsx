import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export type User = {
  id: number;
  name: string;
  email: string;
  mobileNumber: string;
  role: string;
  isAvailable: boolean;
  walletBalance: number;
};

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  refreshTokenStr: string | null;
  userId: string | null;
  user: User | null;
  verificationStatus: string;
  login: (accessToken: string, refreshToken: string, userId: string, role: string, verificationStatus: string) => Promise<void>;
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
      const res = await fetch(`${API_BASE_URL}/api/partner/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
        if (data.data.verificationStatus) {
          setVerificationStatusState(data.data.verificationStatus);
          await AsyncStorage.setItem('verificationStatus', data.data.verificationStatus);
        }
      }
    } catch (err) {
      console.log('Error fetching partner profile:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
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
      } catch (err) {
        console.log('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (accessToken: string, newRefreshToken: string, newUserId: string, role: string, status: string) => {
    await AsyncStorage.setItem('authToken', accessToken);
    await AsyncStorage.setItem('refreshToken', newRefreshToken);
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
    } catch (err) {
      console.log('Error calling logout API:', err);
    }

    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('refreshToken');
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
        console.log('Access token expired, attempting silent refresh...');
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
          await AsyncStorage.setItem('authToken', newAccessToken);
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
          setToken(newAccessToken);
          setRefreshTokenStr(newRefreshToken);

          // Retry request with new token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          options.headers = headers;
          res = await fetch(url, options);
        } else {
          // Refresh token expired or invalid, force logout
          console.log('Refresh token expired, logging out user...');
          await logout();
        }
      } catch (err) {
        console.log('Error during silent token refresh:', err);
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
