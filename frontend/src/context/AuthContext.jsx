import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(authService.getToken());
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session on page load
  useEffect(() => {
    async function initAuth() {
      const savedToken = authService.getToken();
      if (savedToken) {
        try {
          const profile = await authService.getCurrentUser();
          setUser(profile);
          setToken(savedToken);
        } catch (err) {
          console.warn('Failed to restore auth session:', err.message);
          authService.logout();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        role: user?.role
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
