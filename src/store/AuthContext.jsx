import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAdminProfile, saveAdminProfile, updateAdminPin } from '@/lib/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    async function loadAuthState() {
      try {
        const { name, pin } = await getAdminProfile();
        if (name && pin) {
          setIsSetupComplete(true);
          setAdminName(name);
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuthState();
  }, []);

  const setupAccount = async (name, pin) => {
    await saveAdminProfile(name, pin);
    setAdminName(name);
    setIsSetupComplete(true);
    setIsAuthenticated(true); // Auto login after setup
  };

  const login = async () => {
    setIsAuthenticated(true);
  };

  const resetPin = async (newPin) => {
    await updateAdminPin(newPin);
    // After reset, we keep them logged out so they have to login with the new pin
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isSetupComplete,
        isAuthenticated,
        isLoading,
        adminName,
        setupAccount,
        login,
        resetPin,
        logout,
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
