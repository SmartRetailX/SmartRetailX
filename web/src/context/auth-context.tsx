import React, { createContext, useContext, useEffect } from 'react';

import { DefaultLoader } from '@/components/loaders';
import { useGetSession } from '@/queries';
import { Session, User } from '@/types';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isError: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, error } = useGetSession();

  // Check if there's an error (non-200 status code or other session errors)
  const hasSessionError = !!error && !isPending;

  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(
    () => ({
      session: session ? session.session : null,
      user: session ? session.user : null,
      isLoading: isPending,
      isAuthenticated: !!session,
      isError: hasSessionError,
    }),
    [session, isPending, hasSessionError],
  ) as AuthContextType;

  if (error) {
    console.error('Auth session error:', error);
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Auth wrapper component to protect authenticated routes
 * Redirects to signin if user is not authenticated
 */
export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to signin page
      window.location.href = '/signin';
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <DefaultLoader className='h-screen' />;
  }

  return isAuthenticated ? { children } : null;
}
