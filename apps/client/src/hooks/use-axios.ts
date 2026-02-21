import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient, clearSessionRefresh, registerSessionRefresh } from '@/services/api-client';

// ---------------------------------------------------------------------------
// useAxiosSetup
// ---------------------------------------------------------------------------

/**
 * Bridges the AuthContext `refreshSession` callback into the global `apiClient`
 * so that any 401 response automatically triggers a silent session-refresh and
 * request replay, with concurrent 401s properly queued.
 *
 * **Mount this hook exactly once** in the component tree (inside or just below
 * `<AuthProvider>`).  All code using `apiClient` or any service class that
 * depends on it will benefit automatically – no per-component wiring needed.
 *
 * @example
 * ```tsx
 * // In your root layout / app shell component:
 * function AppShell() {
 *   useAxiosSetup();
 *   return <Outlet />;
 * }
 * ```
 */
export function useAxiosSetup(): void {
  const { refreshSession } = useAuth();

  // Stable ref so that if `refreshSession` identity changes (e.g. after login)
  // we don't need to re-register the interceptor callback.
  const refreshRef = useRef(refreshSession);
  useEffect(() => {
    refreshRef.current = refreshSession;
  }, [refreshSession]);

  useEffect(() => {
    // Register a stable callback that delegates to the latest refreshSession.
    registerSessionRefresh(() => refreshRef.current());

    // Listen for session-expired events dispatched by the 401 interceptor
    // when a refresh attempt also fails (i.e. user is truly logged out).
    const handleSessionExpired = () => {
      // Navigate to sign-in; use replaceState so the user can't go back to a
      // protected page without logging in.
      window.location.replace('/sign-in');
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      clearSessionRefresh();
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []); // intentionally empty – register once on mount, clear on unmount
}

// ---------------------------------------------------------------------------
// useAxios – per-component hook for typed, auth-aware requests
// ---------------------------------------------------------------------------

/**
 * Returns the shared `apiClient` together with the current auth state.
 * Use this when a component needs direct access to the axios instance.
 *
 * The interceptors (cookie forwarding, 401 retry) are already wired globally
 * by `useAxiosSetup` – you do **not** need to call that here.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { client, isAuthenticated } = useAxios();
 *
 *   const fetchData = async () => {
 *     const { data } = await client.get('/some/endpoint');
 *     ...
 *   };
 * }
 * ```
 */
export function useAxios() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return {
    /** Pre-configured axios instance with withCredentials + 401-retry. */
    client: apiClient,
    isAuthenticated,
    isLoading,
    user,
  } as const;
}
