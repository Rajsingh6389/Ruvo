import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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
  login: (token: string, userId: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async (authToken: string) => {
    try {
      const profile = await getUserProfile(authToken);
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUserId = await AsyncStorage.getItem('userId');

        if (storedToken) {
          setToken(storedToken);
          setUserId(storedUserId);
          setIsAuthenticated(true);
          await fetchUser(storedToken);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (newToken: string, newUserId: string, role: string) => {
    await AsyncStorage.multiSet([
      ['authToken', newToken],
      ['userId', newUserId],
      ['userRole', role],
    ]);
    setToken(newToken);
    setUserId(newUserId);
    setIsAuthenticated(true);
    await fetchUser(newToken);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['authToken', 'userId', 'userRole']);
    setToken(null);
    setUserId(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, token, userId, user, login, logout }}>
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
