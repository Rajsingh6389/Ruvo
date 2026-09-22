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

        if (storedToken && (!storedRole || storedRole.toUpperCase() === requiredRole.toUpperCase())) {
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
    if (role && role.toUpperCase() !== requiredRole.toUpperCase()) {
      throw new Error(`This app requires a ${requiredRole} session.`);
    }

    // Store token securely
    await SecureStore.setItemAsync('authToken', newToken);
    await AsyncStorage.multiSet([
      ['userId', String(newUserId)],
      ['userRole', role || requiredRole],
    ]);

    setToken(newToken);
    setUserId(String(newUserId));
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
  // GLOBAL FETCH INTERCEPTOR FOR 401
  // =========================================================
  const logoutRef = React.useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    const originalFetch = globalThis.fetch;
    // @ts-ignore - React Native DOM fetch signature variance on global interceptor
    globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
        const initInfo = args[1] as RequestInit | undefined;
        let skipGlobal = false;
        if (initInfo?.headers) {
          if (typeof (initInfo.headers as any).get === 'function') {
            skipGlobal = (initInfo.headers as any).get('X-Skip-Global-401') === 'true' || (initInfo.headers as any).get('x-skip-global-401') === 'true';
          } else if (typeof initInfo.headers === 'object') {
            skipGlobal = (initInfo.headers as any)['X-Skip-Global-401'] === 'true' || (initInfo.headers as any)['x-skip-global-401'] === 'true';
          }
        }

        const isAuthRoute = url.includes('/api/auth/') || url.includes('/auth/me');

        let hasAuth = false;
        if (initInfo?.headers) {
          if (typeof (initInfo.headers as any).get === 'function') {
            hasAuth = !!(initInfo.headers as any).get('Authorization') || !!(initInfo.headers as any).get('authorization');
          } else if (typeof initInfo.headers === 'object') {
            hasAuth = !!(initInfo.headers as any)['Authorization'] || !!(initInfo.headers as any)['authorization'];
          }
        }

        // Only logout if it's a 401 on an authenticated business route (not auth/me, not login/verify, not with skip flag)
        if (response.status === 401 && !skipGlobal && !isAuthRoute && hasAuth) {
          console.warn('[Auth] Protected API returned 401 Unauthorized with auth header. Logging out.');
          logoutRef.current();
        }
      } catch (e) {
        // Safe failover
      }
      return response;
    };
    return () => {
      globalThis.fetch = originalFetch;
    };
  }, []);

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
