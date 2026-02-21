import { createAuthClient } from 'better-auth/client';

/**
 * Server origin – the scheme+host where the API gateway runs.
 * PUBLIC_API_BASE_URL is expected to be just the origin, e.g. "http://localhost:3000".
 * Better Auth is mounted at /api/auth, so we append that path ourselves.
 */
const SERVER_ORIGIN = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3000';

/**
 * Better Auth client configuration
 * - baseURL must point to the full auth basePath on the server
 *   so the client constructs endpoints like: <baseURL>/sign-in/email
 * - credentials: 'include' sends the HttpOnly session cookie on every request
 */
export const authClient = createAuthClient({
  baseURL: `${SERVER_ORIGIN}/api/auth`,

  // Include credentials (cookies) in ALL requests (required for cookie-based auth)
  credentials: 'include',

  fetchOptions: {
    cache: 'no-cache',
  },
});

/**
 * Type-safe auth client methods
 */
export const auth = {
  /**
   * Sign up a new user
   */
  signUp: async (data: { email: string; password: string; name: string }) => {
    return authClient.signUp.email(data);
  },

  /**
   * Sign in with email and password
   */
  signIn: async (data: { email: string; password: string }) => {
    return authClient.signIn.email(data);
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    return authClient.signOut();
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    return authClient.getSession();
  },

  /**
   * Update user profile
   */
  updateUser: async (data: { name?: string; image?: string }) => {
    return authClient.updateUser(data);
  },

  /**
   * Request password reset
   */
  forgetPassword: async (email: string) => {
    // @ts-expect-error - better-auth types might not resolve this depending on plugins
    return authClient.forgetPassword({ email });
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: { token: string; newPassword: string }) => {
    return authClient.resetPassword(data);
  },
};

/**
 * Export types from Better Auth client
 */
export type Session = Awaited<ReturnType<typeof authClient.getSession>>['data'];
export type User = NonNullable<Session>['user'];
