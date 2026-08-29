import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getUserProfile, User } from '../services/userService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  userId: string | null;
  user: User | null;
  requiredRole: string;

  login: (
    token: string,
    userId: string,
    role: string
  ) => Promise<void>;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({
  children,
  requiredRole = 'USER',
}: {
  children: ReactNode;
  requiredRole?: string;
}) => {
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [token, setToken] =
    useState<string | null>(null);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [user, setUser] =
    useState<User | null>(null);

  // =========================================================
  // FETCH USER PROFILE
  // =========================================================

  const fetchUser = async (authToken: string) => {
    try {
      const profile = await getUserProfile(authToken);
      setUser(profile);
    } catch {
      // Don't logout the user just because profile request failed.
      setUser(null);
    }
  };

  // =========================================================
  // INITIALIZE AUTHENTICATION
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Read token from SecureStore (with one-time migration from AsyncStorage)
        let storedToken = await SecureStore.getItemAsync('authToken');
        if (!storedToken) {
          storedToken = await AsyncStorage.getItem('authToken');
          if (storedToken) {
            await SecureStore.setItemAsync('authToken', storedToken);
            await AsyncStorage.removeItem('authToken');
          }
        }

        const storedUserId =
          await AsyncStorage.getItem('userId');

        const storedRole =
          await AsyncStorage.getItem('userRole');

        if (!mounted) return;

        if (storedToken && storedRole === requiredRole) {
          // Restore authentication immediately
          setToken(storedToken);
          setUserId(storedUserId);
          setIsAuthenticated(true);

          // IMPORTANT:
          // Stop the startup loader immediately.
          // Don't wait for backend profile request.
          setIsLoading(false);

          // Fetch profile in background
          if (requiredRole === 'USER') fetchUser(storedToken);
        } else {
          // No saved login
          setToken(null);
          setUserId(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } catch {
        if (!mounted) return;

        setToken(null);
        setUserId(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // LOGIN
  // =========================================================

  const login = async (
    newToken: string,
    newUserId: string,
    role: string
  ): Promise<void> => {
    if (role !== requiredRole) throw new Error(`This app requires a ${requiredRole} session.`);

    // Store token securely
    await SecureStore.setItemAsync('authToken', newToken);
    await AsyncStorage.multiSet([
      ['userId', newUserId],
      ['userRole', role],
    ]);

    setToken(newToken);
    setUserId(newUserId);
    setIsAuthenticated(true);

    // Login is already successful.
    // Don't keep AppNavigator in loading state.
    setIsLoading(false);

    // Load profile in background — don't block login completion
    if (requiredRole === 'USER') fetchUser(newToken);
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await AsyncStorage.multiRemove([
        'userId',
        'userRole',
      ]);
    } catch {
      // Ignore storage clear errors during logout
    } finally {
      setToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (token && requiredRole === 'USER') await fetchUser(token);
  };

  // =========================================================
  // CONTEXT
  // =========================================================

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        userId,
        user,
        requiredRole,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =========================================================
// useAuth HOOK
// =========================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};
