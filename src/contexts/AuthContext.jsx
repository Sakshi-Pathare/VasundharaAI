import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService, DEMO_PROFILES } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Hydrate user on mount with real backend token validation
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const activeUser = await authService.getCurrentUser();
        if (!mounted) return;

        if (activeUser) {
          setUser(activeUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        if (mounted) setLoadError(err.message || 'Unable to verify session.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Listen for global 401 session expiration event dispatched by apiClient
    const handleUnauthorized = () => {
      if (mounted) {
        setUser(null);
        authService.logout();
      }
    };
    window.addEventListener('vasundhara:unauthorized', handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener('vasundhara:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email, password, remember = true) => {
    setLoadError('');
    const authenticated = await authService.login(email, password, remember);
    setUser(authenticated);
    return authenticated;
  }, []);

  const register = useCallback(async (data, remember = true) => {
    setLoadError('');
    const newUser = await authService.register(data, remember);
    setUser(newUser);
    return newUser;
  }, []);

  const quickDemoLogin = useCallback(async (roleKey) => {
    setLoadError('');
    const demo = await authService.loginDemo(roleKey);
    setUser(demo);
    return demo;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    return authService.requestPasswordReset(email);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      loadError,
      login,
      register,
      quickDemoLogin,
      logout,
      requestPasswordReset,
      demoProfiles: DEMO_PROFILES,
    }),
    [user, loading, loadError, login, register, quickDemoLogin, logout, requestPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed within an <AuthProvider>');
  }
  return context;
}
