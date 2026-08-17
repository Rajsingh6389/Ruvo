import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
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
      console.log('RuVo: Fetching user profile...');

      const profile = await getUserProfile(authToken);

      console.log('RuVo: User profile loaded');

      setUser(profile);
    } catch (error) {
      console.log(
        'RuVo: Failed to fetch user profile:',
        error
      );

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
      console.log('RuVo: Initializing authentication...');

      try {
        const storedToken =
          await AsyncStorage.getItem('authToken');

        const storedUserId =
          await AsyncStorage.getItem('userId');

        const storedRole =
          await AsyncStorage.getItem('userRole');

        console.log(
          'RuVo: Token:',
          storedToken ? 'FOUND' : 'NOT FOUND'
        );

        console.log(
          'RuVo: User ID:',
          storedUserId || 'NOT FOUND'
        );

        console.log(
          'RuVo: Role:',
          storedRole || 'NOT FOUND'
        );

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
      } catch (error) {
        console.log(
          'RuVo: Authentication initialization error:',
          error
        );

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
    try {
      if (role !== requiredRole) throw new Error(`This app requires a ${requiredRole} session.`);
      await AsyncStorage.multiSet([
        ['authToken', newToken],
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
    } catch (error) {
      console.log(
        'RuVo: Login state error:',
        error
      );

      throw error;
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        'authToken',
        'userId',
        'userRole',
      ]);
    } catch (error) {
      console.log(
        'RuVo: Error clearing auth storage:',
        error
      );
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
