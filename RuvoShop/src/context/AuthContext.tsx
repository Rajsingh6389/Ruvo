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
import { checkHasShop } from '../services/shopService';


// ── Onboarding status values ─────────────────────────────────────────────────
// NEW                  → show Step 1 (shop details)
// AADHAAR_PENDING      → show Step 2 (Aadhaar)
// BANK_PENDING         → show Step 3 (bank)
// FEE_PENDING          → show Step 4 (onboarding fee ₹0)
// SHOP_SELECT_PENDING  → show Step 5 (shop visibility confirmation)
// PENDING_APPROVAL     → show approval waiting screen (polls for admin approval)
// APPROVED             → open main app
export type OnboardingStatus = 'NEW' | 'AADHAAR_PENDING' | 'BANK_PENDING' | 'FEE_PENDING' | 'SHOP_SELECT_PENDING' | 'PENDING_APPROVAL' | 'APPROVED';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  userId: string | null;
  user: User | null;
  requiredRole: string;
  onboardingStatus: OnboardingStatus;

  login: (token: string, userId: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingStatus: (status: OnboardingStatus) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
  children,
  requiredRole = 'SHOP_OWNER',
}: {
  children: ReactNode;
  requiredRole?: string;
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);
  const [token,           setToken]           = useState<string | null>(null);
  const [userId,          setUserId]          = useState<string | null>(null);
  const [user,            setUser]            = useState<User | null>(null);
  const [onboardingStatus, setOnboardingStatusState] =
    useState<OnboardingStatus>('NEW');

  // ── persist onboarding status ──────────────────────────────────────────────
  const setOnboardingStatus = async (status: OnboardingStatus) => {
    setOnboardingStatusState(status);
    await AsyncStorage.setItem('shopOnboardingStatus', status);
  };

  // ── fetch user profile ─────────────────────────────────────────────────────
  const fetchUser = async (authToken: string) => {
    try {
      const profile = await getUserProfile(authToken);
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  // ── initialize from storage ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        let storedToken = await SecureStore.getItemAsync('authToken');
        if (!storedToken) {
          storedToken = await AsyncStorage.getItem('authToken');
          if (storedToken) {
            await SecureStore.setItemAsync('authToken', storedToken);
            await AsyncStorage.removeItem('authToken');
          }
        }

        const storedUserId   = await AsyncStorage.getItem('userId');
        const storedRole     = await AsyncStorage.getItem('userRole');
        const storedStatus   = await AsyncStorage.getItem('shopOnboardingStatus') as OnboardingStatus | null;

        if (!mounted) return;

        if (storedToken && storedRole === requiredRole) {
          setToken(storedToken);
          setUserId(storedUserId);
          setIsAuthenticated(true);
          // If we have a valid session but no saved onboarding status,
          // the user completed onboarding in a prior install — default to
          // APPROVED so they land in the main app, not Step 1.
          setOnboardingStatusState(storedStatus ?? 'APPROVED');
          setIsLoading(false);
          if (requiredRole === 'USER') fetchUser(storedToken);
        } else {
          // Stale or mismatched session — clear everything so the user
          // is sent to Login rather than landing on a broken state.
          if (storedToken) {
            await SecureStore.deleteItemAsync('authToken').catch(() => {});
            await AsyncStorage.multiRemove(['userId', 'userRole', 'shopOnboardingStatus']).catch(() => {});
          }
          setIsLoading(false);
        }
      } catch {
        if (!mounted) return;
        setIsLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = async (newToken: string, newUserId: string, role: string) => {
    if (role !== requiredRole) {
      throw new Error(`This app requires a ${requiredRole} account.`);
    }
    await SecureStore.setItemAsync('authToken', newToken);
    await AsyncStorage.multiSet([
      ['userId',   newUserId],
      ['userRole', role],
    ]);

    // Determine the correct onboarding status:
    // 1. If there is an in-progress onboarding status saved (user was mid-flow) → resume it.
    // 2. If the user already has a shop on the backend → APPROVED (skip onboarding).
    // 3. Otherwise → NEW (brand-new user, start onboarding from Step 1).
    const storedStatus = await AsyncStorage.getItem('shopOnboardingStatus') as OnboardingStatus | null;

    let resolvedStatus: OnboardingStatus;
    if (storedStatus && storedStatus !== 'APPROVED') {
      // User was mid-onboarding (e.g. AADHAAR_PENDING) — resume from where they left off.
      resolvedStatus = storedStatus;
    } else {
      // Check backend: does this user already own a shop?
      const hasShop = await checkHasShop(newUserId, newToken);
      resolvedStatus = hasShop ? 'APPROVED' : 'NEW';
      await AsyncStorage.setItem('shopOnboardingStatus', resolvedStatus);
    }

    setToken(newToken);
    setUserId(newUserId);
    setOnboardingStatusState(resolvedStatus);
    setIsAuthenticated(true);
    setIsLoading(false);
  };


  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await AsyncStorage.multiRemove(['userId', 'userRole', 'shopOnboardingStatus']);
    } catch { /* ignore */ } finally {
      setToken(null);
      setUserId(null);
      setUser(null);
      setOnboardingStatusState('NEW');
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isLoading, token, userId, user,
      requiredRole, onboardingStatus,
      login, logout, setOnboardingStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
