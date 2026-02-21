/**
 * auth.service.ts
 *
 * Low-level Better-Auth session helper functions.
 *
 * In most cases you should prefer:
 *   - useAuth()            – for components that need auth state / actions
 *   - useLoginMutation()   – for React-Query-integrated login
 *   - useLogoutMutation()  – for React-Query-integrated logout
 *
 * This module is intentionally thin; Better Auth's own authClient handles
 * all token/cookie management.  There are no JWT tokens in localStorage.
 */

import { auth } from '@/lib/auth-client';

import { apiClient } from './api-client';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Auth service
// ---------------------------------------------------------------------------

export const authService = {
  /**
   * Sign in with email + password.
   * Better Auth sets an HttpOnly session cookie on success.
   */
  login: async (data: LoginRequest) => {
    const result = await auth.signIn(data);
    if (result.error) throw new Error(result.error.message ?? 'Login failed');
    return result.data;
  },

  /**
   * Register a new user.
   * Better Auth sets an HttpOnly session cookie on success.
   */
  signup: async (data: SignupRequest) => {
    const result = await auth.signUp(data);
    if (result.error) throw new Error(result.error.message ?? 'Sign up failed');
    return result.data;
  },

  /**
   * Sign out – invalidates the session cookie on the server.
   */
  logout: async () => {
    const result = await auth.signOut();
    if (result.error) throw new Error(result.error.message ?? 'Logout failed');
  },

  /**
   * Fetch the current user's profile from the API gateway.
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },
};
