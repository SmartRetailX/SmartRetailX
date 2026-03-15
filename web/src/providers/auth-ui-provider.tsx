import React from 'react';

interface AuthUIProviderProps {
  children: React.ReactNode;
}

/**
 * Auth UI Provider
 */
export function AuthUIProvider({ children }: AuthUIProviderProps) {
  return <>{children}</>;
}
