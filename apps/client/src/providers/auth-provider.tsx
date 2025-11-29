import React, { useEffect, useRef, useState } from 'react';
import { AuthContext, AuthContextType } from '@/contexts/auth-context';

import type { User } from '@/lib/auth-client';
import { auth } from '@/lib/auth-client';

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication Provider Component
 * Manages global authentication state and provides auth methods
 *
 * Performance optimizations:
 * - Uses refs to prevent duplicate session checks on mount/refresh
 * - Marks session as checked after login/signup to avoid redundant fetches
 * - Implements request deduplication with isCheckingSession flag
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingSession = useRef(false);
  const hasCheckedSession = useRef(false);

  /**
   * Check for existing session on mount
   */
  useEffect(() => {
    // Only check session once on initial mount
    if (!hasCheckedSession.current) {
      checkSession();
    }
  }, []);

  /**
   * Check current session
   */
  const checkSession = async () => {
    // Prevent duplicate session checks
    if (isCheckingSession.current) {
      return;
    }

    try {
      isCheckingSession.current = true;
      setIsLoading(true);
      const session = await auth.getSession();

      if (session.data?.user) {
        setUser(session.data.user);
      } else {
        setUser(null);
      }

      hasCheckedSession.current = true;
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      isCheckingSession.current = false;
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
        hasCheckedSession.current = true; // Mark as checked to avoid duplicate session fetch
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
        hasCheckedSession.current = true; // Mark as checked to avoid duplicate session fetch
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
