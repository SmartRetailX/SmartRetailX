import React, { createContext, useContext, useEffect, useState } from 'react';

import type { User } from '@/lib/auth-client';
import { auth } from '@/lib/auth-client';

/**
 * Authentication context type
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Auth Context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication Provider Component
 * Manages global authentication state and provides auth methods
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check for existing session on mount
   */
  useEffect(() => {
    checkSession();
  }, []);

  /**
   * Check current session
   */
  const checkSession = async () => {
    try {
      setIsLoading(true);
      const session = await auth.getSession();

      console.log('Session Check Result:', session);

      if (session.data?.user) {
        console.log('User authenticated:', session.data.user.email);
        setUser(session.data.user);
      } else {
        console.log('No active session found');
        setUser(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign up a new user
   */
  const signup = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      const result = await auth.signUp({ email, password, name });

      if (result.data?.user) {
        setUser(result.data.user);
      } else if (result.error) {
        throw new Error(result.error.message || 'Sign up failed');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log in an existing user
   */
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const result = await auth.signIn({ email, password });

      if (result.data?.user) {
        setUser(result.data.user);
      } else if (result.error) {
        throw new Error(result.error.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log out the current user
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh session
   */
  const refreshSession = async () => {
    await checkSession();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
