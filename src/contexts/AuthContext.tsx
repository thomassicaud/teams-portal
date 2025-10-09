'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { getMsalInstance } from '@/lib/auth-config';

interface AuthContextType {
  account: AccountInfo | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        // Additional checks for browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined' || !window.crypto) {
          console.log('Not in browser environment, skipping MSAL initialization');
          setLoading(false);
          return;
        }
        
        const msalInstance = getMsalInstance();
        await msalInstance.initialize();
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (error) {
        console.error('Failed to initialize MSAL:', error);
      } finally {
        setLoading(false);
      }
    };

    // Delay initialization to ensure we're fully hydrated
    const timer = setTimeout(initializeMsal, 100);
    return () => clearTimeout(timer);
  }, []);

  const login = async () => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined' || !window.crypto) {
        throw new Error('Login can only be performed in browser environment with crypto support');
      }

      const msalInstance = getMsalInstance();
      // Login with all required permissions since admin consent has been granted
      const response: AuthenticationResult = await msalInstance.loginPopup({
        scopes: [
          'User.Read',
          'User.ReadBasic.All',
          'Group.ReadWrite.All',
          'Group.Read.All',
          'Team.Create',
          'Team.ReadBasic.All',
          'Channel.Create',
          'TeamMember.ReadWrite.All',
          'Files.ReadWrite.All',
          'Sites.ReadWrite.All',
        ],
        prompt: 'select_account', // Let users select their account without forcing consent
      });
      setAccount(response.account);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined' || !window.crypto) {
        return;
      }
      
      const msalInstance = getMsalInstance();
      await msalInstance.logoutPopup();
      setAccount(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value = {
    account,
    isAuthenticated: !!account,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}