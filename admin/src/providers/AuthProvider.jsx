import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('cityfix_admin_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('cityfix_admin_token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sign in administrator or authority
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: userToken } = response.data.data;

      // Restrict access strictly to admin & authority roles
      if (userData.role !== 'admin' && userData.role !== 'authority') {
        throw new Error('Access denied: You do not possess administrative permissions.');
      }

      setUser(userData);
      setToken(userToken);
      localStorage.setItem('cityfix_admin_user', JSON.stringify(userData));
      localStorage.setItem('cityfix_admin_token', userToken);
      return userData;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed. Please verify credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Sign out user and purge storage keys
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cityfix_admin_user');
    localStorage.removeItem('cityfix_admin_token');
  };

  // Listen for background session timeouts or forced logs
  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    error,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isAuthority: user?.role === 'authority',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be executed within an AuthProvider.');
  }
  return context;
};
