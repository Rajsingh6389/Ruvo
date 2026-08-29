import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('ruvo_admin_token') || '');

  const login = (newToken) => {
    localStorage.setItem('ruvo_admin_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('ruvo_admin_token');
    setToken('');
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
